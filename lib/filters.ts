import type {Service} from './catalog';
import {activeDepartures,serviceCode} from './tour';
export type CatalogFilters={country:string;from:string;to:string;min:string;max:string;tags:string[]};
export const emptyFilters:CatalogFilters={country:'',from:'',to:'',min:'',max:'',tags:[]};
export function matchesFilters(s:Service,f:CatalogFilters,archive=false){
if(f.from&&f.to&&f.from>f.to||f.min&&f.max&&Number(f.min)>Number(f.max))return false;
if(f.country&&s.country!==f.country||f.tags.length&&!f.tags.some(t=>s.activityTags?.includes(t)))return false;
const priceMatches=(p:number)=>(!f.min||p>=Number(f.min))&&(!f.max||p<=Number(f.max));
const ds=archive?s.departures||[]:activeDepartures(s);
if(ds.length)return ds.some(d=>(!f.from||d.start>=f.from)&&(!f.to||d.end<=f.to)&&priceMatches(d.price));
return !f.from&&!f.to&&priceMatches(s.price);
}
export function matchesQuery(s:Service,q:string){const text=q.trim().toLocaleLowerCase();return !text||[s.title,s.country,serviceCode(s),s.airline||''].some(v=>v.toLocaleLowerCase().includes(text))}
