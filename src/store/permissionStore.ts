import { create } from 'zustand';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

export type PermissionLevel = 'none' | 'view' | 'edit';

export interface RoleDefinition {
  id: string;
  name: string;
  perms: Record<string, PermissionLevel>;
}

export const ALL_PAGES = [
  { id: 'dash', name: 'الرئيسية', category: 'الرئيسية' },
  { id: 'parts', name: 'القطع', category: 'التعريفات' },
  { id: 'tops', name: 'التوبات', category: 'التعريفات' },
  { id: 'acc', name: 'الاكسسوارات', category: 'التعريفات' },
  { id: 'prods', name: 'المنتجات', category: 'التعريفات' },
  { id: 'projects', name: 'المشاريع', category: 'المشاريع' },
  { id: 'batches', name: 'الدفعات', category: 'المشاريع' },
  { id: 'warehouse', name: 'المستودع', category: 'المستودع' },
  { id: 'stock', name: 'حركة المواد', category: 'المستودع' },
  { id: 'containers', name: 'الكونتينرات', category: 'التصدير' },
  { id: 'packing', name: 'تعبئة الصناديق', category: 'التصدير' },
  { id: 'packing-list-report', name: 'باكنج ليست', category: 'التقارير' },
  { id: 'shipments', name: 'الشحنات', category: 'التصدير' },
  { id: 'quality', name: 'الجودة', category: 'الجودة' },
  { id: 'accessory-docs', name: 'توثيق الاكسسوارات', category: 'الجودة' },
  { id: 'reports', name: 'التقارير والطباعة', category: 'التقارير' },
  { id: 'delivery', name: 'استلام الشحنات', category: 'الاستلام والتركيب' },
  { id: 'installation', name: 'التركيب', category: 'الاستلام والتركيب' },
  { id: 'users', name: 'المستخدمين', category: 'الإدارة' },
  { id: 'roles', name: 'الأدوار والصلاحيات', category: 'الإدارة' },
  { id: 'settings', name: 'الإعدادات', category: 'الحساب' },
  { id: 'profile', name: 'الملف الشخصي', category: 'الحساب' },
] as const;

// ─── Default Roles (fallback before Firestore loads) ───
const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  admin: {
    id: 'admin',
    name: 'مدير النظام',
    perms: Object.fromEntries(ALL_PAGES.map(p => [p.id, 'edit' as PermissionLevel])),
  },
  analysis: {
    id: 'analysis',
    name: 'مسؤول تحليل',
    perms: {
      dash: 'edit', parts: 'edit', tops: 'edit', acc: 'edit', prods: 'edit',
      projects: 'edit', batches: 'edit', quality: 'edit', reports: 'edit',
      'accessory-docs': 'edit', packing: 'view', containers: 'view',
      'packing-list-report': 'view', shipments: 'view', warehouse: 'view',
      stock: 'view', profile: 'edit',
      // NOTE: NO settings, NO users, NO roles — admin only
    },
  },
  warehouse: {
    id: 'warehouse',
    name: 'مسؤول مستودع',
    perms: {
      dash: 'edit', warehouse: 'edit', stock: 'edit', containers: 'edit',
      packing: 'edit', shipments: 'edit', 'packing-list-report': 'edit',
      reports: 'edit', delivery: 'edit', profile: 'edit',
      parts: 'view', projects: 'view', batches: 'view', quality: 'view',
      'accessory-docs': 'view',
    },
  },
  quality: {
    id: 'quality',
    name: 'مسؤول جودة',
    perms: {
      dash: 'edit', quality: 'edit', 'accessory-docs': 'edit', reports: 'edit',
      'packing-list-report': 'view', containers: 'view', projects: 'view',
      batches: 'view', profile: 'edit',
    },
  },
  delivery_receiver: {
    id: 'delivery_receiver',
    name: 'مسؤول استلام',
    perms: {
      dash: 'edit', delivery: 'edit', containers: 'view', packing: 'view',
      'packing-list-report': 'view', quality: 'view', reports: 'view',
      profile: 'edit',
    },
  },
  installer: {
    id: 'installer',
    name: 'عامل تركيب',
    perms: {
      dash: 'edit', installation: 'edit', projects: 'view', profile: 'edit',
    },
  },
};

