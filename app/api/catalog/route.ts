import {deleteUnusedMedia,storedImagesValid,storedPdfValid} from '@/lib/media';
import {tourDefaults,tourClosed,serviceCode,businessDate} from '@/lib/tour';
import {validateCatalogInput} from '@/lib/catalog-validation';
import {database,adminAllowed,safeWrite} from '@/lib/storage';
import {seeds} from '@/lib/catalog';
import type {Service} from '@/lib/catalog';
export async function GET(request:Request) {
  try {
    const url = new URL(request.url);
    // Public reads never need to verify the visitor's CMS cookie.
    const admin = url.searchParams.get('scope') !== 'public' && await adminAllowed(request);
    const id = admin ? url.searchParams.get('id') : null;
    const code = admin ? url.searchParams.get('code')?.trim().toUpperCase() : null;
    const summary = admin && url.searchParams.get('summary') === '1';
    const projection = `json_object(
      'id',json_extract(data,'$.id'),'title',json_extract(data,'$.title'),
      'category',json_extract(data,'$.category'),'country',json_extract(data,'$.country'),
      'price',json_extract(data,'$.price'),'duration',json_extract(data,'$.duration'),
      'image',json_extract(data,'$.image'),'tag',json_extract(data,'$.tag'),
      'airline',json_extract(data,'$.airline'),
      'published',json_extract(data,'$.published'),'description',json_extract(data,'$.description'),
      'serviceCode',json_extract(data,'$.serviceCode'),'urlCountry',json_extract(data,'$.urlCountry'),
      'activityTags',json_extract(data,'$.activityTags'),'departures',json_extract(data,'$.departures'),
      'deleted',json_extract(data,'$.deleted'))`;
    const query = id
      ? database().prepare('SELECT data FROM catalog WHERE id=? LIMIT 1').bind(id)
      : code
        ? database().prepare("SELECT data FROM catalog WHERE UPPER(json_extract(data,'$.serviceCode'))=? LIMIT 1").bind(code)
        : summary
          ? database().prepare(`SELECT ${projection} AS data FROM catalog`)
          : admin
            ? database().prepare('SELECT data FROM catalog')
            : database().prepare("SELECT data FROM catalog WHERE json_extract(data,'$.published')=1 AND COALESCE(json_extract(data,'$.deleted'),0)=0");
    const {results} = await query.all<{data:string}>();
    const records = new Map<string,Service & {deleted?:boolean}>(seeds.map(item=>[item.id,item]));
    for (const row of results) {
      const item = JSON.parse(row.data) as Service & {deleted?:boolean};
      records.set(item.id,item);
    }
    const today = businessDate();
    const includeClosed = url.searchParams.get('closed') === 'all';
    const items:Service[] = [];
    for (const record of records.values()) {
      if ((id && record.id !== id) || (code && (record.serviceCode||record.id).trim().toUpperCase() !== code)) continue;
      if (record.deleted || (!admin && !record.published)) continue;
      const closed = tourClosed(record,today);
      if (!admin && !includeClosed && closed) continue;
      items.push({...tourDefaults(record),closed});
    }
    return Response.json({items},{headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    console.error(error);
    return Response.json({error:'โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง'},{status:503});
  }
}
export async function POST(request:Request) {
  if (!(await adminAllowed(request)) || !safeWrite(request)) return Response.json({error:'ไม่มีสิทธิ์จัดการ'},{status:403});
  try {
    const validated = validateCatalogInput(await request.json());
    if ('error' in validated) return Response.json({error:validated.error},{status:400});
    const item = validated.item;
    if (!(await storedPdfValid(item.pdfUrl))) return Response.json({error:'กรุณาอัปโหลดไฟล์ PDF ใหม่ก่อนบันทึก'},{status:400});
    if (!(await storedImagesValid(item.gallery || []))) return Response.json({error:'ไม่พบไฟล์รูป หรือรูปใหญ่เกิน 150 KB กรุณาอัปโหลดใหม่'},{status:400});
    if (item.serviceCode) {
      const {results} = await database().prepare('SELECT data FROM catalog').all<{data:string}>();
      const records = new Map<string,Service & {deleted?:boolean}>(seeds.map(seed=>[seed.id,seed]));
      results.forEach(row=>{const record:Service & {deleted?:boolean}=JSON.parse(row.data);records.set(record.id,record)});
      const duplicate = [...records.values()].find(record=>!record.deleted && record.id!==item.id && record.category===item.category && serviceCode(record).trim().toUpperCase()===item.serviceCode!.trim().toUpperCase());
      if (duplicate) return Response.json({error:`มีรหัสทัวร์ ${item.serviceCode} อยู่แล้ว กรุณาแก้ไขรายการเดิมเพื่อป้องกันข้อมูลซ้ำ`},{status:409});
    }
    item.id ||= crypto.randomUUID();
    await database().prepare('INSERT INTO catalog (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind(item.id,JSON.stringify(item)).run();
    return Response.json({item});
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({error:'ข้อมูลบริการไม่ใช่ JSON ที่ถูกต้อง'},{status:400});
    console.error(error);
    return Response.json({error:'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง'},{status:503});
  }
}

export async function DELETE(r:Request){
  if(!(await adminAllowed(r))||!safeWrite(r))return Response.json({error:'ไม่มีสิทธิ์จัดการ'},{status:403});
  try{
    const {id}=await r.json() as {id:unknown};
    if(typeof id!=='string'||!id||id.length>100)return Response.json({error:'รหัสทัวร์ไม่ถูกต้อง'},{status:400});
    const row=await database().prepare('SELECT data FROM catalog WHERE id=?').bind(id).first<{data:string}>();
    const item=row?JSON.parse(row.data):seeds.find(seed=>seed.id===id);
    if(!item)return Response.json({error:'ไม่พบรายการทัวร์'},{status:404});
    // Retain references until cleanup completes so a failed deletion can be retried.
    await database().prepare('INSERT INTO catalog (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind(id,JSON.stringify({...item,deleted:true,published:false})).run();
    await deleteUnusedMedia(item);
    // A tombstone prevents built-in programs reappearing on the next catalog read.
    await database().prepare('UPDATE catalog SET data=? WHERE id=?').bind(JSON.stringify({id,deleted:true,published:false}),id).run();
    return Response.json({deleted:id});
  }catch(e){console.error(e);return Response.json({error:'ลบทัวร์หรือรูปไม่สำเร็จ กรุณาลองอีกครั้ง'},{status:503});}
}

