import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const tour=await import(url(compile('lib/tour.ts')));
const picture='/api/media/1234.jpg',shared='/api/media/5678.jpg',source='/api/media/abcd.jpg';
assert.deepEqual(tour.coverGallery({image:picture,gallery:[shared,picture]}),[picture,shared]);
assert.equal(tour.tourDefaults({id:'sample',category:'ทัวร์',country:'ญี่ปุ่น',image:picture,gallery:[shared]}).gallery[0],picture);
assert.equal(tour.tourDefaults({id:'japan',category:'ทัวร์',country:'ญี่ปุ่น',image:'/images/japan.jpg'},true).gallery.length,8,'retain built-in gallery defaults');
const records=[{id:'removed',deleted:true,image:picture,gallery:[shared],wholesale:{imageSources:[{url:source}]}},{id:'remaining',image:shared}];
const removed=[];
globalThis.mediaTest={records,removed,env:{BUCKET:{delete:async keys=>removed.push(...keys),head:async key=>key==='abcd.jpg'?{size:150001}:key==='1234.jpg'?{size:150000}:null}}};
const envUrl=url('export const env=globalThis.mediaTest.env;');
const storageUrl=url('export function database(){return {prepare:()=>({all:async()=>({results:globalThis.mediaTest.records.map(item=>({data:JSON.stringify(item)}))})})}}');
const catalogUrl=url('export const seeds=[];');
const media=await import(url(compile('lib/media.ts').replace("'cloudflare:workers'",JSON.stringify(envUrl)).replace("'./catalog'",JSON.stringify(catalogUrl)).replace("'./storage'",JSON.stringify(storageUrl))));
assert.deepEqual(media.mediaKeys(records[0]),['1234.jpg','5678.jpg','abcd.jpg']);
await media.deleteUnusedMedia(records[0]);
assert.deepEqual(removed,['1234.jpg','abcd.jpg'],'retain a photo still used by another tour; delete gallery and source-only media');
assert.equal(await media.storedImagesValid([picture]),true);
assert.equal(await media.storedImagesValid([source]),false);
assert.equal(await media.storedImagesValid([shared]),false);
assert.equal(await media.storedImagesValid(['https://example.com/photo.jpg']),false);
console.log('Cover ordering, shared-photo cleanup and 150 KB storage checks passed');

// R2's live stream may end when the framework releases the route context.
// A multi-megabyte PDF must still arrive intact, with download metadata.
const pdfBytes = Buffer.alloc(3_230_065, 65);
pdfBytes.set(Buffer.from('%PDF-1.7\n'));
pdfBytes.set(Buffer.from('\n%%EOF'), pdfBytes.length - 6);
let mediaReads = 0;
globalThis.mediaTest.env.BUCKET.get = async key => {
  mediaReads++;
  if (key === '0000.pdf') return null;
  if (key === 'ffff.pdf') throw new Error('R2 unavailable');
  return {
    body: new ReadableStream({start(controller) {controller.enqueue(pdfBytes.subarray(0, 602_112)); controller.close();}}),
    arrayBuffer: async () => pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength),
    writeHttpMetadata(headers) {headers.set('Content-Disposition', 'attachment; filename="IEK177.pdf"');},
  };
};
const downloadRoute = await import(url(compile('app/api/media/[key]/route.ts').replace("'cloudflare:workers'", JSON.stringify(envUrl))));
const request = new Request('https://example.com/api/media/1234.pdf');
const response = await downloadRoute.GET(request, {params: Promise.resolve({key: '1234.pdf'})});
assert.equal(response.status, 200);
assert.equal(response.headers.get('Content-Type'), 'application/pdf');
assert.equal(response.headers.get('Content-Length'), String(pdfBytes.length));
assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="IEK177.pdf"');
assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdfBytes, 'download the entire PDF, not a prematurely closed R2 stream');
assert.equal((await downloadRoute.GET(request, {params: Promise.resolve({key: '../private.pdf'})})).status, 404);
assert.equal(mediaReads, 1, 'invalid keys do not access storage');
assert.equal((await downloadRoute.GET(request, {params: Promise.resolve({key: '0000.pdf'})})).status, 404);
assert.equal((await downloadRoute.GET(request, {params: Promise.resolve({key: 'ffff.pdf'})})).status, 503);
console.log('Complete large PDF downloads, metadata and storage errors passed');