export const NAV_STRUCTURE = [
  { category: 'التعريفات', items: [
    { id: 'parts', label: 'القطع', icon: 'Cog', perm: 'parts' },
    { id: 'tops', label: 'التوبات', icon: 'Square', perm: 'tops' },
    { id: 'acc', label: 'الاكسسوارات', icon: 'Layers', perm: 'acc' },
    { id: 'prods', label: 'المنتجات', icon: 'Box', perm: 'prods' },
  ]},
  { category: 'المشاريع', items: [
    { id: 'projects', label: 'المشاريع', icon: 'Building2', perm: 'projects' },
    { id: 'batches', label: 'الدفعات', icon: 'Layers', perm: 'batches' },
  ]},
  { category: 'المستودع', items: [
    { id: 'warehouse', label: 'المستودع', icon: 'Warehouse', perm: 'warehouse' },
  ]},
  { category: 'المتابعة', items: [
    { id: 'follow-up', label: 'متابعة المشاريع', icon: 'TrendingUp', perm: 'dash' },
    { id: 'notes-summary', label: 'ملخص الملاحظات', icon: 'StickyNote', perm: 'dash' },
  ]},
  { category: 'التصدير', items: [
    { id: 'packing', label: 'تعبئة الصناديق', icon: 'Package', perm: 'packing' },
    { id: 'containers', label: 'الكونتينرات', icon: 'Truck', perm: 'containers' },
    { id: 'shipments', label: 'الشحنات', icon: 'Ship', perm: 'shipments' },
  ]},
  { category: 'الاستلام والتركيب', items: [
    { id: 'delivery', label: 'استلام الشحنات', icon: 'ClipboardCheck', perm: 'delivery' },
    { id: 'installation', label: 'التركيب', icon: 'Wrench', perm: 'installation' },
  ]},
  { category: 'الجودة', items: [
    { id: 'quality', label: 'الجودة', icon: 'Shield', perm: 'quality' },
    { id: 'accessory-docs', label: 'توثيق الاكسسوارات', icon: 'Camera', perm: 'accessory-docs' },
  ]},
  { category: 'التقارير', items: [
    { id: 'packing-list-report', label: 'باكنج ليست', icon: 'FileSpreadsheet', perm: 'packing-list-report' },
    { id: 'reports', label: 'التقارير والطباعة', icon: 'BarChart3', perm: 'reports' },
  ]},
  { category: 'الإدارة', items: [
    { id: 'users', label: 'المستخدمين', icon: 'Users', perm: 'users' },
    { id: 'roles', label: 'الأدوار والصلاحيات', icon: 'Shield', perm: 'roles' },
  ]},
  { category: 'الحساب', items: [
    { id: 'settings', label: 'الإعدادات', icon: 'Settings', perm: 'settings' },
    { id: 'profile', label: 'الملف الشخصي', icon: 'User', perm: 'profile' },
  ]},
] as const;

interface PermissionStore {
  roles: Record<string, RoleDefinition>;
  loaded: boolean;
  ROLE_NAMES: Record<string, string>;
  NAV_STRUCTURE: typeof NAV_STRUCTURE;
  getLevel: (role: string, page: string) => PermissionLevel;
  canView: (role: string, page: string) => boolean;
  canEdit: (role: string, page: string) => boolean;
  canDelete: (role?: string) => boolean;
  getRoleName: (role: string) => string;
  getAvailablePages: (role: string) => any[];
  addRole: (role: RoleDefinition) => Promise<void>;
  updateRole: (role: RoleDefinition) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  loadRoles: () => Promise<void>;
  subscribeRoles: () => (() => void);
}

