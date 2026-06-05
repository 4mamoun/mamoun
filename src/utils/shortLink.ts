/**
 * Short Link Utilities
 * - توليد معرف فريد مختصر (base62)
 * - البحث عن عنصر بواسطة shortId
 */

const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(num: number): string {
  if (num === 0) return CHARS[0];
  let result = '';
  while (num > 0) {
    result = CHARS[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
}

export function generateShortId(): string {
  const timestamp = Date.now() % 1000000000; // last 9 digits
  const random = Math.floor(Math.random() * 1000000);
  return toBase62(timestamp * 1000000 + random);
}

export function getPublicUrl(shortId: string): string {
  // يستخدم النطاق الحالي
  const base = window.location.origin;
  return `${base}/p/${shortId}`;
}
