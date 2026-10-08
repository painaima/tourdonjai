export const MAX_IMAGE_BYTES = 150_000;

export async function readUploadResponse(response: Response, extension: 'image' | 'pdf') {
  let result: {url?: unknown; name?: string; error?: string};
  try {
    result = await response.json();
  } catch {
    throw new Error(response.redirected || response.status === 401 || response.status === 403
      ? 'กรุณาเข้าสู่ระบบ CMS ใหม่ก่อนอัปโหลด'
      : 'ระบบอัปโหลดตอบกลับไม่ถูกต้อง กรุณาลองอีกครั้ง');
  }
  if (!response.ok) throw new Error(result?.error || 'อัปโหลดไฟล์ไม่สำเร็จ');
  const pattern = extension === 'pdf'
    ? /^\/api\/media\/[a-f0-9-]+\.pdf$/
    : /^\/api\/media\/[a-f0-9-]+\.(jpg|png|webp)$/;
  if (!result || typeof result.url !== 'string' || !pattern.test(result.url)) {
    throw new Error('อัปโหลดไฟล์แล้ว แต่ไม่ได้รับลิงก์ไฟล์ที่ถูกต้อง กรุณาลองอีกครั้ง');
  }
  return {url: result.url, name: result.name};
}

async function uploadMedia(file: File, extension: 'image' | 'pdf') {
  const data = new FormData();
  data.append('file', file);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch('/api/media', {method: 'POST', body: data, signal: controller.signal});
    return await readUploadResponse(response, extension);
  } catch (error) {
    if (controller.signal.aborted) throw new Error('อัปโหลดใช้เวลานานเกินไป กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Flatten transparency onto white and shrink dimensions only when quality alone is insufficient.
export async function compactImage(file: Blob, name = 'tour-image'): Promise<File> {
  if (file.size > 20 * 1024 * 1024) throw new Error('กรุณาเลือกรูปต้นฉบับไม่เกิน 20 MB');
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  try {
    const signature = new Uint8Array(await file.slice(0, 3).arrayBuffer());
    if (file.size <= MAX_IMAGE_BYTES && bitmap.width <= 1600 && bitmap.height <= 1600
      && signature[0] === 255 && signature[1] === 216 && signature[2] === 255) {
      return new File([file], name.replace(/\.[^.]+$/, '') + '.jpg', {type: 'image/jpeg'});
    }
    let width = Math.min(bitmap.width, 1600);
    for (let attempt = 0; attempt < 12; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(bitmap.height * canvas.width / bitmap.width));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('ไม่สามารถย่อรูปได้');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.88, 0.78, 0.68, 0.58, 0.48]) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= MAX_IMAGE_BYTES) return new File([blob], name.replace(/\.[^.]+$/, '') + '.jpg', {type: 'image/jpeg'});
      }
      width *= 0.8;
    }
    throw new Error('ย่อรูปไม่สำเร็จ กรุณาเลือกรูปอื่น');
  } finally { bitmap.close(); }
}
export async function uploadImage(file: Blob, name?: string): Promise<string> {
  return (await uploadMedia(await compactImage(file, name), 'image')).url;
}

export async function uploadPdf(file: File): Promise<{url: string; name: string}> {
  const result = await uploadMedia(file, 'pdf');
  return {url: result.url, name: result.name || file.name};
}
