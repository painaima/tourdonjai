import type {Service} from './catalog';
import {categories,activityChoices} from './catalog';
import {coverGallery,validDate,validImage} from './tour';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function validateCatalogInput(input: unknown): {item: Service} | {error: string} {
  if (!isRecord(input)) return {error: 'ข้อมูลบริการต้องเป็นรายการทัวร์ที่ถูกต้อง'};
  const item = {...input};
  const fail = (error: string) => ({error});
  if (typeof item.title !== 'string' || !item.title.trim() || item.title.length > 200) return fail('กรุณากรอกชื่อบริการไม่เกิน 200 ตัวอักษร');
  if (typeof item.category !== 'string' || !categories.includes(item.category)) return fail('กรุณาเลือกหมวดบริการ');
  if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0) return fail('ราคาเริ่มต้นต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
  if (typeof item.description !== 'string' || item.description.length > 5000) return fail('รายละเอียดบริการต้องไม่เกิน 5,000 ตัวอักษร');
  for (const [field,label,max] of [['country','ประเทศ',100],['duration','ระยะเวลา',100],['tag','ป้ายแนะนำ',50]] as const) {
    if (typeof item[field] !== 'string' || item[field].length > max) return fail(`กรุณาตรวจสอบ${label} ไม่เกิน ${max} ตัวอักษร`);
  }
  if (item.id !== undefined && (typeof item.id !== 'string' || item.id.length >= 100)) return fail('รหัสรายการบริการไม่ถูกต้อง');
  if (item.serviceCode !== undefined) {
    if (typeof item.serviceCode !== 'string' || item.serviceCode.length > 60) return fail('รหัสทัวร์ต้องไม่เกิน 60 ตัวอักษร');
    item.serviceCode = item.serviceCode.trim();
  }
  if (item.urlCountry !== undefined && (typeof item.urlCountry !== 'string' || item.urlCountry.length > 60 || item.urlCountry !== '' && !/^[a-z]+(?:-[a-z]+)*$/.test(item.urlCountry))) return fail('ประเทศใน URL ต้องเป็นภาษาอังกฤษตัวเล็ก เช่น italy');
  if (item.published !== undefined && typeof item.published !== 'boolean') return fail('สถานะเผยแพร่ต้องเป็นค่าจริงหรือเท็จ');
  if (item.gallery !== undefined) {
    if (!Array.isArray(item.gallery)) return fail('แกลเลอรีรูปภาพไม่ถูกต้อง');
    const gallery = item.gallery.filter(value => value !== null && value !== undefined && value !== '');
    if (gallery.length > 30 || !gallery.every(validImage)) return fail('รูปภาพต้องเป็นลิงก์ที่ถูกต้องและไม่เกิน 30 รูป');
    item.gallery = gallery;
  }
  if (!validImage(item.image) && Array.isArray(item.gallery)) item.image = item.gallery.find(validImage);
  if (!validImage(item.image)) return fail('กรุณาอัปโหลดภาพปกหรือเลือกภาพแรกในแกลเลอรีก่อนบันทึก');
  if (item.pdfUrl !== undefined && item.pdfUrl !== '' && (typeof item.pdfUrl !== 'string' || !/^\/api\/media\/[a-f0-9-]+\.pdf$/.test(item.pdfUrl))) return fail('ลิงก์ไฟล์ PDF ไม่ถูกต้อง กรุณาอัปโหลดใหม่');
  if (item.pdfName !== undefined && (typeof item.pdfName !== 'string' || item.pdfName.length > 180 || /[\r\n\0]/.test(item.pdfName))) return fail('ชื่อไฟล์ PDF ไม่ถูกต้อง');
  if (item.itinerary !== undefined) {
    if (!Array.isArray(item.itinerary) || item.itinerary.length > 60) return fail('โปรแกรมรายวันต้องไม่เกิน 60 วัน');
    for (const [index,day] of item.itinerary.entries()) {
      if (!isRecord(day) || ['title','description','meals','hotel'].some(field => typeof day[field] !== 'string' || (day[field] as string).length > 5000)) return fail(`กรุณาตรวจสอบโปรแกรมวันที่ ${index+1}`);
    }
  }
  if (item.departures !== undefined) {
    if (!Array.isArray(item.departures) || item.departures.length > 100) return fail('รอบเดินทางต้องไม่เกิน 100 รอบ');
    const rounds = [];
    for (const [index,round] of item.departures.entries()) {
      const prefix = `รอบเดินทาง ${index+1}: `;
      if (!isRecord(round) || !validDate(round.start) || !validDate(round.end) || round.end < round.start) return fail(prefix+'กรุณาตรวจสอบวันไปและวันกลับ');
      if (typeof round.price !== 'number' || !Number.isFinite(round.price) || round.price < 0) return fail(prefix+'ราคาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
      if (round.seats !== undefined && round.seats !== null && (typeof round.seats !== 'number' || !Number.isInteger(round.seats) || round.seats < 0)) return fail(prefix+'จำนวนที่นั่งคงเหลือต้องเป็นจำนวนเต็มหรือเว้นว่างเพื่อรอยืนยัน');
      if (round.capacity !== undefined && (typeof round.capacity !== 'number' || !Number.isInteger(round.capacity) || round.capacity < 0 || typeof round.seats === 'number' && round.capacity < round.seats)) return fail(prefix+'จำนวนรับได้ต้องไม่น้อยกว่าที่นั่งคงเหลือ');
      if (round.commission !== undefined && round.commission !== null && (typeof round.commission !== 'number' || !Number.isFinite(round.commission) || round.commission < 0)) return fail(prefix+'ค่าคอมมิชชันต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไปหรือเว้นว่างเพื่อรอยืนยัน');
      rounds.push({...round,seats: round.seats ?? null,commission: round.commission ?? null});
    }
    item.departures = rounds;
  }
  for (const field of ['highlights','included','excluded'] as const) {
    const values = item[field];
    if (values !== undefined && (!Array.isArray(values) || values.length > 50 || values.some(value => typeof value !== 'string' || value.length > 1000))) return fail('ไฮไลต์หรือรายการรวม/ไม่รวมต้องไม่เกิน 50 รายการ และ 1,000 ตัวอักษรต่อรายการ');
  }
  for (const field of ['terms','airline','hotel'] as const) {
    if (item[field] !== undefined && (typeof item[field] !== 'string' || item[field].length > 5000)) return fail('เงื่อนไข สายการบิน หรือที่พักต้องไม่เกิน 5,000 ตัวอักษร');
  }
  if (item.activityTags !== undefined && (!Array.isArray(item.activityTags) || item.activityTags.length > 3 || item.activityTags.some(value => typeof value !== 'string' || !activityChoices.includes(value)))) return fail('กรุณาเลือกแท็กกิจกรรมจากตัวเลือกไม่เกิน 3 รายการ');
  if (item.wholesale !== undefined) {
    const info = item.wholesale;
    if (!isRecord(info) || JSON.stringify(info).length > 16000) return fail('ข้อมูล Wholesale ไม่ถูกต้องหรือยาวเกินกำหนด');
    for (const field of ['checkedBaggageKg','carryOnKg','singleSupplement','infantPrice','deposit','minimumGroup','insuranceCoverage','tip']) {
      const amount=info[field];
      if (amount !== undefined && amount !== null && (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0)) return fail('ตัวเลขในข้อมูล Wholesale ต้องไม่ติดลบ หรือเว้นว่างเพื่อรอยืนยัน');
    }
    if (info.notes !== undefined && (!Array.isArray(info.notes) || info.notes.some(note => typeof note !== 'string'))) return fail('หมายเหตุ Wholesale ต้องเป็นรายการข้อความ');
    if (info.imageSources !== undefined && (!Array.isArray(info.imageSources) || info.imageSources.some(image => !isRecord(image) || typeof image.caption !== 'string' || !validImage(image.url)))) return fail('ที่มาของภาพ Wholesale ไม่ถูกต้อง');
  }
  const service = item as unknown as Service;
  service.gallery = coverGallery(service);
  service.image = service.gallery[0];
  service.published = item.published === true;
  delete item.closed;
  delete item.deleted;
  return {item: service};
}
