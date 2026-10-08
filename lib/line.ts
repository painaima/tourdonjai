export type LineSettings={lineId:string;lineUrl:string};
export const LINE_OA_URL='https://lin.ee/NoNsdRr';
export const CONTACT_PHONE='0642254662';
export function validLineSettings(s:unknown):s is LineSettings{const v=s as LineSettings;if(!v||typeof v.lineId!=='string'||typeof v.lineUrl!=='string')return false;if(v.lineId&&!/^@[A-Za-z0-9._-]{2,50}$/.test(v.lineId))return false;if(v.lineUrl){try{const u=new URL(v.lineUrl);if(u.protocol!=='https:'||!['lin.ee','line.me'].includes(u.hostname)||u.username||u.password)return false}catch{return false}}return true}
export function lineLink(_settings:LineSettings,_message:string,_mobile:boolean){return LINE_OA_URL}
