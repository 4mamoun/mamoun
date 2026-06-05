import { useEffect, useState } from 'react';
import { useDataStore } from '@/store/dataStore';
import { X } from 'lucide-react';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AboutDialog({ open, onClose }: AboutDialogProps) {
  const { settings } = useDataStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-700 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      style={{ background: 'linear-gradient(180deg, #0c1222 0%, #0f172a 40%, #1a1f3a 100%)' }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
      >
        <X className="w-5 h-5 text-gray-400" />
      </button>

      {/* Ring */}
      <div
        className="w-[100px] h-[100px] rounded-full flex items-center justify-center mb-7"
        style={{ border: '2px solid rgba(59,130,246,0.15)', animation: 'aboutRing 3s ease-in-out infinite' }}
      >
        {/* Logo */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
            boxShadow: '0 0 60px rgba(59,130,246,0.35), 0 0 120px rgba(99,102,241,0.15)',
            animation: 'aboutLogoIn 0.8s cubic-bezier(0.16,1,0.3,1), aboutPulse 3s ease-in-out 1s infinite',
          }}
        >
          {settings.companyLogo ? (
            <img src={settings.companyLogo} alt="" className="w-[60%] h-[60%] object-contain" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="text-[#f8fafc] text-2xl font-extrabold tracking-wide mb-2" style={{ animation: 'aboutUp 0.7s ease-out 0.3s both' }}>
        PRODUCTION SYSTEM
      </div>

      {/* Subtitle */}
      <div className="text-[#64748b] text-[13px] tracking-[2px] mb-8" style={{ animation: 'aboutUp 0.7s ease-out 0.45s both' }}>
        {settings.companyName || 'نظام إدارة الإنتاج والشحن'}
      </div>

      {/* Info cards */}
      <div className="flex gap-3 mb-8 px-4" style={{ animation: 'aboutUp 0.7s ease-out 0.55s both' }}>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center min-w-[100px]">
          <p className="text-[10px] text-gray-500 mb-1">الإصدار</p>
          <p className="text-sm font-bold text-blue-400">v8.0</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center min-w-[100px]">
          <p className="text-[10px] text-gray-500 mb-1">المطور</p>
          <p className="text-sm font-bold text-purple-400">mamoun alsmahin</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center min-w-[100px]">
          <p className="text-[10px] text-gray-500 mb-1">المنصة</p>
          <p className="text-sm font-bold text-indigo-400">kimi.com</p>
        </div>
      </div>

      {/* Loader dots */}
      <div className="flex gap-1.5 mb-6" style={{ animation: 'aboutUp 0.6s ease-out 0.65s both' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" style={{ animation: 'aboutDot 1.4s ease-in-out infinite' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" style={{ animation: 'aboutDot 1.4s ease-in-out 0.2s infinite' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" style={{ animation: 'aboutDot 1.4s ease-in-out 0.4s infinite' }} />
      </div>

      {/* Footer text */}
      <div className="absolute bottom-[50px] text-[11px] text-gray-600" style={{ animation: 'aboutUp 0.6s ease-out 0.75s both' }}>
        by <span className="text-blue-500 font-medium">mamoun alsmahin</span>
      </div>
      <div className="absolute bottom-[28px] text-[9px] text-gray-700 tracking-[1.5px] uppercase" style={{ animation: 'aboutUp 0.6s ease-out 0.85s both' }}>
        Powered by <span className="text-indigo-500 font-medium">kimi.com</span>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes aboutLogoIn { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
        @keyframes aboutUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes aboutPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes aboutDot { 0%,80%,100%{transform:scale(0.5);opacity:.3} 40%{transform:scale(1);opacity:1} }
        @keyframes aboutRing { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:.6} }
      `}</style>
    </div>
  );
}
