// ============================================================
// Users Page v12 — Admin Dashboard with Archive System
// Tabs: Users | Pending | Archive
// Archive: strips role, prevents login, separate list
// ============================================================

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePermissionStore } from '@/store/permissionStore';
import type { AppUser } from '@/types';
import {
  Search, Trash2, UserCheck, Users, Shield, UserX, Edit3, X,
  Archive, RotateCcw, UserPlus, Clock, AlertTriangle, CheckCircle,
  ChevronDown, Filter, ChevronRight
} from 'lucide-react';

const statusConfig: Record<string, { label: string; bg: string; dot: string; icon: any }> = {
  active:    { label: 'نشط',    bg: 'bg-emerald-50 text-emerald-700',  dot: 'bg-emerald-500', icon: CheckCircle },
  pending:   { label: 'بانتظار', bg: 'bg-amber-50 text-amber-700',    dot: 'bg-amber-500',   icon: Clock },
  suspended: { label: 'موقوف',  bg: 'bg-red-50 text-red-700',        dot: 'bg-red-500',     icon: UserX },
  archived:  { label: 'مؤرشف',  bg: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400',    icon: Archive },
};

type Tab = 'all' | 'pending' | 'archive';

export default function UsersPage() {
  const { user: currentUser, allUsers, pendingUsers, archivedUsers, approveUser, suspendUser, archiveUser, restoreUser, updateUserRole, deleteUserPermanently } = useAuthStore();
  const { roles } = usePermissionStore();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [showRoleModal, setShowRoleModal] = useState<AppUser | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState<AppUser | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<AppUser | null>(null);
  const [showDeletePermConfirm, setShowDeletePermConfirm] = useState<AppUser | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  // Detail drawer — shows user card with all actions inside
  const [detailUser, setDetailUser] = useState<AppUser | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'role'>('name');
  const [showSort, setShowSort] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const roleNames = Object.fromEntries(Object.values(roles).map(r => [r.id, r.name]));

  // Tab data
  const getList = () => {
    switch (tab) {
      case 'pending': return pendingUsers;
      case 'archive': return archivedUsers;
      default: return allUsers;
    }
  };

  const list = getList();
  const filtered = search.trim()
    ? list.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : list;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '', 'ar');
    if (sortBy === 'date') return (b.createdAt || '').localeCompare(a.createdAt || '');
    if (sortBy === 'role') return (a.role || '').localeCompare(b.role || '');
    return 0;
  });

  // Stats
  const stats = [
    { label: 'نشطون', value: allUsers.filter(u => u.status === 'active').length, color: 'bg-emerald-500', icon: CheckCircle },
    { label: 'بانتظار', value: pendingUsers.length, color: 'bg-amber-500', icon: Clock },
    { label: 'موقوفون', value: allUsers.filter(u => u.status === 'suspended').length, color: 'bg-red-500', icon: UserX },
    { label: 'الأرشيف', value: archivedUsers.length, color: 'bg-gray-400', icon: Archive },
  ];

  useEffect(() => {
    const unsub = usePermissionStore.getState().subscribeRoles();
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Shield className="w-16 h-16 text-amber-200 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-400">هذه الصفحة متاحة للمدير فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">

      {/* ═══════ Header Stats ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl ${s.color} bg-opacity-10 flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color.replace('bg-', 'text-')}`} />
              </div>
              <p className="text-[11px] text-gray-400 font-medium">{s.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ═══════ Search + Tabs + Sort ═══════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'all' as Tab, label: 'المستخدمون', count: allUsers.length, icon: Users },
            { key: 'pending' as Tab, label: 'بانتظار', count: pendingUsers.length, icon: UserPlus },
            { key: 'archive' as Tab, label: 'الأرشيف', count: archivedUsers.length, icon: Archive },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSearch(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-bold transition-all border-b-2 ${
                tab === t.key
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="p-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="البحث بالاسم أو البريد..."
              className="w-full h-10 pr-10 pl-8 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-right"
              dir="rtl"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setShowSort(!showSort)} className="h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span className="text-xs">ترتيب</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showSort && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg p-1 z-20 min-w-[120px]">
                {[
                  { key: 'name' as const, label: 'الاسم' },
                  { key: 'date' as const, label: 'التاريخ' },
                  { key: 'role' as const, label: 'الدور' },
                ].map(s => (
                  <button key={s.key} onClick={() => { setSortBy(s.key); setShowSort(false); }} className={`w-full text-right px-3 py-2 rounded-lg text-xs ${sortBy === s.key ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ User List ═══════ */}
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-base text-gray-400 font-medium">
              {tab === 'archive' ? 'لا يوجد مستخدمون مؤرشفون' : tab === 'pending' ? 'لا يوجد مستخدمون بانتظار' : 'لا يوجد مستخدمون'}
            </p>
          </div>
        ) : sorted.map((u) => {
          const s = statusConfig[u.status] || statusConfig.active;
          const StatusIcon = s.icon;
          const isSelf = u.id === currentUser?.id;

          return (
            <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer" onClick={() => setDetailUser(u)}>
              {/* Card body */}
              <div className="p-4 flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm">
                  {u.name?.charAt(0)?.toUpperCase() || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-bold text-gray-900">{u.name}</h3>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${s.bg} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                    {isSelf && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">أنت</span>}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{u.email}</p>

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg font-medium border border-gray-100">
                      {roleNames[u.role] || u.role}
                    </span>
                    {u.lastLogin && (
                      <span className="text-[11px] text-gray-400">
                        آخر دخول: {new Date(u.lastLogin).toLocaleDateString('ar-SA')}
                      </span>
                    )}
                    {u.archivedAt && (
                      <span className="text-[11px] text-gray-400">
                        أرشفة: {new Date(u.archivedAt).toLocaleDateString('ar-SA')}
                      </span>
                    )}
                    {u.previousRole && (
                      <span className="text-[11px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-lg">
                        الدور السابق: {roleNames[u.previousRole] || u.previousRole}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Arrow indicator — opens detail drawer */}
              <div className="px-4 pb-3 flex justify-end">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  اضغط للتفاصيل <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════ Archive Confirm Modal ═══════ */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={() => setShowArchiveConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-center mb-1">تأكيد الأرشفة</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              سيتم أرشفة <strong>{showArchiveConfirm.name}</strong> وإلغاء جميع صلاحيات الدخول.
              <br />
              <span className="text-red-500 text-xs">لن يتمكن من تسجيل الدخول مرة أخرى.</span>
            </p>
            <div className="bg-red-50 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 text-xs text-red-600">
                <Archive className="w-4 h-4" />
                <span>نقل إلى الأرشيف + حذف الصلاحيات</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowArchiveConfirm(null)} className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-colors">
                إلغاء
              </button>
              <button
                onClick={async () => {
                  await archiveUser(showArchiveConfirm.id);
                  setShowArchiveConfirm(null);
                }}
                className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
              >
                أرشفة نهائية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Restore Confirm Modal ═══════ */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={() => setShowRestoreConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-center mb-1">استعادة المستخدم</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              استعادة <strong>{showRestoreConfirm.name}</strong> مع إعادة تفعيل صلاحيات الدخول.
            </p>
            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <div className="text-xs text-blue-600">
                <p>الدور السابق: <strong>{roleNames[showRestoreConfirm.previousRole || ''] || showRestoreConfirm.previousRole || '—'}</strong></p>
                <p className="text-gray-400 mt-0.5">سيتم إعادة تفعيله كمستخدم نشط</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowRestoreConfirm(null)} className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-colors">
                إلغاء
              </button>
              <button
                onClick={async () => {
                  await restoreUser(showRestoreConfirm.id);
                  setShowRestoreConfirm(null);
                }}
                className="flex-1 h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors"
              >
                استعادة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Permanent Delete Confirm Modal ═══════ */}
      {showDeletePermConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={() => setShowDeletePermConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-center mb-1 text-red-600">حذف نهائي</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              سيتم حذف <strong>{showDeletePermConfirm.name}</strong> بشكل نهائي من النظام.
              <br />
              <span className="text-red-500 text-xs font-bold">لا يمكن التراجع عن هذا الإجراء.</span>
              <br />
              <span className="text-amber-500 text-xs">البريد سيتم حظره — لا يمكن إعادة التسجيل به.</span>
            </p>
            <div className="bg-red-50 rounded-xl p-3 mb-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-red-600">
                <Trash2 className="w-4 h-4" />
                <span>حذف من قاعدة البيانات</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-red-600">
                <Shield className="w-4 h-4" />
                <span>حظر البريد الإلكتروني بشكل دائم</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span>لا يمكن استعادة الحساب بعد الحذف</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeletePermConfirm(null)} className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-colors">
                إلغاء
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteUserPermanently(showDeletePermConfirm.id);
                    setShowDeletePermConfirm(null);
                  } catch (e: any) {
                    alert('فشل الحذف: ' + (e.message || 'خطأ غير معروف'));
                  }
                }}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Role Assignment Modal ═══════ */}
      {showRoleModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={() => setShowRoleModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()} dir="rtl">
            <h3 className="text-lg font-bold text-center mb-1">
              {showRoleModal.status === 'pending' ? 'موافقة وتعيين دور' : 'تعديل الدور'}
            </h3>
            <p className="text-sm text-gray-400 text-center mb-5">{showRoleModal.name} — {showRoleModal.email}</p>

            <p className="text-xs font-bold text-gray-500 mb-2">اختر الدور</p>
            <div className="space-y-1.5 mb-5 max-h-60 overflow-y-auto">
              {Object.values(roles).map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r.id)}
                  className={`w-full text-right px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                    selectedRole === r.id
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  <span>{r.name}</span>
                  {selectedRole === r.id && <CheckCircle className="w-4 h-4" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowRoleModal(null)} className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-colors">
                إلغاء
              </button>
              <button
                onClick={async () => {
                  if (!selectedRole) return;
                  if (showRoleModal.status === 'pending') {
                    await approveUser(showRoleModal.id, selectedRole);
                  } else {
                    await updateUserRole(showRoleModal.id, selectedRole);
                  }
                  setShowRoleModal(null);
                }}
                disabled={!selectedRole}
                className="flex-1 h-11 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {showRoleModal.status === 'pending' ? 'موافقة' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ User Detail Drawer (Bottom Sheet) ═══════ */}
      {detailUser && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40" onClick={() => setDetailUser(null)}>
          <div
            className="bg-white rounded-t-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* User header */}
            <div className="p-5 text-center border-b border-gray-50">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                {detailUser.name?.charAt(0) || '?'}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{detailUser.name}</h2>
              <p className="text-sm text-gray-400 mt-1">{detailUser.email}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                {(() => {
                  const s = statusConfig[detailUser.status] || statusConfig.active;
                  const isSelfUser = detailUser.id === currentUser?.id;
                  return (
                    <>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${s.bg} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                    {isSelfUser && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">أنت</span>}
                    </>
                  );
                })()}
                <span className="text-xs bg-gray-50 text-gray-500 px-3 py-1 rounded-full border border-gray-100">
                  {roleNames[detailUser.role] || detailUser.role}
                </span>
              </div>
            </div>

            {/* User info */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-1">تاريخ التسجيل</p>
                  <p className="text-xs font-bold text-gray-700">
                    {detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleDateString('ar-SA') : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-1">آخر دخول</p>
                  <p className="text-xs font-bold text-gray-700">
                    {detailUser.lastLogin ? new Date(detailUser.lastLogin).toLocaleDateString('ar-SA') : '—'}
                  </p>
                </div>
                {detailUser.archivedAt && (
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="text-[10px] text-red-400 mb-1">تاريخ الأرشفة</p>
                    <p className="text-xs font-bold text-red-600">
                      {new Date(detailUser.archivedAt).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                )}
                {detailUser.previousRole && (
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-[10px] text-amber-500 mb-1">الدور السابق</p>
                    <p className="text-xs font-bold text-amber-700">
                      {roleNames[detailUser.previousRole] || detailUser.previousRole}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 mb-3">الإجراءات</p>
                <div className="space-y-2">
                  {/* Pending → Approve */}
                  {detailUser.status === 'pending' && (
                    <button
                      onClick={() => { setDetailUser(null); setShowRoleModal(detailUser); setSelectedRole(''); }}
                      className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <UserCheck className="w-4 h-4" /> موافقة وتعيين دور
                    </button>
                  )}

                  {/* Active → Edit role / Suspend / Archive / Delete */}
                  {detailUser.status === 'active' && detailUser.id !== currentUser?.id && (
                    <>
                      <button
                        onClick={() => { setDetailUser(null); setShowRoleModal(detailUser); setSelectedRole(detailUser.role); }}
                        className="w-full h-11 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" /> تعديل الدور
                      </button>
                      <button
                        onClick={() => { if (confirm('تأكيد إيقاف المستخدم؟')) { suspendUser(detailUser.id); setDetailUser(null); } }}
                        className="w-full h-11 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <UserX className="w-4 h-4" /> إيقاف المستخدم
                      </button>
                      <button
                        onClick={() => { setDetailUser(null); setShowArchiveConfirm(detailUser); }}
                        className="w-full h-11 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Archive className="w-4 h-4" /> أرشفة المستخدم
                      </button>
                      <button
                        onClick={() => { setDetailUser(null); setShowDeletePermConfirm(detailUser); }}
                        className="w-full h-11 bg-gray-800 hover:bg-red-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> حذف نهائي
                      </button>
                    </>
                  )}

                  {/* Suspended → Activate / Archive */}
                  {detailUser.status === 'suspended' && detailUser.id !== currentUser?.id && (
                    <>
                      <button
                        onClick={() => { if (confirm('تأكيد إعادة تفعيل المستخدم؟')) { updateUserRole(detailUser.id, detailUser.role || 'analysis'); useAuthStore.getState().refreshUsers(); setDetailUser(null); } }}
                        className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> إعادة تفعيل
                      </button>
                      <button
                        onClick={() => { setDetailUser(null); setShowArchiveConfirm(detailUser); }}
                        className="w-full h-11 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Archive className="w-4 h-4" /> أرشفة
                      </button>
                    </>
                  )}

                  {/* Archived → Restore / Delete */}
                  {detailUser.status === 'archived' && (
                    <>
                      <button
                        onClick={() => { setDetailUser(null); setShowRestoreConfirm(detailUser); }}
                        className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" /> استعادة المستخدم
                      </button>
                      <button
                        onClick={() => { setDetailUser(null); setShowDeletePermConfirm(detailUser); }}
                        className="w-full h-11 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> حذف نهائي
                      </button>
                    </>
                  )}

                  {/* Self — no actions */}
                  {detailUser.id === currentUser?.id && (
                    <p className="text-center text-xs text-gray-400 py-4">لا يمكنك تعديل حسابك من هنا</p>
                  )}
                </div>
              </div>
            </div>

            {/* Close button */}
            <div className="p-4 border-t border-gray-100 sticky bottom-0 bg-white">
              <button
                onClick={() => setDetailUser(null)}
                className="w-full h-11 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
