import type {TourFields} from './tour';
import {tourDefaults} from './tour';
export type Service=TourFields & {id:string;title:string;category:string;country:string;price:number;duration:string;image:string;tag:string;published:boolean;description:string};
export const categories=['ทัวร์','วีซ่า','ตั๋วเครื่องบิน','ตั๋วกิจกรรม'];
export const activityChoices=['ชมฟูจิ','ช้อปปิ้ง','ธรรมชาติ','เมืองเก่า','หิมะ','ทะเล','สายมู','ไหว้พระ','วัฒนธรรม','สวนสนุก','ล่องเรือ'];
export const seeds:Service[]=[
{id:'japan',title:'ญี่ปุ่น โตเกียว ฟูจิ เที่ยวครบทุกมุม',category:'ทัวร์',country:'ญี่ปุ่น',price:24900,duration:'5 วัน 3 คืน',image:'/images/japan.jpg',tag:'ยอดนิยม',published:true,description:'ชมภูเขาไฟฟูจิ เดินเล่นย่านโตเกียว และสัมผัสวัฒนธรรมญี่ปุ่น พร้อมไกด์ดูแลตลอดการเดินทาง'},
{id:'europe',title:'ยุโรป ออสเตรีย หมู่บ้านริมทะเลสาบ',category:'ทัวร์',country:'ออสเตรีย',price:49900,duration:'9 วัน 6 คืน',image:'/images/europe.jpg',tag:'ทริปแนะนำ',published:true,description:'สัมผัสวิวเทือกเขาแอลป์ เยือนฮัลล์ชตัทท์ และพักผ่อนท่ามกลางเมืองสวยริมทะเลสาบ'},
{id:'japan-private',title:'ญี่ปุ่น กรุ๊ปส่วนตัว วางแผนในแบบคุณ',category:'ทัวร์',country:'ญี่ปุ่น',price:32900,duration:'6 วัน 4 คืน',image:'/images/tokyo-neon.jpg',tag:'กรุ๊ปส่วนตัว',published:true,description:'ออกแบบเส้นทางสำหรับครอบครัวหรือบริษัท เลือกวันเดินทางและสถานที่ที่คุณต้องการได้'},
{id:'austria',title:'ออสเตรีย เส้นทางธรรมชาติและเมืองเก่า',category:'ทัวร์',country:'ออสเตรีย',price:45900,duration:'7 วัน 5 คืน',image:'/images/europe.jpg',tag:'เที่ยวสบาย',published:true,description:'เดินทางแบบไม่เร่งรีบ ชมเมืองเก่าและธรรมชาติ พร้อมทีมงานจัดการรายละเอียดให้'},
{id:'visa-schengen',title:'บริการวีซ่าท่องเที่ยวเชงเก้น',category:'วีซ่า',country:'ยุโรป',price:3500,duration:'ประเมินตามเอกสาร',image:'/images/europe.jpg',tag:'ตรวจเอกสาร',published:true,description:'ให้คำแนะนำ ตรวจความครบถ้วนของเอกสาร และช่วยเตรียมคำขอ ค่าบริการตัวอย่างไม่รวมค่าธรรมเนียมสถานทูต ผลพิจารณาขึ้นกับหน่วยงานผู้อนุมัติ'},
{id:'visa-japan',title:'บริการเตรียมเอกสารวีซ่าญี่ปุ่น',category:'วีซ่า',country:'ญี่ปุ่น',price:1500,duration:'สอบถามประเภทวีซ่า',image:'/images/japan.jpg',tag:'ให้คำปรึกษา',published:true,description:'ช่วยตรวจเอกสารตามประเภทและวัตถุประสงค์การเดินทาง โปรดแจ้งสัญชาติและรายละเอียดเพื่อให้ทีมงานประเมินบริการที่เหมาะสม'},
{id:'flight',title:'ตั๋วเครื่องบิน เที่ยวเดียว / ไป–กลับ',category:'ตั๋วเครื่องบิน',country:'ทั่วโลก',price:0,duration:'เลือกเส้นทางและวันเดินทาง',image:'/images/japan.jpg',tag:'ขอราคา',published:true,description:'ระบุสนามบินต้นทาง ปลายทาง วันเดินทาง และจำนวนผู้โดยสาร ทีมงานตรวจสอบราคาและเงื่อนไขก่อนยืนยัน'},
{id:'multi-city',title:'ตั๋วหลายเมืองและตั๋วกรุ๊ป',category:'ตั๋วเครื่องบิน',country:'ทั่วโลก',price:0,duration:'จัดเส้นทางตามคำขอ',image:'/images/europe.jpg',tag:'สำหรับกรุ๊ป',published:true,description:'บริการจัดเส้นทางหลายเมืองและตั๋วสำหรับกลุ่มเดินทาง ขอใบเสนอราคาพร้อมเงื่อนไขสัมภาระและการเปลี่ยนแปลง'},
{id:'activities',title:'ตั๋วสวนสนุกและกิจกรรมในญี่ปุ่น',category:'ตั๋วกิจกรรม',country:'ญี่ปุ่น',price:2500,duration:'บัตร 1 วัน',image:'/images/japan.jpg',tag:'เที่ยวให้ครบ',published:true,description:'แจ้งสวนสนุกหรือกิจกรรมที่สนใจ พร้อมวันใช้งาน ทีมงานตรวจสอบจำนวนบัตร ราคา และเงื่อนไขก่อนยืนยัน'}
].map(s=>tourDefaults(s,true));
export const money=(p:number)=>p ? '฿ '+p.toLocaleString('th-TH') : 'สอบถามราคา';
