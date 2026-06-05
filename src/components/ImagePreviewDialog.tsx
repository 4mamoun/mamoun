import { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImagePreviewDialogProps {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

export default function ImagePreviewDialog({ src, alt = '', open, onClose }: ImagePreviewDialogProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const handleReset = () => { setScale(1); setRotation(0); };
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === '+' || e.key === '=') handleZoomIn();
    if (e.key === '-') handleZoomOut();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        <button
          onClick={e => { e.stopPropagation(); handleZoomOut(); }}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          title="تصغير"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); handleReset(); }}
          className="px-3 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1 text-white text-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={e => { e.stopPropagation(); handleZoomIn(); }}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          title="تكبير"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); handleRotate(); }}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          title="تدوير"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image */}
      <div
        className="relative z-10 max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            cursor: 'grab',
          }}
          draggable={false}
        />
      </div>

      {/* Hint */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/40 z-10">
        ESC لإغلاق | + / - للتكبير
      </p>
    </div>
  );
}
