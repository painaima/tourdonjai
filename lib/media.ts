import {env} from 'cloudflare:workers';
import {seeds} from './catalog';
import {database} from './storage';

export function mediaKeys(service: Record<string, any>): string[] {
  const urls = [service.image, service.pdfUrl, ...(service.gallery || []), ...(service.wholesale?.imageSources || []).map((image: {url: string}) => image.url)];
  return [...new Set<string>(urls.filter((url): url is string => typeof url === 'string').flatMap(url => {
    const match = /^\/api\/media\/([a-f0-9-]+\.(?:jpg|png|webp|pdf))$/.exec(url);
    return match ? [match[1]] : [];
  }))];
}

export async function storedPdfValid(url: unknown) {
  if (url === undefined || url === '') return true;
  const key = typeof url === 'string' ? /^\/api\/media\/([a-f0-9-]+\.pdf)$/.exec(url)?.[1] : undefined;
  if (!key || !env.BUCKET) return false;
  const object = await env.BUCKET.head(key);
  return !!object && object.size <= 20 * 1024 * 1024 && object.httpMetadata?.contentType === 'application/pdf';
}
export async function deleteUnusedMedia(service: Record<string, any>) {
  if (!env.BUCKET) throw new Error('Media storage unavailable');
  const {results} = await database().prepare('SELECT data FROM catalog').all<{data: string}>();
  const records = new Map<string, Record<string, any>>(seeds.map(seed => [seed.id, seed]));
  results.forEach(row => {const item = JSON.parse(row.data); records.set(item.id, item);});
  const used = new Set([...records.values()].filter(item => !item.deleted).flatMap(mediaKeys));
  const unused = mediaKeys(service).filter(key => !used.has(key));
  if (unused.length) await env.BUCKET.delete(unused);
}

export async function storedImagesValid(urls: string[]) {
  for (const url of new Set(urls)) {
    if (url.startsWith('/images/')) continue;
    const key = /^\/api\/media\/([a-f0-9-]+\.(?:jpg|png|webp))$/.exec(url)?.[1];
    if (!key || !env.BUCKET) return false;
    const object = await env.BUCKET.head(key);
    if (!object || object.size > 150_000) return false;
  }
  return true;
}
