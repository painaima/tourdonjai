import {env} from 'cloudflare:workers';
import {adminAllowed,safeWrite} from '@/lib/storage';

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 22 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await adminAllowed(request)) || !safeWrite(request)) {
    return Response.json({error: 'ไม่มีสิทธิ์อัปโหลด'}, {status: 403});
  }

  try {
    if (!env.BUCKET) return Response.json({error: 'ที่เก็บไฟล์ยังไม่พร้อม'}, {status: 503});
    const contentLength = Number(request.headers.get('content-length'));
    if (contentLength > MAX_UPLOAD_BYTES) {
      return Response.json({error: 'ไฟล์ใหญ่เกินไป'}, {status: 413});
    }

    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) return Response.json({error: 'ไม่พบไฟล์'}, {status: 400});

    const bytes = await file.arrayBuffer();
    const data = new Uint8Array(bytes);
    const isPdf = String.fromCharCode(...data.slice(0, 5)) === '%PDF-';

    if (isPdf) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return Response.json({error: 'กรุณาเลือกไฟล์นามสกุล PDF'}, {status: 400});
      }
      if (file.size > MAX_PDF_BYTES) {
        return Response.json({error: 'PDF ต้องมีขนาดไม่เกิน 20 MB'}, {status: 413});
      }

      const name = file.name.split(/[\\/]/).pop()?.replace(/[\r\n\0]/g, ' ').trim().slice(0, 180);
      if (!name) return Response.json({error: 'ชื่อไฟล์ไม่ถูกต้อง'}, {status: 400});
      const asciiName = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'tour-program.pdf';
      const key = `${crypto.randomUUID()}.pdf`;
      await env.BUCKET.put(key, bytes, {
        httpMetadata: {
          contentType: 'application/pdf',
          contentDisposition: `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        },
        customMetadata: {originalName: name},
      });
      return Response.json({url: `/api/media/${key}`, name}, {status: 201});
    }

    if (file.size > 150_000) {
      return Response.json({error: 'ไฟล์รูปต้องไม่เกิน 150 KB · PDF ไม่เกิน 20 MB'}, {status: 400});
    }
    const type = data[0] === 255 && data[1] === 216 && data[2] === 255 ? 'jpg'
      : data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71 ? 'png'
      : String.fromCharCode(...data.slice(0, 4)) === 'RIFF' && String.fromCharCode(...data.slice(8, 12)) === 'WEBP' ? 'webp'
      : null;
    if (!type) return Response.json({error: 'รองรับ JPEG PNG WebP และ PDF เท่านั้น'}, {status: 400});

    const key = `${crypto.randomUUID()}.${type}`;
    await env.BUCKET.put(key, bytes, {
      httpMetadata: {contentType: type === 'jpg' ? 'image/jpeg' : `image/${type}`},
    });
    return Response.json({url: `/api/media/${key}`}, {status: 201});
  } catch (error) {
    console.error(error);
    return Response.json({error: 'อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง'}, {status: 503});
  }
}
