import { useState, useCallback, useEffect, useRef } from 'react';
import { ImageIcon, X, Loader2, CloudUpload, Zap, ClipboardPaste } from 'lucide-react';
import { uploadImage, deleteImage } from '@/utils/storageUpload';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  itemId?: string;
}

export default function ImageUpload({ value, onChange, label = 'الصورة', folder = 'items', itemId }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [pasteFlash, setPasteFlash] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsUploading(true);
    setProgress('جاري المعالجة...');
    try {
      const { url, compressionInfo } = await uploadImage(file, folder, itemId, setProgress);
      if (value && value.includes('firebasestorage')) {
        deleteImage(value).catch(() => {});
      }
      onChange(url);
      setProgress(compressionInfo);
    } catch {
      setProgress('فشل الرفع ❌');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setProgress('');
      }, 2500);
    }
  }, [onChange, folder, itemId, value]);

  // ─── Handle paste from clipboard ───
  const handlePaste = useCallback((e: ClipboardEvent) => {
    // Only process if this component is focused/visible
    const items = e.clipboardData?.items;
    if (!items) return;

    let foundImage = false;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          foundImage = true;
          processFile(file);
        }
        break; // Only first image
      }
    }

    if (foundImage) {
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 600);
    }
  }, [processFile]);

  // Listen for paste events globally when component is mounted
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) processFile(f); };
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); };

  const handleRemove = () => {
    if (value && value.includes('firebasestorage')) {
      deleteImage(value).catch(() => {});
    }
    onChange('');
  };

  // ─── Manual paste trigger (for mobile/browsers that block auto-paste) ───
  const triggerPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], 'pasted-image.png', { type });
            processFile(file);
            return;
          }
        }
      }
      // Fallback: show instruction
      alert('اضغط Ctrl+V للصق الصورة');
    } catch {
      alert('اضغط Ctrl+V للصق الصورة مباشرة');
    }
  };

  if (value) {
    return (
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <img src={value} alt="" className="w-16 h-16 rounded-xl object-cover border shadow-sm" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center" title="جودة عالية">
              <CloudUpload className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 w-fit ${isUploading ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isUploading ? progress : 'تغيير'}
              {!isUploading && <input type="file" accept="image/*" className="hidden" onChange={handleFile} />}
            </label>
            <button onClick={triggerPaste} className="text-[10px] text-cyan-600 hover:text-cyan-800 text-right flex items-center gap-0.5 w-fit">
              <ClipboardPaste className="w-2.5 h-2.5" /> لصق (Ctrl+V)
            </button>
            {progress && !isUploading && (
              <p className="text-[9px] text-emerald-600 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" /> {progress}</p>
            )}
            <button onClick={handleRemove} className="text-xs text-red-500 hover:text-red-700 text-right">حذف</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
      <div
        ref={zoneRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isUploading && document.getElementById('img-upload-' + label)?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          pasteFlash ? 'border-green-400 bg-green-50 scale-[1.02]' :
          isUploading ? 'border-blue-400 bg-blue-50' :
          'border-gray-300 bg-gray-50/60 hover:border-blue-400 hover:bg-blue-50/30'
        }`}
      >
        <input id={'img-upload-' + label} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            pasteFlash ? 'bg-green-100' :
            isUploading ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            ) : pasteFlash ? (
              <ClipboardPaste className="w-5 h-5 text-green-500" />
            ) : (
              <ImageIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <p className={`text-xs ${pasteFlash ? 'text-green-600 font-bold' : isUploading ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            {pasteFlash ? 'تم اللصق!' : isUploading ? progress : 'اسحب صورة أو انقر أو الصق'}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Zap className="w-3 h-3 text-amber-400" /> ضغط ذكي
            </p>
            <span className="text-gray-300">|</span>
            <button
              onClick={(e) => { e.stopPropagation(); triggerPaste(); }}
              className="text-[10px] text-cyan-500 hover:text-cyan-700 flex items-center gap-0.5 font-medium"
            >
              <ClipboardPaste className="w-3 h-3" /> Ctrl+V
            </button>
          </div>
          <p className="text-[9px] text-blue-400 flex items-center gap-0.5">
            <CloudUpload className="w-2.5 h-2.5" /> جودة عالية — لا يوجد حد
          </p>
        </div>
      </div>
    </div>
  );
}
