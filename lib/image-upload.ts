export const MAX_IMAGE_BYTES = 150_000;

// Flatten transparency onto white and shrink dimensions only when quality alone is insufficient.
export async function compactImage(file: Blob, name = 'tour-image'): Promise<File> {
  if (file.size > 20 * 1024 * 1024) throw new Error('กรุณาเลือกรูปต้นฉบับไม่เกิน 20 MB');
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  try {
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
  const data = new FormData();
  data.append('file', await compactImage(file, name));
  const response = await fetch('/api/media', {method: 'POST', body: data});
  const result = await response.json() as {url: string; error?: string};
  if (!response.ok) throw new Error(result.error || 'อัปโหลดรูปไม่สำเร็จ');
  return result.url;
}
