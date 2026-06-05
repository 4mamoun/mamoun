// ============================================================
// Settings Page — إعدادات الشركة والنظام (Admin فقط)
// ============================================================

import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { useDataStore } from '@/store/dataStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, ImageIcon, Upload, Trash2, Save, Phone, Mail, Globe, MapPin,
  Shield, Clock, Package, Lock, AlertTriangle, Barcode, Plus, X, GripVertical,
  Cog, Square, Layers, Box, Search, CheckSquare, Square as SquareIcon, QrCode, ExternalLink, Eye,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generateShortId, getPublicUrl } from '@/utils/shortLink';
import type { BarcodeSegment } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useImageUpload } from '@/hooks/useImageUpload';
import { usePermissionStore } from '@/store/permissionStore';

// ─── Barcode Preview Builder ───
function buildBarcodePreview(segments: BarcodeSegment[]): string {
  return segments.map(s => {
    switch (s.type) {
      case 'type': return 'PR';
      case 'year': return String(new Date().getFullYear());
      case 'seq': return String(s.length || 6).padStart(s.length || 6, '0').slice(-(s.length || 6));
      case 'dim': return '1200800';
      case 'partcode': return 'WALL001';
      case 'prodcode': return 'PROD001';
      case 'custom': return s.value;
      default: return s.value;
    }
  }).join('');
}

