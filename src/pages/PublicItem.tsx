// ============================================================
// PublicItem — صفحة المنتج/القطعة العامة (ذكية)
// إذا مسجل دخول → redirect لصفحة العنصر داخل النظام
// إذا لا → عرض صفحة عامة بسيطة
// ============================================================

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { ImageIcon, Barcode, Package, Ruler, Weight, Building2, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PublicItem() {
  const { shortId } = useParams<{ shortId: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuthStore();
  const { parts, tops, products, accessories } = useDataStore();

  // ابحث عن العنصر بواسطة shortId
  const item =
    parts.find(p => p.shortId === shortId) ||
    tops.find(t => t.shortId === shortId) ||
    products.find(pr => pr.shortId === shortId) ||
    accessories.find(a => a.shortId === shortId);

  const isInternal = isLoggedIn && user?.status === 'active';

  // إذا مسجل دخول → redirect لصفحة العنصر داخل النظام
  useEffect(() => {
    if (isInternal && item) {
      const page =
        'revit' in item ? 'parts' :
        'thickness' in item ? 'tops' :
        'components' in item ? 'prods' :
        'acc';
      navigate(`/${page}`, { replace: true });
    }
  }, [isInternal, item, navigate]);

  // إذا ما لقينا العنصر
  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center p-8">
          <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-800 mb-2">العنصر غير موجود</h1>
          <p className="text-sm text-gray-400 mb-4">لم يتم العثور على منتج أو قطعة بهذا الرابط</p>
          <a href="/" className="text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" /> العودة للرئيسية
          </a>
        </div>
      </div>
    );
  }

  // نوع العنصر
  const typeLabel =
    'revit' in item ? 'قطعة' :
    'thickness' in item ? 'توب' :
    'components' in item ? 'منتج' :
    'اكسسوار';

  const typeColor =
    'revit' in item ? 'bg-blue-100 text-blue-700' :
    'thickness' in item ? 'bg-teal-100 text-teal-700' :
    'components' in item ? 'bg-green-100 text-green-700' :
    'bg-purple-100 text-purple-700';

  // معلومات العنصر
  const name = item.name;
  const code = (item as any).revit || (item as any).code || '';
  const barcode = (item as any).barcode || '';
  const img = (item as any).img;

  // أبعاد
  const dims =
    'revit' in item ? `${(item as any).length || '—'} × ${(item as any).width || '—'} × ${(item as any).height || '—'}` :
    'thickness' in item ? `${(item as any).length || '—'} × ${(item as any).width || '—'} × ${(item as any).thickness || '—'}` :
    'components' in item ? `${(item as any).dim?.l || '—'} × ${(item as any).dim?.w || '—'} × ${(item as any).dim?.h || '—'}` :
    '';

  const weight = (item as any).weight;
  const source = (item as any).source || (item as any).product;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="text-sm font-bold text-gray-800">نظام إدارة الإنتاج</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeColor}`}>{typeLabel}</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Image */}
          <div className="aspect-video bg-gray-50 relative">
            {img ? (
              <img src={img} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-gray-200" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-5 space-y-4">
            {/* Name */}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{name}</h1>
              <p className="text-sm font-mono text-gray-400 mt-1">{code}</p>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3">
              {dims && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Ruler className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-[10px] text-gray-400">الأبعاد (مم)</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800 font-mono">{dims}</p>
                </div>
              )}
              {weight && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Weight className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-[10px] text-gray-400">الوزن (كغ)</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800">{weight}</p>
                </div>
              )}
              {source && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-[10px] text-gray-400">المصدر</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800">{source === 'local' ? 'محلي' : 'مستورد'}</p>
                </div>
              )}
              {barcode && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Barcode className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-[10px] text-gray-400">الباركود</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800 font-mono">{barcode}</p>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-3">امسح للحصول على المعلومات</p>
              <QRCodeSVG
                value={window.location.href}
                size={160}
                level="M"
                includeMargin={true}
                imageSettings={{
                  src: '',
                  height: 0,
                  width: 0,
                  excavate: false,
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-gray-300 text-center mt-4">نظام إدارة الإنتاج — Production Management System</p>
      </div>
    </div>
  );
}
