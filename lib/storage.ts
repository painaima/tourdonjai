import {env} from 'cloudflare:workers';
import {accessAllowed} from './access';
export function database(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export async function adminAllowed(r:Request){const h=new URL(r.url).hostname;return h==='localhost'||h==='127.0.0.1'||await accessAllowed(r,env);}
export function safeWrite(r:Request){const origin=r.headers.get('origin');return !origin||origin===new URL(r.url).origin;}
