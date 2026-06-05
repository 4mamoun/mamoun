// ============================================================
// الملف الشخصي — Profile Page with Photo Management
// ============================================================

import { useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePermissionStore } from '@/store/permissionStore';
import { useImageUpload } from '@/hooks/useImageUpload';
import {
  User, Camera, Globe, Mail, Shield, Clock,
  CheckCircle, AlertTriangle, RefreshCw, ChevronRight,
  ImageIcon,
} from 'lucide-react';

export default function Profile() {
  const { user, firebaseUser, updatePhotoURL } = useAuthStore();
  const { canEdit, canView, canDelete } = usePermissionStore();
  const imgHook = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [saved, setSaved] = useState(false);

  // Handle image upload from hook
  if (imgHook.image && !imgHook.isCompressing) {
    // Auto-save when image is ready
    updatePhotoURL(user?.id || '', imgHook.image)
      .then(() => {
        imgHook.clearImage();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      })
      .catch(() => imgHook.clearImage());
  }

  const handleUseGooglePhoto = async () => {
    if (!firebaseUser?.photoURL || !user?.id) return;
    await updatePhotoURL(user.id, firebaseUser.photoURL);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setShowPhotoMenu(false);
  };

  const roleLabels: Record<string, string> = {
    admin: 'مدير النظام',
    analysis: 'مسؤول تحليل',
    warehouse: 'مسؤول مستودع',
    quality: 'مسؤول جودة',
    delivery_receiver: 'مسؤول استلام',
    installer: 'مثبت',
    pending: 'بانتظار الموافقة',
  };

  const statusConfig: Record<string, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
    active: { label: 'نشط', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
    suspended: { label: 'موقوف', bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
    archived: { label: 'مؤرشف', bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
    pending: { label: 'بانتظار الموافقة', bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
    deleted: { label: 'محذوف', bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertTriangle },
  };

  const status = statusConfig[user?.status || 'active'];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            الملف الشخصي
          </h1>
          <p className="text-xs text-gray-400 mt-1">إدارة البيانات الشخصية والصورة</p>
        </div>
        {saved && (
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> تم الحفظ
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Photo Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          {/* Photo */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mx-auto">
              {user?.photoURL || firebaseUser?.photoURL ? (
                <img
                  src={user?.photoURL || firebaseUser?.photoURL || ''}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
                  {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Camera button */}
            <button
              onClick={() => setShowPhotoMenu(!showPhotoMenu)}
              className="absolute bottom-0 left-0 w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
              title="تغيير الصورة"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Photo menu */}
          {showPhotoMenu && (
            <div className="mb-4 space-y-2 max-w-xs mx-auto">
              {firebaseUser?.photoURL && (
                <button
                  onClick={handleUseGooglePhoto}
                  className="w-full h-10 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Globe className="w-4 h-4" /> استخدام صورة Google
                </button>
              )}
              <label className="w-full h-10 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={imgHook.handleUpload}
                  ref={fileInputRef}
                />
                {imgHook.isCompressing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
                رفع صورة جديدة
              </label>
              <button
                onClick={() => setShowPhotoMenu(false)}
                className="w-full h-8 text-[10px] text-gray-400 hover:text-gray-600"
              >
                إلغاء
              </button>
            </div>
          )}

          {/* Name */}
          <h2 className="text-lg font-bold text-gray-900">{user?.name || 'مستخدم'}</h2>
          <p className="text-sm text-gray-400 mt-1">{user?.email}</p>

          {/* Status badges */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.bg} ${status.text} flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            <span className="text-xs bg-gray-50 text-gray-600 px-3 py-1 rounded-full border border-gray-100">
              {roleLabels[user?.role || 'pending'] || user?.role}
            </span>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              معلومات الحساب
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">البريد الإلكتروني</span>
              </div>
              <span className="text-xs font-medium text-gray-800">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">الدور</span>
              </div>
              <span className="text-xs font-medium text-gray-800">{roleLabels[user?.role || 'pending'] || user?.role}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">تاريخ التسجيل</span>
              </div>
              <span className="text-xs font-medium text-gray-800">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">آخر دخول</span>
              </div>
              <span className="text-xs font-medium text-gray-800">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-SA') : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">صورة Google</span>
              </div>
              <span className="text-xs font-medium text-gray-800">
                {firebaseUser?.photoURL ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> متاحة
                  </span>
                ) : (
                  <span className="text-gray-400">غير متاحة</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Permissions Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              الصلاحيات
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'parts', label: 'القطع' },
                { id: 'tops', label: 'التوبات' },
                { id: 'acc', label: 'الاكسسوارات' },
                { id: 'prods', label: 'المنتجات' },
                { id: 'projects', label: 'المشاريع' },
                { id: 'batches', label: 'الدفعات' },
                { id: 'warehouse', label: 'المستودع' },
                { id: 'quality', label: 'الجودة' },
                { id: 'reports', label: 'التقارير' },
                { id: 'settings', label: 'الإعدادات' },
              ].map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">{p.label}</span>
                  <span className={`font-medium ${canView(user?.role || '', p.id) ? 'text-green-600' : 'text-gray-300'}`}>
                    {canEdit(user?.role || '', p.id) ? 'تعديل' : canView(user?.role || '', p.id) ? 'عرض' : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
