import {deleteUnusedMedia,storedImagesValid,storedPdfValid} from '@/lib/media';
import {tourDefaults,tourClosed,serviceCode} from '@/lib/tour';
import {validateCatalogInput} from '@/lib/catalog-validation';
import {database,adminAllowed,safeWrite} from '@/lib/storage';
import {seeds} from '@/lib/catalog';
import type {Service} from '@/lib/catalog';
export async function GET(r:Request){try{const {results}=await database().prepare('SELECT data FROM catalog').all<{data:string}>();const map=new Map(seeds.map(s=>[s.id,s]));results.forEach(r=>{const s=JSON.parse(r.data);map.set(s.id,tourDefaults(s))});const url=new URL(r.url);const admin=(await adminAllowed(r))&&url.searchParams.get('scope')!=='public';return Response.json({items:[...map.values()].map(s=>({...s,closed:tourClosed(s)})).filter(s=>!(s as Service & {deleted?:boolean}).deleted&&(admin||(s.published&&(url.searchParams.get('closed')==='all'||!s.closed))))},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error(e);return Response.json({error:'โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง'},{status:503});}}
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

