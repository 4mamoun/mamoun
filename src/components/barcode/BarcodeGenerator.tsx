import { useRef, useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, QrCode, ExternalLink, BarcodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getPublicUrl } from '@/utils/shortLink';

type QRType = 'internal' | 'public';

interface BarcodeGeneratorProps {
  code: string;
  name?: string;
  open: boolean;
  onClose: () => void;
  shortId?: string;
}

export default function BarcodeGenerator({ code, name, open, onClose, shortId }: BarcodeGeneratorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrType, setQrType] = useState<QRType>('internal');
  const [showBarcode, setShowBarcode] = useState(true);

  const hasPublicQR = !!shortId;
  const publicUrl = shortId ? getPublicUrl(shortId) : '';

  // Generate barcode (1D)
  useEffect(() => {
    if (!open || !code || !showBarcode) return;
    setError(null);

    const timer = setTimeout(() => {
      if (!svgRef.current) return;
      try {
        svgRef.current.innerHTML = '';
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          width: 2.5,
          height: 70,
          displayValue: true,
          fontSize: 16,
          font: 'monospace',
          textMargin: 10,
          margin: 12,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (e: unknown) {
        console.error('Barcode generation error:', e);
        setError(typeof e === 'object' && e !== null && 'message' in e ? String((e as Error).message) : 'فشل إنشاء الباركود');
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [open, code, showBarcode]);

  const handlePrint = () => {
    const svgEl = showBarcode && svgRef.current ? svgRef.current : null;
    const svgData = svgEl ? new XMLSerializer().serializeToString(svgEl) : null;
    const blob = svgData ? new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }) : null;
    const url = blob ? URL.createObjectURL(blob) : null;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl">
      <head><title>طباعة — ${name || code}</title>
        <style>
          body { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; font-family: system-ui, sans-serif; }
          .label { font-size:14px; font-weight:bold; margin-bottom:12px; color:#333; text-align:center; }
          .barcode-wrap { border:1px solid #e5e7eb; border-radius:12px; padding:20px; background:#fff; margin-bottom:20px; }
          .qr-wrap { border:1px solid #e5e7eb; border-radius:12px; padding:20px; background:#fff; display:flex; flex-direction:column; align-items:center; margin-bottom:20px; }
          .qr-wrap svg { display:block !important; }
          .code { font-size:13px; color:#666; margin-top:10px; text-align:center; font-family:monospace; }
          .url { font-size:11px; color:#888; margin-top:6px; text-align:center; word-break:break-all; }
        </style>
      </head>
      <body>
        ${name ? `<p class="label">${name}</p>` : ''}
        ${showBarcode && url ? `
        <div class="barcode-wrap">
          <img src="${url}" style="max-width:100%;display:block;" />
        </div>
        ` : ''}
        <div class="qr-wrap">
          <div id="qr-print"></div>
          <p class="code">${qrType === 'public' && publicUrl ? publicUrl : code}</p>
        </div>
        <script src="https://unpkg.com/qrcode.react@latest/lib/index.js"></script>
        <script>
          const qrContainer = document.getElementById('qr-print');
          // Print QR using simple SVG
          const svgNS = 'http://www.w3.org/2000/svg';
          const text = '${qrType === 'public' && publicUrl ? publicUrl : code}';
          // For simplicity, render a data URL of the QR
          const canvas = document.createElement('canvas');
          canvas.width = 160; canvas.height = 160;
          qrContainer.appendChild(canvas);
          // Use QRCode.js if available, otherwise show text
          if (window.QRCode) {
            new window.QRCode(qrContainer, { text, width: 160, height: 160 });
          }
          window.onload = function(){ setTimeout(function(){ window.print(); ${url ? `setTimeout(function(){URL.revokeObjectURL('${url}');},500);` : ''} },500); };
        </script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleCopy = () => {
    const text = qrType === 'public' && publicUrl ? publicUrl : code;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto pb-6" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <QrCode className="w-4 h-4" /> إصدار QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 mt-2" ref={containerRef}>
          {name && <p className="text-sm font-bold text-gray-700 text-center">{name}</p>}

          {/* Type selector */}
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setQrType('internal')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                qrType === 'internal' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" /> QR داخلي
            </button>
            {hasPublicQR && (
              <button
                onClick={() => setQrType('public')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                  qrType === 'public' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" /> QR عام
              </button>
            )}
          </div>

          {/* Show Barcode toggle */}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBarcode(!showBarcode)} className="text-[11px] text-gray-400 flex items-center gap-1 hover:text-gray-600">
              <BarcodeIcon className="w-3 h-3" />
              {showBarcode ? 'إخفاء باركود 1D' : 'إظهار باركود 1D'}
            </button>
          </div>

          {/* Barcode 1D (optional) */}
          {showBarcode && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 w-full flex justify-center min-h-[120px]">
              {error ? (
                <div className="text-red-500 text-xs text-center p-4">
                  <p className="font-bold mb-1">⚠️ فشل إنشاء الباركود</p>
                  <p>{error}</p>
                </div>
              ) : (
                <svg ref={svgRef} className="max-w-full" />
              )}
            </div>
          )}

          {/* QR Code */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 w-full flex flex-col items-center gap-3">
            {qrType === 'internal' ? (
              <>
                <QRCodeSVG value={code} size={180} level="M" includeMargin />
                <p className="text-xs font-mono text-gray-600 font-bold">{code}</p>
                <p className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">QR داخلي — للنظام</p>
              </>
            ) : (
              <>
                <QRCodeSVG value={publicUrl} size={180} level="M" includeMargin />
                <p className="text-xs font-mono text-gray-600 font-bold text-center break-all">{publicUrl}</p>
                <p className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full">QR عام — للعملاء</p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleCopy}>
              {copied ? '✓ تم النسخ' : 'نسخ الكود'}
            </Button>
            <Button size="sm" className="flex-1 gap-1 text-xs" onClick={handlePrint} disabled={!!error}>
              <Printer className="w-3.5 h-3.5" /> طباعة
            </Button>
          </div>

          {qrType === 'public' && publicUrl && (
            <div className="flex gap-2 w-full">
              <Button size="sm" variant="secondary" className="flex-1 gap-1 text-xs" onClick={() => window.open(publicUrl, '_blank')}>
                <ExternalLink className="w-3 h-3" /> فتح الرابط
              </Button>
            </div>
          )}

          <Button size="sm" variant="ghost" className="text-xs" onClick={onClose}>
            <X className="w-3.5 h-3.5" /> إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
