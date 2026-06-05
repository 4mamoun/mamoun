/**
 * Image Compressor — يضغط الصور قبل الحفظ في Firestore
 * بدون Cloud Storage link — الصورة بتنحفظ كـ base64 مضغوط
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  type?: string;
}

const DEFAULT_OPTIONS: CompressOptions = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.7,
  type: 'image/jpeg',
};

/**
 * ضغط صورة من File أو base64
 * @returns base64 مضغوط جاهز للحفظ في Firestore
 */
export async function compressImage(
  input: File | string,
  options: CompressOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // حساب الأبعاد الجديدة (maintain aspect ratio)
      let { width, height } = img;
      const ratio = Math.min(
        opts.maxWidth! / width,
        opts.maxHeight! / height,
        1 // never upscale
      );
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      // رسم على canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      
      ctx.fillStyle = '#FFFFFF'; // white background for JPEG
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // تحويل لـ base64 مضغوط
      const compressed = canvas.toDataURL(opts.type, opts.quality);
      
      // تحرير الذاكرة
      canvas.width = 0;
      canvas.height = 0;
      
      resolve(compressed);
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof input === 'string') {
      // Already base64
      img.src = input;
    } else {
      // File object
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target?.result as string; };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(input);
    }
  });
}

/**
 * ضغط صورة ولصق (paste) من clipboard
 */
export async function compressFromClipboard(
  options?: CompressOptions
): Promise<string | null> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          const file = new File([blob], 'pasted-image.jpg', { type: 'image/jpeg' });
          return compressImage(file, options);
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * تحويل File لـ base64 (بدون ضغط — للاستخدام السريع)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * التحقق من حجم الصورة
 */
export function getBase64Size(base64: string): number {
  // Remove data:image/...;base64, prefix
  const clean = base64.split(',').pop() || '';
  // Base64 ~4/3 of binary size
  return Math.round((clean.length * 3) / 4);
}

/**
 * تنسيق حجم (bytes → KB/MB)
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
