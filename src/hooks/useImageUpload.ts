/**
 * useImageUpload — Hook موحد لرفع الصور (ضغط ذكي + Cloud Storage)
 * يعمل بكل الصفحات: AccessoryDocs, Settings, Packing, Parts, ...
 */

import { useState, useCallback } from 'react';
import { uploadImage, deleteImage } from '@/utils/storageUpload';

interface UseImageUploadOptions {
  folder?: string;
  itemId?: string;
  autoClear?: boolean;
}

interface UseImageUploadReturn {
  image: string | null;
  sizeInfo: string;
  isCompressing: boolean;
  handleFile: (file: File) => Promise<void>;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  clearImage: () => void;
  setImage: (img: string | null) => void;
  isDragOver: boolean;
}

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const { folder = 'items', itemId, autoClear = false } = options;
  const [image, setImageState] = useState<string | null>(null);
  const [sizeInfo, setSizeInfo] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsCompressing(true);
    setSizeInfo('جاري المعالجة...');
    try {
      const { url, compressionInfo } = await uploadImage(file, folder, itemId, setSizeInfo);
      setImageState(url);
      setSizeInfo(compressionInfo);
      if (autoClear) {
        setTimeout(() => { setImageState(null); setSizeInfo(''); }, 1500);
      }
    } catch {
      setSizeInfo('❌ فشل الرفع');
    } finally {
      setIsDragOver(false);
      setTimeout(() => setIsCompressing(false), 500);
    }
  }, [folder, itemId, autoClear]);

  const handleFile = useCallback(async (file: File) => {
    await processFile(file);
  }, [processFile]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { processFile(file); break; }
      }
    }
  }, [processFile]);

  const clearImage = useCallback(() => {
    if (image && image.includes('firebasestorage')) {
      deleteImage(image).catch(() => {});
    }
    setImageState(null);
    setSizeInfo('');
  }, [image]);

  const setImage = useCallback((img: string | null) => {
    setImageState(img);
  }, []);

  return {
    image, sizeInfo, isCompressing,
    handleFile, handleUpload, handleDragOver, handleDragLeave, handleDrop, handlePaste,
    clearImage, setImage, isDragOver,
  };
}
