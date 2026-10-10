import {env} from 'cloudflare:workers';

export async function GET(_request: Request, {params}: {params: Promise<{key: string}>}) {
  const {key} = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp|pdf)$/.test(key)) {
    return new Response('Not found', {status: 404});
  }

  try {
    const object = await env.BUCKET?.get(key);
    if (!object) return new Response('Not found', {status: 404});

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public,max-age=31536000,immutable');
    headers.set('X-Content-Type-Options', 'nosniff');
    if (key.endsWith('.pdf')) {
      headers.set('Content-Type', 'application/pdf');
      if (!headers.has('Content-Disposition')) {
        headers.set('Content-Disposition', 'attachment; filename="tour-program.pdf"');
      }
    }

    // Read R2 before the framework closes the route request context.
    const bytes = await object.arrayBuffer();
    headers.set('Content-Length', String(bytes.byteLength));
    return new Response(bytes, {headers});
  } catch {
    return new Response('Unavailable', {status: 503});
  }
}
