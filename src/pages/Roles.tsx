// ============================================================
// Roles Page — إدارة الأدوار والصلاحيات (Admin فقط)
// ============================================================

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePermissionStore, ALL_PAGES } from '@/store/permissionStore';
import type { PermissionLevel, RoleDefinition } from '@/store/permissionStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Shield, Eye, Edit3, X, Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';

export default function Roles() {
  const { user } = useAuthStore();
  const { roles, addRole, updateRole, deleteRole } = usePermissionStore();
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [searchRole, setSearchRole] = useState('');

  // Subscribe to roles from Firestore
  useEffect(() => {
    const unsub = usePermissionStore.getState().subscribeRoles();
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  if (user?.role !== 'admin') {
    return (
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-8 text-center">
        <Shield className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm text-amber-700">هذه الصفحة متاحة للمدير فقط</p>
      </div>
    );
  }

  const roleList = Object.values(roles).filter(r =>
    r.name.toLowerCase().includes(searchRole.toLowerCase()) ||
    r.id.toLowerCase().includes(searchRole.toLowerCase())
  );

  const selectedRole = selectedRoleId ? roles[selectedRoleId] : null;

  // Toggle category expand
  const toggleCat = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">الأدوار والصلاحيات</h2>
              <p className="text-[10px] text-gray-400">إضافة أدوار جديدة وتحديد الصلاحيات لكل صفحة</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsNewOpen(true)} className="text-xs h-8" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            <Plus className="w-3.5 h-3.5 ml-1" /> دور جديد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Role List */}
        <div className="md:col-span-1 space-y-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchRole}
                onChange={(e) => setSearchRole(e.target.value)}
                placeholder="بحث عن دور..."
                className="text-xs pr-9 h-8"
              />
            </div>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {roleList.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    selectedRoleId === role.id
                      ? 'text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={selectedRoleId === role.id ? { background: 'linear-gradient(135deg, #667eea, #764ba2)' } : {}}
                >
                  <Shield className="w-4 h-4" />
                  <span className="flex-1">{role.name}</span>
                  <span className="text-[9px] opacity-60">{Object.values(role.perms).filter(p => p !== 'none').length} صفحة</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Role Details */}
        <div className="md:col-span-2">
          {selectedRole ? (
            <RoleEditor
              role={selectedRole}
              onSave={(updated) => { updateRole(updated); setSelectedRoleId(updated.id); }}
              onDelete={(id) => { deleteRole(id); setSelectedRoleId(''); }}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">اختر دوراً من القائمة لعرض وتحرير صلاحياته</p>
            </div>
          )}
        </div>
      </div>

      {/* New Role Dialog */}
      <NewRoleDialog
        open={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onCreate={(role) => { addRole(role); setIsNewOpen(false); setSelectedRoleId(role.id); }}
      />
    </div>
  );
}

// ─── Role Editor Component ───
function RoleEditor({ role, onSave, onDelete }: {
  role: RoleDefinition;
  onSave: (r: RoleDefinition) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(role.name);
  const [perms, setPerms] = useState<Record<string, PermissionLevel>>({ ...role.perms });
  const [isDirty, setIsDirty] = useState(false);

  // Reset when role changes
  useEffect(() => {
    setName(role.name);
    setPerms({ ...role.perms });
    setIsDirty(false);
  }, [role.id]);

  const setPerm = (pageId: string, level: PermissionLevel) => {
    setPerms(prev => ({ ...prev, [pageId]: level }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave({ ...role, name, perms });
    setIsDirty(false);
  };

  // Group pages by category
  const categories: Record<string, Array<{ id: string; name: string; category: string }>> = {};
  ALL_PAGES.forEach(p => {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push({ id: p.id, name: p.name, category: p.category });
  });

  const permIcons = {
    none: <X className="w-3 h-3 text-gray-400" />,
    view: <Eye className="w-3 h-3 text-blue-500" />,
    edit: <Edit3 className="w-3 h-3 text-green-500" />,
  };

  const permLabels: Record<PermissionLevel, string> = {
    none: 'ممنوع',
    view: 'عرض فقط',
    edit: 'تعديل',
  };

  const permColors: Record<PermissionLevel, string> = {
    none: 'bg-gray-50 text-gray-400 border-gray-200',
    view: 'bg-blue-50 text-blue-600 border-blue-200',
    edit: 'bg-green-50 text-green-600 border-green-200',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
      {/* Role Header */}
      <div className="flex items-center gap-3">
        <Input
          value={name}
          onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
          className="text-sm font-bold flex-1"
          placeholder="اسم الدور"
        />
        {isDirty && (
          <Button size="sm" onClick={handleSave} className="text-xs h-8 bg-green-600 hover:bg-green-700">
            <Save className="w-3.5 h-3.5 ml-1" /> حفظ
          </Button>
        )}
        {role.id !== 'admin' && (
          <Button size="sm" variant="outline" onClick={() => { if (confirm(`حذف دور "${name}"؟`)) onDelete(role.id); }} className="text-xs h-8 text-red-600 hover:bg-red-50 border-red-200">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Pages by Category */}
      <div className="space-y-3">
        {Object.entries(categories).map(([category, pages]) => (
          <div key={category} className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600">{category}</div>
            <div className="divide-y divide-gray-50">
              {pages.map(page => {
                const level = perms[page.id] || 'none';
                return (
                  <div key={page.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50/50">
                    <span className="text-xs font-medium text-gray-700">{page.name}</span>
                    <div className="flex items-center gap-1">
                      {(['none', 'view', 'edit'] as PermissionLevel[]).map(l => (
                        <button
                          key={l}
                          onClick={() => setPerm(page.id, l)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            level === l ? permColors[l] : 'bg-transparent text-gray-400 border-transparent hover:bg-gray-100'
                          }`}
                        >
                          {permIcons[l]}
                          {permLabels[l]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {isDirty && (
        <div className="sticky bottom-0 bg-white p-3 border-t flex justify-end">
          <Button size="sm" onClick={handleSave} className="text-xs h-8 bg-green-600 hover:bg-green-700">
            <Save className="w-3.5 h-3.5 ml-1" /> حفظ التغييرات
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── New Role Dialog ───
function NewRoleDialog({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (r: RoleDefinition) => void;
}) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [baseRole, setBaseRole] = useState('');
  const { roles } = usePermissionStore();

  const handleCreate = () => {
    if (!id.trim() || !name.trim()) return;
    // Create role ID from name: lowercase, no spaces, no special chars
    const roleId = id.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const basePerms = baseRole && roles[baseRole] ? { ...roles[baseRole].perms } : {};
    onCreate({
      id: roleId,
      name: name.trim(),
      perms: basePerms,
    });
    setId('');
    setName('');
    setBaseRole('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> إضافة دور جديد
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">كود الدور (بالإنجليزي)</label>
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="مثال: shipping_manager"
              className="text-xs"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">اسم الدور</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مسؤول شحنات"
              className="text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">نسخ صلاحيات من (اختياري)</label>
            <select
              value={baseRole}
              onChange={(e) => setBaseRole(e.target.value)}
              className="w-full h-9 text-xs rounded-md border border-input bg-background px-3"
            >
              <option value="">فارغ</option>
              {Object.values(roles).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleCreate} className="w-full text-xs h-9" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            <Plus className="w-3.5 h-3.5 ml-1" /> إنشاء الدور
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
