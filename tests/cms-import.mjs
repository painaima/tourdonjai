import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const compile = path => ts.transpileModule(fs.readFileSync(path,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
}).outputText;
const moduleUrl = source => 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const tourUrl = moduleUrl(compile('lib/tour.ts'));
const tour = await import(tourUrl);
const catalogUrl = moduleUrl(compile('lib/catalog.ts').replace("'./tour'",JSON.stringify(tourUrl)));
const validationUrl = moduleUrl(compile('lib/catalog-validation.ts').replace("'./tour'",JSON.stringify(tourUrl)).replace("'./catalog'",JSON.stringify(catalogUrl)));
const {validateCatalogInput} = await import(validationUrl);
const {readUploadResponse,uploadPdf,compactImage} = await import(moduleUrl(compile('lib/image-upload.ts')));
const image = '/api/media/1234.jpg';
const realCreateImageBitmap = globalThis.createImageBitmap;
let closed = false;
globalThis.createImageBitmap = async () => ({width:1200,height:800,close(){closed=true}});
const preparedBytes = new Uint8Array(145000);
preparedBytes.set([255,216,255]);
const preparedImage = await compactImage(new File([preparedBytes],'prepared.jpg'),'prepared.jpg');
assert.deepEqual(new Uint8Array(await preparedImage.arrayBuffer()),preparedBytes,'preserve prepared JPEG bytes and exact dimensions');
assert.equal(closed,true);
globalThis.createImageBitmap = realCreateImageBitmap;
const draft = {id:'',title:'USA Tour',category:'ทัวร์',country:'สหรัฐอเมริกา',price:129888,duration:'9 วัน 7 คืน',tag:'ทริปแนะนำ',description:'ตาม PDF',image,gallery:[image],serviceCode:'UJX14',published:false,departures:[{start:'2026-10-23',end:'2026-10-31',price:129888}]};

assert.equal((await readUploadResponse(Response.json({url:image},{status:201}),'image')).url,image);
for (const value of [{},null,{url:''},{url:'/api/media/1234.pdf'},{url:'https://example.com/a.jpg'}]) {
  await assert.rejects(readUploadResponse(Response.json(value),'image'),/ลิงก์ไฟล์/);
}
await assert.rejects(readUploadResponse(new Response('<html>login</html>',{status:403}),'image'),/เข้าสู่ระบบ/);
await assert.rejects(readUploadResponse(new Response('not json'),'image'),/ตอบกลับไม่ถูกต้อง/);
await assert.rejects(readUploadResponse(Response.json({error:'ไฟล์ใหญ่เกินไป'},{status:413}),'pdf'),/ไฟล์ใหญ่เกินไป/);

const realFetch = globalThis.fetch;
globalThis.fetch = async (_url,options) => {
  assert.ok(options.signal instanceof AbortSignal);
  assert.equal(options.body.get('file').name,'source.pdf');
  return Response.json({url:'/api/media/1234.pdf',name:'source.pdf'},{status:201});
};
assert.deepEqual(await uploadPdf(new File(['%PDF-'],'source.pdf')),{url:'/api/media/1234.pdf',name:'source.pdf'});
globalThis.fetch = realFetch;

const normalized = validateCatalogInput({...draft,image:'',gallery:[null,image]});
assert.equal(normalized.item.image,image,'recover cover from the uploaded gallery');
assert.equal(normalized.item.departures[0].seats,null);
assert.equal(normalized.item.departures[0].commission,null,'unknown commission stays unknown');
assert.equal(normalized.item.published,false,'imports remain drafts');
assert.match(validateCatalogInput({...draft,image:'',gallery:[]}).error,/ภาพปก/);
assert.match(validateCatalogInput({...draft,departures:[{...draft.departures[0],end:'2026-02-30'}]}).error,/รอบเดินทาง 1/);
assert.match(validateCatalogInput({...draft,departures:[{...draft.departures[0],seats:20,capacity:15}]}).error,/จำนวนรับได้/);
assert.match(validateCatalogInput({...draft,activityTags:['ช้อปปิ้ง','ธรรมชาติ','เมืองเก่า','ล่องเรือ']}).error,/ไม่เกิน 3/);
assert.match(validateCatalogInput({...draft,published:'false'}).error,/สถานะเผยแพร่/);
assert.ok(validateCatalogInput(null).error);
assert.equal(validateCatalogInput({...draft,wholesale:{deposit:null}}).item.wholesale.deposit,null);
assert.ok(validateCatalogInput({...draft,wholesale:{deposit:-1}}).error);
const incomplete = tour.tourDefaults({...draft,departures:undefined,itinerary:undefined,highlights:undefined});
assert.deepEqual(incomplete.departures,[],'do not invent departure prices for imported tours');
assert.deepEqual(incomplete.itinerary,[],'do not inject a European sample itinerary');
assert.equal(incomplete.hotel,'รอยืนยัน');

