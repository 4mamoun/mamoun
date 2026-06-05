import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, ScanLine, Keyboard, Aperture } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  open: boolean;
}

export default function BarcodeScanner({ onScan, onClose, open }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const isClosing = useRef(false);

  const cleanup = async () => {
    if (isClosing.current) return;
    isClosing.current = true;
    try {
      if (scannerRef.current) {
        const isScanning = (scannerRef.current as any).isScanning || false;
        if (isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      }
    } catch {
      /* silent cleanup */
    } finally {
      scannerRef.current = null;
      setScanning(false);
      isClosing.current = false;
    }
  };

  useEffect(() => {
    if (!open) {
      cleanup();
      setError('');
      setManualMode(false);
      return;
    }

    const initTimer = setTimeout(async () => {
      isClosing.current = false;

      const el = document.getElementById('scanner-video-region');
      if (!el) {
        setError('عنصر الكاميرا غير موجود');
        return;
      }

      try {
        el.innerHTML = '';

        const scanner = new Html5Qrcode('scanner-video-region', false);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 200, height: 280 },
            aspectRatio: 0.75,
            videoConstraints: {
              facingMode: 'environment',
              width: { min: 480, ideal: 720 },
              height: { min: 640, ideal: 1280 },
            },
          },
          (decodedText: string) => {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([150, 80, 150]);
            }
            onScan(decodedText);
            cleanup().then(() => onClose());
          },
          () => { /* no-op on each frame */ }
        );

        setScanning(true);
        setError('');

        // Force video to portrait style
        const videoEl = el.querySelector('video');
        if (videoEl) {
          videoEl.style.width = '100%';
          videoEl.style.height = '100%';
          videoEl.style.objectFit = 'cover';
          videoEl.style.objectPosition = 'center';
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Camera failed';
        console.warn('Barcode scanner error:', msg);
        setError('لا يمكن تشغيل الكاميرا');
        setScanning(false);
        setManualMode(true);
      }
    }, 300);

    return () => {
      clearTimeout(initTimer);
      cleanup();
    };
  }, [open]);

  if (!open) return null;

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }
    onScan(manualCode.trim());
    setManualCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 z-10 flex-shrink-0">
        <p className="text-white text-sm font-bold flex items-center gap-2">
          <ScanLine className="w-4 h-4" />
          {manualMode ? 'إدخال يدوي' : 'مسح الباركود'}
        </p>
        <div className="flex items-center gap-2">
          {!manualMode && (
            <button onClick={() => { cleanup(); setManualMode(true); setError(''); }} className="p-2 hover:bg-white/20 rounded-full">
              <Keyboard className="w-4 h-4 text-white" />
            </button>
          )}
          {manualMode && (
            <button onClick={() => { setManualMode(false); setError(''); }} className="p-2 hover:bg-white/20 rounded-full">
              <Aperture className="w-4 h-4 text-white" />
            </button>
          )}
          <button onClick={() => { cleanup(); onClose(); }} className="p-2 hover:bg-white/20 rounded-full">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {manualMode ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Keyboard className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-400 text-sm mb-6">أدخل رقم الباركود يدوياً</p>
          <Input
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            placeholder="PR-2026-000001"
            className="text-center text-lg bg-gray-800 border-gray-600 text-white mb-4 max-w-xs"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
          />
          <Button onClick={handleManualSubmit} disabled={!manualCode.trim()} className="w-full max-w-xs">
            <ScanLine className="w-4 h-4 ml-2" /> بحث
          </Button>
        </div>
      ) : (
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">

          {/* Video region — PORTRAIT mode */}
          <div
            id="scanner-video-region"
            className="h-full mx-auto"
            style={{
              maxWidth: '100%',
              aspectRatio: '3/4',
            }}
          />

          {/* Error overlay */}
          {error && !scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
              <Camera className="w-14 h-14 text-red-400 mb-3" />
              <p className="text-white font-medium mb-2">{error}</p>
              <p className="text-gray-500 text-xs mb-5">الكاميرا غير متوفرة على هذا الجهاز</p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => { setManualMode(true); setError(''); }} className="text-white border-white/30 hover:bg-white/10">
                  <Keyboard className="w-4 h-4 ml-2" /> إدخال يدوي
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { cleanup(); onClose(); }} className="text-gray-400">
                  إغلاق
                </Button>
              </div>
            </div>
          )}

          {/* Scan frame overlay — PORRECT orientation */}
          {scanning && !error && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[280px]">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-[3px] border-l-[3px] border-green-400 rounded-tl-sm" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-[3px] border-r-[3px] border-green-400 rounded-tr-sm" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-[3px] border-l-[3px] border-green-400 rounded-bl-sm" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-[3px] border-r-[3px] border-green-400 rounded-br-sm" />
                <div className="absolute top-0 left-[10%] right-[10%] h-0.5 bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)] animate-[scanLine_2s_ease-in-out_infinite]" />
              </div>
              <p className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/80 text-xs bg-black/50 px-4 py-1.5 rounded-full whitespace-nowrap">
                وجه الكاميرا نحو الباركود
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 0; opacity: 1; }
          50% { top: 100%; opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
