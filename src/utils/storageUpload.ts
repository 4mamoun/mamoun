/**
 * Image Upload — ضغط صور + حفظ كـ base64 في Firestore
 * 
 * خطوات العمل:
 * 1. الصورة بتنضغط على المتصفح بـ Canvas API (سريع جداً)
 * 2. max أبعاد 1400px + جودة 0.82 + JPEG
 * 3. النتيجة base64 string بيتحفظ مباشرة في Firestore
 * 
 * مثال: صورة 8MB (4000×3000) → 400KB (1400×1050) base64
 * ما فيه CORS | ما فيه Storage | بيشتغل على طول
 */

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

const DEFAULT_COMPRESS: CompressOptions = {
  maxWidth: 1400,
  maxHeight: 1400,
  quality: 0.82,
};

/**
 * ضغط صورة على المتصفح + تحويل لـ base64
 * @returns { url: base64 string, compressionInfo: معلومات الضغط }
 */
export async function uploadImage(
  file: File,
  _folder?: string,      // ignored — kept for API compatibility
  _id?: string,          // ignored — kept for API compatibility
  onProgress?: (msg: string) => void
): Promise<{ url: string; compressionInfo: string }> {
  return new Promise((resolve, reject) => {
    onProgress?.('جاري الضغط...');
    
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const opts = DEFAULT_COMPRESS;
      let { width, height } = img;
      const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 JPEG
      const base64 = canvas.toDataURL('image/jpeg', opts.quality);
      const compressedSize = Math.round((base64.length * 3) / 4);
      const originalSize = file.size;
      const saved = Math.max(0, Math.round((1 - compressedSize / originalSize) * 100));
      const compressionInfo = `${formatSize(originalSize)} \u2192 ${formatSize(compressedSize)} (${saved}% أقل)`;
      
      canvas.width = 0;
      canvas.height = 0;
      
      onProgress?.(compressionInfo);
      resolve({ url: base64, compressionInfo });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * حذف صورة — base64 images لا تحتاج حذف من storage
 * لأنها مخزنة كـ string داخل Firestore document
 * لحذفها: امسح الـ field من الـ document باستخدام Firestore update
 * 
 * مثال:
 *   updateDoc(doc(db, 'parts', partId), { img: deleteField() })
 * 
 * هذه الدالة موجودة للـ API compatibility مع الأنظمة اللي تستخدم Firebase Storage
 */
export async function deleteImage(_url: string): Promise<void> {
  // No-op: base64 images are inline in Firestore documents
  // Delete the field from Firestore instead
  return Promise.resolve();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * تحويل base64 لـ File
 */
export function base64ToFile(base64: string, fileName: string = 'image.jpg'): File {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], fileName, { type: mime });
}
