// ============================================================
// QRCodeGenerator — مولد QR Code مزدوج (داخلي + عام)
// ============================================================

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, X, Download, Printer, Globe, Lock, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import QRCode from 'react-qr-code';

type QRMode = 'internal' | 'public';

interface QRCodeGeneratorProps {
  code?: string;       // Internal barcode/code
  name?: string;
  shortId?: string;    // Short ID for public URL
  shortUrl?: string;   // Public short URL
  open: boolean;
  onClose: () => void;
}

export default function QRCodeGenerator({ code, name, shortId, shortUrl, open, onClose }: QRCodeGeneratorProps) {
  const [mode, setMode] = useState<QRMode>('internal');
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const displayName = name || 'QR Code';
  const qrValue = mode === 'internal' ? (code || '') : (shortUrl || `https://4mamoun.app/p/${shortId || code}`);
  const isPublicAvailable = !!shortUrl;

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 4;
      canvas.height = img.height * 4;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.download = `QR_${mode}_${code}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    w.document.write(`
      <html dir="rtl"><head><title>طباعة QR</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui;">
        <div style="border:2px solid #333;border-radius:12px;padding:24px;text-align:center;">
          <h2 style="margin:0 0 8px;font-size:18px">${displayName}</h2>
          <p style="margin:0 0 16px;color:#666;font-size:12px">${mode === 'internal' ? 'QR داخلي' : 'QR عام'}</p>
          <div style="margin-bottom:12px">${svgData}</div>
          <p style="margin:0;font-family:monospace;font-size:11px;color:#999">${qrValue}</p>
        </div>
        <script>setTimeout(()=>{window.print();window.close()},200)</script>
      </body></html>
    `);
    w.document.close();
  };

  const handleCopyUrl = () => {
    if (!shortUrl) return;
    navigator.clipboard.writeText(shortUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            QR Code — {displayName}
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-xl p-0.5">
          <button
            onClick={() => setMode('internal')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'internal' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> QR داخلي
          </button>
          <button
            onClick={() => setMode('public')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'public' ? 'bg-white shadow-sm text-green-700' : 'text-gray-400 hover:text-gray-600'
            } ${!isPublicAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={!isPublicAvailable}
          >
            <Globe className="w-3.5 h-3.5" /> QR عام
          </button>
        </div>

        {!isPublicAvailable && mode === 'public' && (
          <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg p-2 text-center">
            هذا العنصر لا يملك رابط عام — اذهب لإعدادات QR العام لتفعيله
          </p>
        )}

        {/* QR Display */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            ref={qrRef}
            className={`p-4 rounded-2xl border-2 ${
              mode === 'internal' ? 'border-blue-200 bg-blue-50/50' : 'border-green-200 bg-green-50/50'
            }`}
          >
            <QRCode value={qrValue} size={180} level="H" />
          </div>

          <div className="text-center">
            <p className="text-xs font-mono text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">{qrValue}</p>
            {mode === 'public' && shortUrl && (
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-1 mx-auto mt-2 text-[11px] text-blue-600 hover:text-blue-700"
              >
                {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'تم النسخ!' : 'نسخ الرابط'}
              </button>
            )}
          </div>

          {/* Legend */}
          <div className={`text-[10px] px-3 py-1 rounded-full flex items-center gap-1 ${
            mode === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          }`}>
            {mode === 'internal' ? (
              <><Lock className="w-3 h-3" /> QR داخلي — للموظفين المسجلين</>
            ) : (
              <><Globe className="w-3 h-3" /> QR عام — للعملاء والموردين</>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={onClose} className="flex-1">إغلاق</Button>
          <Button size="sm" variant="outline" onClick={handleDownload} className="flex-1 gap-1">
            <Download className="w-3.5 h-3.5" /> تحميل
          </Button>
          <Button size="sm" onClick={handlePrint} className="flex-1 gap-1 bg-gradient-to-r from-blue-500 to-blue-600">
            <Printer className="w-3.5 h-3.5" /> طباعة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