export const usePermissionStore = create<PermissionStore>((set, get) => ({
  roles: { ...DEFAULT_ROLES },
  loaded: false,
  ROLE_NAMES: {},
  NAV_STRUCTURE,

  getLevel: (role, page) => {
    if (role === 'admin') return 'edit';
    const r = get().roles[role];
    if (!r) return 'none';
    return r.perms[page] || 'none';
  },

  canView: (role, page) => {
    if (role === 'admin') return true;
    const r = get().roles[role];
    if (!r) return false;
    const level = r.perms[page];
    return level === 'view' || level === 'edit';
  },

  canEdit: (role, page) => {
    if (role === 'admin') return true;
    const r = get().roles[role];
    if (!r) return false;
    return r.perms[page] === 'edit';
  },

  canDelete: (role?: string) => (role || '') === 'admin',

  getRoleName: (role) => {
    if (role === 'admin') return 'مدير النظام';
    return get().roles[role]?.name || role;
  },

  getAvailablePages: (role) => {
    if (role === 'admin') return [...ALL_PAGES];
    const r = get().roles[role];
    if (!r) return [];
    return ALL_PAGES.filter(p => {
      const level = r.perms[p.id];
      return level === 'view' || level === 'edit';
    });
  },

  // ─── Load roles from Firestore ───
  loadRoles: async () => {
    try {
      const snap = await getDoc(doc(db, 'app', 'roles'));
      if (!snap.exists()) {
        // First time — save defaults to Firestore
        console.log('[PermissionStore] No roles in Firestore — saving defaults');
        await setDoc(doc(db, 'app', 'roles'), DEFAULT_ROLES);
        set({ roles: { ...DEFAULT_ROLES }, loaded: true });
        return;
      }
      const data = snap.data() as Record<string, RoleDefinition>;
      // Filter out non-role entries (in case of corruption)
      const roles: Record<string, RoleDefinition> = {};
      Object.entries(data).forEach(([key, val]) => {
        if (val && typeof val === 'object' && val.id && val.name) {
          roles[key] = val;
        }
      });
      console.log(`[PermissionStore] Loaded ${Object.keys(roles).length} roles from Firestore`);
      set({ roles, loaded: true });
    } catch (e) {
      console.warn('[PermissionStore] Failed to load roles, using defaults:', e);
      set({ roles: { ...DEFAULT_ROLES }, loaded: true });
    }
  },

  // ─── Real-time sync (uses single doc to avoid index issues) ───
  subscribeRoles: () => {
    const unsub = onSnapshot(doc(db, 'app', 'roles'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Record<string, RoleDefinition>;
        // Data stored as { roleId: RoleDefinition, ... }
        const roles: Record<string, RoleDefinition> = {};
        Object.entries(data).forEach(([key, val]) => {
          if (val && typeof val === 'object' && val.id) {
            roles[key] = val;
          }
        });
        if (Object.keys(roles).length > 0) {
          set({ roles });
        }
      }
    });
    return unsub;
  },

  // ─── Add new role ───
  addRole: async (role) => {
    const snap = await getDoc(doc(db, 'app', 'roles'));
    const existing = snap.exists() ? (snap.data() as Record<string, RoleDefinition>) : {};
    await setDoc(doc(db, 'app', 'roles'), { ...existing, [role.id]: role });
    console.log('[PermissionStore] Added role:', role.id);
  },

  // ─── Update role ───
  updateRole: async (role) => {
    const snap = await getDoc(doc(db, 'app', 'roles'));
    const existing = snap.exists() ? (snap.data() as Record<string, RoleDefinition>) : {};
    await setDoc(doc(db, 'app', 'roles'), { ...existing, [role.id]: role });
    console.log('[PermissionStore] Updated role:', role.id);
  },

  // ─── Delete role ───
  deleteRole: async (roleId) => {
    if (roleId === 'admin') return; // can't delete admin
    const snap = await getDoc(doc(db, 'app', 'roles'));
    if (snap.exists()) {
      const data = snap.data() as Record<string, RoleDefinition>;
      delete data[roleId];
      await setDoc(doc(db, 'app', 'roles'), data);
    }
    console.log('[PermissionStore] Deleted role:', roleId);
  },
}));

// ─── Computed: ROLE_NAMES from current roles ───
export function getRoleNames(roles: Record<string, RoleDefinition>): Record<string, string> {
  return Object.fromEntries(Object.entries(roles).map(([k, v]) => [k, v.name]));
}

// Legacy exports — these use the actual Zustand store, not hardcoded values
export { NAV_STRUCTURE as getNavStructure };

// NOTE: Do NOT use these directly in components.
// Use: const { canEdit, canView } = usePermissionStore(); instead.
// isAdmin must check the current user's role from authStore.
export const isAdmin = (role?: string) => role === 'admin';