export default function Settings() {
  const { t: _t, i18n } = useTranslation();
  const { settings, setSettings, clearAll, parts, tops, products, accessories, updatePart, updateProduct, updateTop, updateAccessory, deletePart, deleteTop, deleteProduct, deleteAccessory } = useDataStore();
  const { logout } = useAuthStore();
  const [logoPreview, setLogoPreview] = useState(settings.companyLogo || '');

  // Upload logo to Firebase Storage (high quality)
  const img = useImageUpload({ folder: 'logos' });
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companyAddress, setCompanyAddress] = useState(settings.companyAddress || '');
  const [companyPhone, setCompanyPhone] = useState(settings.companyPhone || '');
  const [companyEmail, setCompanyEmail] = useState(settings.companyEmail || '');
  const [companyWebsite, setCompanyWebsite] = useState(settings.companyWebsite || '');
  const [currency, setCurrency] = useState(settings.currency);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [minPasswordLength, setMinPasswordLength] = useState(settings.minPasswordLength);
  const [sessionTimeout, setSessionTimeout] = useState(settings.sessionTimeout);
  const [maxBoxes, setMaxBoxes] = useState(settings.maxBoxesPerContainer);
  const [maxPallets, setMaxPallets] = useState(settings.maxPalletsPerContainer);
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Admin Guard ───
  const currentUser = useAuthStore(s => s.user);
  const isAdminUser = currentUser?.role === 'admin';
  if (!isAdminUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Shield className="w-16 h-16 text-amber-200 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-400">هذه الصفحة متاحة لمدير النظام فقط</p>
          <p className="text-sm text-gray-300 mt-2">لا تملك صلاحية الوصول إلى الإعدادات</p>
        </div>
      </div>
    );
  }

  // ─── Public QR Management State ───
  const [qrCategory, setQrCategory] = useState<'products' | 'parts' | 'tops' | 'accessories'>('products');
  const [qrSearch, setQrSearch] = useState('');
  const [qrPreviewId, setQrPreviewId] = useState<string | null>(null);

  const getQrList = () => {
    switch (qrCategory) {
      case 'parts': return parts.map(p => ({ id: p.id, name: p.name, code: p.revit, barcode: p.barcode, shortId: p.shortId, publicQR: p.publicQR, type: 'قطعة' as const }));
      case 'tops': return tops.map(t => ({ id: t.id, name: t.name, code: t.code, barcode: t.barcode, shortId: t.shortId, publicQR: t.publicQR, type: 'توب' as const }));
      case 'accessories': return accessories.map(a => ({ id: a.id, name: a.name, code: a.code, barcode: a.barcode, shortId: a.shortId, publicQR: a.publicQR, type: 'اكسسوار' as const }));
      default: return products.map(p => ({ id: p.id, name: p.name, code: p.code, barcode: p.barcode, shortId: p.shortId, publicQR: p.publicQR, type: 'منتج' as const }));
    }
  };

  const qrList = getQrList();
  const filteredQrList = qrSearch.trim()
    ? qrList.filter(item => item.name.toLowerCase().includes(qrSearch.toLowerCase()) || item.code.toLowerCase().includes(qrSearch.toLowerCase()))
    : qrList;
  const enabledCount = qrList.filter(i => i.publicQR).length;

  const togglePublicQR = (item: typeof qrList[0]) => {
    const newShortId = item.shortId || generateShortId();
    const patch = { publicQR: !item.publicQR, shortId: newShortId };
    switch (qrCategory) {
      case 'parts': updatePart(item.id, patch); break;
      case 'tops': updateTop(item.id, patch); break;
      case 'accessories': updateAccessory(item.id, patch); break;
      case 'products': updateProduct(item.id, patch); break;
    }
  };

  // ─── Barcode Builder State ───
  const [barcodeSegments, setBarcodeSegments] = useState<BarcodeSegment[]>(
    settings.barcodeSegments || [
      { id: 's1', type: 'type', value: 'TYPE' },
      { id: 's2', type: 'custom', value: '-' },
      { id: 's3', type: 'year', value: 'YEAR' },
      { id: 's4', type: 'custom', value: '-' },
      { id: 's5', type: 'seq', value: '000001', length: 6 },
    ]
  );
  const barcodePreview = buildBarcodePreview(barcodeSegments);

  // ─── Delete Management State ───
  const [deleteCategory, setDeleteCategory] = useState<'products' | 'parts' | 'tops' | 'accessories'>('products');
  const [deleteSearch, setDeleteSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getDeleteList = () => {
    switch (deleteCategory) {
      case 'parts': return parts.map(p => ({ id: p.id, name: p.name, code: p.revit, type: 'قطعة' }));
      case 'tops': return tops.map(t => ({ id: t.id, name: t.name, code: t.code, type: 'توب' }));
      case 'accessories': return accessories.map(a => ({ id: a.id, name: a.name, code: a.code, type: 'اكسسوار' }));
      default: return products.map(p => ({ id: p.id, name: p.name, code: p.code, type: 'منتج' }));
    }
  };

  const deleteList = getDeleteList();
  const filteredDeleteList = deleteSearch.trim()
    ? deleteList.filter(item => item.name.toLowerCase().includes(deleteSearch.toLowerCase()) || item.code.toLowerCase().includes(deleteSearch.toLowerCase()))
    : deleteList;

  const toggleSelect = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredDeleteList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredDeleteList.map(i => i.id)));
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => {
      switch (deleteCategory) {
        case 'parts': deletePart(id); break;
        case 'tops': deleteTop(id); break;
        case 'accessories': deleteAccessory(id); break;
        case 'products': deleteProduct(id); break;
      }
    });
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    img.handleUpload(e);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    img.handleDrop(e);
  };

  // Watch for compressed image from hook
  useEffect(() => {
    if (img.image) {
      setLogoPreview(img.image);
      setIsDirty(true);
      img.clearImage();
    }
  }, [img.image]);

  const handleSave = () => {
    setSettings({
      companyName,
      companyLogo: logoPreview,
      companyAddress: companyAddress || '',
      companyPhone: companyPhone || '',
      companyEmail: companyEmail || '',
      companyWebsite: companyWebsite || '',
      currency,
      timezone,
      minPasswordLength: Number(minPasswordLength) || 8,
      sessionTimeout: Number(sessionTimeout) || 30,
      maxBoxesPerContainer: Number(maxBoxes) || 100,
      maxPalletsPerContainer: Number(maxPallets) || 10,
      barcodeSegments,
    });
    setIsDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setLogoPreview(settings.companyLogo || '');
    setCompanyName(settings.companyName);
    setCompanyAddress(settings.companyAddress || '');
    setCompanyPhone(settings.companyPhone || '');
    setCompanyEmail(settings.companyEmail || '');
    setCompanyWebsite(settings.companyWebsite || '');
    setCurrency(settings.currency);
    setTimezone(settings.timezone);
    setMinPasswordLength(settings.minPasswordLength);
    setSessionTimeout(settings.sessionTimeout);
    setMaxBoxes(settings.maxBoxesPerContainer);
    setMaxPallets(settings.maxPalletsPerContainer);
    setIsDirty(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-gray-800">إعدادات النظام</h2>
            <p className="text-[10px] text-gray-400">إدارة إعدادات الشركة والنظام — متاحة للمدير فقط</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              تغييرات غير محفوظة
            </span>
          )}
          {saved && (
            <span className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded-full">
              ✅ تم الحفظ
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} className="text-xs h-8">
            إلغاء
          </Button>
          <Button size="sm" onClick={handleSave} className="text-xs h-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
            <Save className="w-3.5 h-3.5 ml-1" />
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      <Tabs defaultValue="company" dir="rtl">
        <TabsList className="bg-white border border-gray-100 shadow-sm">
          <TabsTrigger value="company" className="text-xs gap-1">
            <Building2 className="w-3.5 h-3.5" /> الشركة
          </TabsTrigger>
          <TabsTrigger value="system" className="text-xs gap-1">
            <Shield className="w-3.5 h-3.5" /> النظام
          </TabsTrigger>
          <TabsTrigger value="warehouse" className="text-xs gap-1">
            <Package className="w-3.5 h-3.5" /> المستودع
          </TabsTrigger>
          <TabsTrigger value="barcode" className="text-xs gap-1">
            <Barcode className="w-3.5 h-3.5" /> QR داخلي
          </TabsTrigger>
          <TabsTrigger value="delete" className="text-xs gap-1">
            <Trash2 className="w-3.5 h-3.5" /> إدارة الحذف
          </TabsTrigger>
          <TabsTrigger value="publicqr" className="text-xs gap-1">
            <ExternalLink className="w-3.5 h-3.5" /> QR عام
          </TabsTrigger>
        </TabsList>

        {/* Company Tab */}
        <TabsContent value="company" className="mt-4 space-y-4">
          {/* Logo Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-500" />
              شعار الشركة
            </h3>
            <div className="flex flex-col sm:flex-row items-start gap-6" onPaste={(e) => { e.preventDefault(); img.handlePaste(e); }}>
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative group">
                    <img
                      src={logoPreview}
                      alt="Company Logo"
                      className="w-32 h-32 rounded-xl object-contain border border-gray-200 bg-white p-2 shadow-sm"
                    />
                    <button
                      onClick={() => { setLogoPreview(''); setIsDirty(true); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Upload Area */}
              <div className="flex-1 w-full">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleLogoDrop}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-400 hover:bg-purple-50/30 transition-all cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">اسحب الشعار هنا أو انقر لاختيار ملف</p>
                  <p className="text-[10px] text-gray-400 mt-1">أو اضغط Ctrl+V للصق — JPG, PNG, SVG</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-500" />
              معلومات الشركة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">اسم الشركة *</label>
                <Input
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setIsDirty(true); }}
                  placeholder="اسم الشركة"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> العنوان
                </label>
                <Input
                  value={companyAddress}
                  onChange={(e) => { setCompanyAddress(e.target.value); setIsDirty(true); }}
                  placeholder="عنوان الشركة"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> الهاتف
                </label>
                <Input
                  value={companyPhone}
                  onChange={(e) => { setCompanyPhone(e.target.value); setIsDirty(true); }}
                  placeholder="رقم الهاتف"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> البريد الإلكتروني
                </label>
                <Input
                  value={companyEmail}
                  onChange={(e) => { setCompanyEmail(e.target.value); setIsDirty(true); }}
                  placeholder="email@company.com"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> الموقع الإلكتروني
                </label>
                <Input
                  value={companyWebsite}
                  onChange={(e) => { setCompanyWebsite(e.target.value); setIsDirty(true); }}
                  placeholder="www.company.com"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">العملة</label>
                <select
                  value={currency}
                  onChange={(e) => { setCurrency(e.target.value); setIsDirty(true); }}
                  className="w-full h-9 text-sm rounded-md border border-input bg-background px-3"
                >
                  <option value="USD">$ USD — دولار أمريكي</option>
                  <option value="EUR">€ EUR — يورو</option>
                  <option value="GBP">£ GBP — جنيه إسترليني</option>
                  <option value="JOD">د.أ JOD — دينار أردني</option>
                  <option value="SAR">ر.س SAR — ريال سعودي</option>
                  <option value="AED">د.إ AED — درهم إماراتي</option>
                  <option value="EGP">ج.م EGP — جنيه مصري</option>
                </select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-500" />
              إعدادات الأمان
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">المنطقة الزمنية</label>
                <select
                  value={timezone}
                  onChange={(e) => { setTimezone(e.target.value); setIsDirty(true); }}
                  className="w-full h-9 text-sm rounded-md border border-input bg-background px-3"
                >
                  <option value="UTC+0">UTC+0 — غرينتش</option>
                  <option value="UTC+1">UTC+1 — وسط أوروبا</option>
                  <option value="UTC+2">UTC+2 — شرق أوروبا</option>
                  <option value="UTC+3">UTC+3 — الرياض/الأردن/بغداد</option>
                  <option value="UTC+4">UTC+4 — أبوظبي/دبي</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">الحد الأدنى لكلمة المرور</label>
                <Input
                  type="number"
                  value={minPasswordLength}
                  onChange={(e) => { setMinPasswordLength(Number(e.target.value)); setIsDirty(true); }}
                  min={4}
                  max={32}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> مهلة الجلسة (دقيقة)
                </label>
                <Input
                  type="number"
                  value={sessionTimeout}
                  onChange={(e) => { setSessionTimeout(Number(e.target.value)); setIsDirty(true); }}
                  min={5}
                  max={120}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Warehouse Tab */}
        <TabsContent value="warehouse" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-500" />
              إعدادات المستودع
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">الحد الأقصى للصناديق/كونتينر</label>
                <Input
                  type="number"
                  value={maxBoxes}
                  onChange={(e) => { setMaxBoxes(Number(e.target.value)); setIsDirty(true); }}
                  min={1}
                  max={500}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">الحد الأقصى للبالتات/كونتينر</label>
                <Input
                  type="number"
                  value={maxPallets}
                  onChange={(e) => { setMaxPallets(Number(e.target.value)); setIsDirty(true); }}
                  min={1}
                  max={50}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6 mt-4">
            <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              إعادة تعيين البيانات
            </h3>
            <p className="text-xs text-red-600 mb-4 leading-relaxed">
              سيمسح هذا الزر كل البيانات التجريبية المُولدة (قطع، اكسسوارات، توبات، منتجات، مشاريع، حركات مخزون، شحنات، فحوصات...).
              لن يُمسح: إعدادات الشركة والمستخدمين.
            </p>
            <button
              onClick={() => {
                if (confirm('هل أنت متأكد من مسح كل البيانات التجريبية؟\n\nسيتم مسح:\n- القطع والاكسسوارات والتوبات\n- المنتجات والمشاريع\n- الحاويات والشحنات\n- حركات المخزون\n- القطع المرفوضة والفحوصات\n\nلن يُمسح:\n- إعدادات الشركة\n- المستخدمين')) {
                  localStorage.setItem('demo_seeded', 'cleared');
                  clearAll();
                  alert('تم مسح البيانات بنجاح! سيتم تسجيل خروجك لتحديث النظام.');
                  logout();
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              مسح البيانات التجريبية
            </button>
          </div>
        </TabsContent>

        {/* ═══ Delete Management Tab ═══ */}
        <TabsContent value="delete" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              إدارة الحذف
            </h3>
            <p className="text-[11px] text-gray-400 mb-4">حذف المنتجات أو القطع أو التوبات أو الاكسسوارات — متاح للمدير فقط</p>
            <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg p-2 mb-4">
              <AlertTriangle className="w-3 h-3 inline ml-1" />
              ملاحظة: حذف المنتج لا يحذف القطع والتوبات والاكسسوارات المضافة عليه
            </p>

            {/* Category selector */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'products' as const, label: 'المنتجات', icon: Box },
                { key: 'parts' as const, label: 'القطع', icon: Cog },
                { key: 'tops' as const, label: 'التوبات', icon: Square },
                { key: 'accessories' as const, label: 'الاكسسوارات', icon: Layers },
              ].map(cat => (
                <button
                  key={cat.key}
                  onClick={() => { setDeleteCategory(cat.key); setSelectedIds(new Set()); setDeleteSearch(''); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    deleteCategory === cat.key
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${deleteCategory === cat.key ? 'bg-white/20' : 'bg-gray-200'}`}>
                    {getDeleteList().length}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={deleteSearch}
                onChange={e => setDeleteSearch(e.target.value)}
                placeholder="البحث بالاسم أو الكود..."
                className="w-full h-9 pr-10 pl-8 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all text-right"
                dir="rtl"
              />
              {deleteSearch && (
                <button onClick={() => setDeleteSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>

            {/* Select all + count */}
            <div className="flex items-center justify-between mb-2 px-1">
              <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-600 transition-colors">
                {selectedIds.size === filteredDeleteList.length && filteredDeleteList.length > 0 ? <CheckSquare className="w-4 h-4" /> : <SquareIcon className="w-4 h-4" />}
                <span className="font-medium">{selectedIds.size === filteredDeleteList.length && filteredDeleteList.length > 0 ? 'إلغاء التحديد' : 'تحديد الكل'}</span>
              </button>
              <span className="text-[10px] text-gray-400">
                {selectedIds.size} محدد من {filteredDeleteList.length}
              </span>
            </div>

            {/* Items list */}
            <div className="border border-gray-100 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
              {filteredDeleteList.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-xs">لا توجد عناصر</p>
                </div>
              ) : filteredDeleteList.map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${
                    selectedIds.has(item.id) ? 'bg-red-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedIds.has(item.id) ? 'bg-red-500 border-red-500' : 'border-gray-300'
                  }`}>
                    {selectedIds.has(item.id) && <CheckSquare className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{item.code}</p>
                  </div>
                  <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex-shrink-0">{item.type}</span>
                </div>
              ))}
            </div>

            {/* Delete button */}
            {selectedIds.size > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف {selectedIds.size} عنصر
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-colors"
                >
                  إلغاء التحديد
                </button>
              </div>
            )}
          </div>

          {/* Delete confirmation modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={() => setShowDeleteConfirm(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()} dir="rtl">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-center mb-1">تأكيد الحذف</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  سيتم حذف <strong>{selectedIds.size}</strong> عنصر نهائياً.
                  <br />
                  {deleteCategory === 'products' && (
                    <span className="text-amber-500 text-xs">ملاحظة: القطع والتوبات والاكسسوارات المضافة على المنتج لن تُحذف.</span>
                  )}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-colors">
                    إلغاء
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    حذف نهائي
                  </button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ Public QR Management Tab ═══ */}
        <TabsContent value="publicqr" className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-green-500" />
                إدارة QR العام
              </h3>
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                {enabledCount} مفعل من {qrList.length}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mb-4">اختيار المنتجات والقطع اللي بتظهر QR عام لها — متاحة لأي شخص خارج النظام</p>

            {/* Category selector */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'products' as const, label: 'المنتجات', icon: Box, count: products.length },
                { key: 'parts' as const, label: 'القطع', icon: Cog, count: parts.length },
                { key: 'tops' as const, label: 'التوبات', icon: Square, count: tops.length },
                { key: 'accessories' as const, label: 'الاكسسوارات', icon: Layers, count: accessories.length },
              ].map(cat => (
                <button
                  key={cat.key}
                  onClick={() => { setQrCategory(cat.key); setQrSearch(''); setQrPreviewId(null); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    qrCategory === cat.key
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${qrCategory === cat.key ? 'bg-white/20' : 'bg-gray-200'}`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={qrSearch}
                onChange={e => setQrSearch(e.target.value)}
                placeholder="البحث بالاسم أو الكود..."
                className="w-full h-9 pr-10 pl-8 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 outline-none transition-all text-right"
                dir="rtl"
              />
              {qrSearch && (
                <button onClick={() => setQrSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>

            {/* Items list */}
            <div className="border border-gray-100 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
              {filteredQrList.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-xs">لا توجد عناصر</p>
                </div>
              ) : filteredQrList.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                    item.publicQR ? 'bg-green-50/40' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => togglePublicQR(item)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${
                      item.publicQR ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    title={item.publicQR ? 'إيقاف QR العام' : 'تفعيل QR العام'}
                  >
                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform ${
                      item.publicQR ? 'left-0.5' : 'right-0.5'
                    }`} />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{item.name || '—'}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[10px] text-gray-500 font-mono">{item.code || '—'}</p>
                      <p className="text-[9px] text-indigo-400 font-mono">{item.barcode || ''}</p>
                    </div>
                  </div>

                  {/* Type badge */}
                  <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex-shrink-0">{item.type}</span>

                  {/* Public QR badge + preview */}
                  {item.publicQR && item.shortId && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">QR عام</span>
                      <button
                        onClick={() => setQrPreviewId(qrPreviewId === item.id ? null : item.id)}
                        className="p-1 hover:bg-green-100 rounded-lg transition-colors"
                        title="معاينة QR"
                      >
                        <Eye className="w-3.5 h-3.5 text-green-600" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* QR Preview */}
            {qrPreviewId && (() => {
              const item = filteredQrList.find(i => i.id === qrPreviewId);
              if (!item || !item.shortId) return null;
              const url = getPublicUrl(item.shortId);
              return (
                <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-6 flex flex-col items-center gap-3 animate-fade-in">
                  <p className="text-xs font-bold text-gray-700">{item.name}</p>
                  <QRCodeSVG value={url} size={180} level="M" includeMargin />
                  <p className="text-[10px] font-mono text-gray-500 text-center break-all">{url}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(url).then(() => alert('تم نسخ الرابط!')).catch(() => {})}
                      className="px-3 py-1.5 bg-white border border-green-200 rounded-lg text-[10px] text-green-700 hover:bg-green-50 transition-colors"
                    >
                      نسخ الرابط
                    </button>
                    <button
                      onClick={() => window.open(url, '_blank')}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-[10px] hover:bg-green-600 transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> فتح
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </TabsContent>

        <TabsContent value="barcode" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Barcode className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-gray-800">بناء QR داخلي</h3>
            </div>
            <span className="text-[10px] text-gray-400">تخصيص بنية QR الداخلي</span>
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 text-center">
            <p className="text-[10px] text-indigo-500 font-medium mb-1">معاينة</p>
            <p className="text-lg font-mono font-bold text-gray-800 tracking-wider">{barcodePreview}</p>
          </div>

          {/* Segments */}
          <div className="space-y-2">
            {barcodeSegments.map((seg, i) => (
              <div key={seg.id} className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-3">
                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <span className="text-[10px] text-gray-400 w-5">{i + 1}</span>

                <select
                  value={seg.type}
                  onChange={e => {
                    const newSegs = barcodeSegments.map((s, idx) =>
                      idx === i ? { ...s, type: e.target.value as BarcodeSegment['type'] } : s
                    );
                    setBarcodeSegments(newSegs);
                    setIsDirty(true);
                  }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 flex-shrink-0"
                >
                  <option value="type">النوع (PR, TP, AC, PD)</option>
                  <option value="year">السنة (2025)</option>
                  <option value="seq">تسلسل (000001)</option>
                  <option value="dim">القياس (طول+عرض+ارتفاع)</option>
                  <option value="partcode">كود القطعة (Revit)</option>
                  <option value="prodcode">كود المنتج</option>
                  <option value="custom">نص مخصص</option>
                </select>

                {seg.type === 'custom' && (
                  <Input
                    value={seg.value}
                    onChange={e => {
                      const newSegs = barcodeSegments.map((s, idx) =>
                        idx === i ? { ...s, value: e.target.value } : s
                      );
                      setBarcodeSegments(newSegs);
                      setIsDirty(true);
                    }}
                    placeholder="-"
                    className="text-xs w-16"
                  />
                )}

                {seg.type === 'seq' && (
                  <Input
                    type="number"
                    value={seg.length || 6}
                    onChange={e => {
                      const newSegs = barcodeSegments.map((s, idx) =>
                        idx === i ? { ...s, length: Number(e.target.value) } : s
                      );
                      setBarcodeSegments(newSegs);
                      setIsDirty(true);
                    }}
                    placeholder="6"
                    className="text-xs w-16"
                    min={1}
                    max={10}
                  />
                )}

                <span className="text-[10px] text-gray-400 flex-1 text-center">
                  {seg.type === 'type' && 'PR / TP / AC / PD'}
                  {seg.type === 'year' && String(new Date().getFullYear())}
                  {seg.type === 'seq' && `00000${1}`.slice(-(seg.length || 6))}
                  {seg.type === 'dim' && '1200800 (متصل)'}
                  {seg.type === 'partcode' && 'WALL-001 (كود القطعة)'}
                  {seg.type === 'prodcode' && 'PROD-001 (كود المنتج)'}
                  {seg.type === 'custom' && seg.value}
                </span>

                <button
                  onClick={() => {
                    const newSegs = barcodeSegments.filter((_, idx) => idx !== i);
                    setBarcodeSegments(newSegs);
                    setIsDirty(true);
                  }}
                  className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add segment */}
          <button
            onClick={() => {
              setBarcodeSegments([...barcodeSegments, { id: `s${Date.now()}`, type: 'custom', value: '-' }]);
              setIsDirty(true);
            }}
            className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 text-xs hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> إضافة جزء
          </button>

          {/* Legend */}
          <div className="bg-gray-50 rounded-xl p-3 text-[10px] text-gray-500 space-y-1">
            <p className="font-semibold text-gray-600 mb-1">دليل الأجزاء:</p>
            <p><span className="font-mono text-indigo-600">النوع</span> — PR (قطع), TP (توبات), AC (اكسسوارات), PD (منتجات)</p>
            <p><span className="font-mono text-indigo-600">السنة</span> — السنة الحالية (2025)</p>
            <p><span className="font-mono text-indigo-600">تسلسل</span> — رقم تلقائي متزايد (000001, 000002...)</p>
            <p><span className="font-mono text-indigo-600">القياس</span> — أبعاد متصلة بدون x (1200800)</p>
            <p><span className="font-mono text-indigo-600">كود القطعة</span> — كود Revit للقطعة (WALL001)</p>
            <p><span className="font-mono text-indigo-600">كود المنتج</span> — كود المنتج المُعرّف (PROD001)</p>
            <p><span className="font-mono text-indigo-600">نص مخصص</span> — أي فاصل أو نص ثابت (-, _, /)</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