const untouched = {...draft,id:'other',serviceCode:'OTHER',title:'Existing manual edits',description:'Keep this'};
const records = new Map([[untouched.id,untouched]]);
const files = [];
globalThis.cmsHarness = {records,files};
const storageUrl = moduleUrl(`
  export async function adminAllowed(request){return request.headers.get('x-test-admin')==='1'}
  export function safeWrite(request){return !request.headers.get('origin')||request.headers.get('origin')===new URL(request.url).origin}
  export function database(){return {prepare(sql){let args;return {
    bind(...values){args=values;return this},
    async all(){return {results:[...globalThis.cmsHarness.records.values()].map(item=>({data:JSON.stringify(item)}))}},
    async run(){if(sql.startsWith('INSERT INTO catalog'))globalThis.cmsHarness.records.set(args[0],JSON.parse(args[1]));return {success:true}}
  }}}}
`);
const mediaUrl = moduleUrl(`
  export async function storedPdfValid(url){return !url||url!=='/api/media/dead.pdf'}
  export async function storedImagesValid(urls){return !urls.includes('/api/media/dead.jpg')}
  export async function deleteUnusedMedia(){}
`);
const route = await import(moduleUrl(compile('app/api/catalog/route.ts')
  .replace("'@/lib/storage'",JSON.stringify(storageUrl))
  .replace("'@/lib/media'",JSON.stringify(mediaUrl))
  .replace("'@/lib/tour'",JSON.stringify(tourUrl))
  .replace("'@/lib/catalog'",JSON.stringify(catalogUrl))
  .replace("'@/lib/catalog-validation'",JSON.stringify(validationUrl))));
const request = (body,headers={}) => new Request('https://cms.example/api/catalog',{method:'POST',headers:{'content-type':'application/json','x-test-admin':'1',...headers},body:JSON.stringify(body)});
let response = await route.POST(request(draft));
assert.equal(response.status,200);
const saved = (await response.json()).item;
assert.equal(saved.published,false);
assert.equal(saved.departures[0].commission,null);
assert.deepEqual(records.get('other'),untouched,'save preserves unrelated manual edits');
response = await route.POST(request({...draft,serviceCode:' ujx14 '}));
assert.equal(response.status,409,'block duplicates irrespective of whitespace and letter case');
assert.equal(records.size,2);
assert.equal((await route.POST(request({...saved,title:'Updated existing draft'}))).status,200,'allow editing the same record');
assert.equal((await route.POST(request({...draft,serviceCode:'NEW',pdfUrl:'/api/media/dead.pdf'}))).status,400);
assert.equal((await route.POST(request({...draft,serviceCode:'NEW',image:'/api/media/dead.jpg',gallery:[]}))).status,400);
assert.equal((await route.POST(request(draft,{'x-test-admin':'0'}))).status,403);
assert.equal((await route.POST(request(draft,{origin:'https://other.example'}))).status,403);

const envUrl = moduleUrl(`export const env={BUCKET:{async put(key,bytes,metadata){globalThis.cmsHarness.files.push({key,bytes,metadata})}}}`);
const uploadRoute = await import(moduleUrl(compile('app/api/media/route.ts')
  .replace("'cloudflare:workers'",JSON.stringify(envUrl))
  .replace("'@/lib/storage'",JSON.stringify(storageUrl))));
const uploadRequest = file => {const body=new FormData();body.append('file',file);return new Request('https://cms.example/api/media',{method:'POST',headers:{'x-test-admin':'1'},body})};
response = await uploadRoute.POST(uploadRequest(new File(['%PDF-test'],'source.pdf',{type:'application/pdf'})));
assert.equal(response.status,201);
assert.match((await response.json()).url,/\.pdf$/);
assert.equal(files.at(-1).metadata.httpMetadata.contentType,'application/pdf');
assert.equal((await uploadRoute.POST(uploadRequest(new File(['%PDF-test'],'bad.odf')))).status,400,'PDF cannot be mislabeled as ODF');
response = await uploadRoute.POST(uploadRequest(new File([new Uint8Array([255,216,255,0])],'cover.jpg')));
assert.equal(response.status,201);
assert.match((await response.json()).url,/\.jpg$/);
const oversize=new Uint8Array(150001);oversize.set([255,216,255]);
assert.equal((await uploadRoute.POST(uploadRequest(new File([oversize],'large.jpg')))).status,400);
console.log('CMS import: uploads, invalid responses, draft preservation, unknown values, duplicates, permissions and missing media passed');
