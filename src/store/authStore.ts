// ============================================================
// Auth Store — Firebase Auth + Firestore Sync
// ============================================================

import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, updateDoc, onSnapshot, query, where, limit, addDoc, startAfter, type QueryDocumentSnapshot, type DocumentData, orderBy } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import type { AppUser } from '@/types';

// ─── Pagination defaults ───
const DEFAULT_PAGE_SIZE = 100;

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: AppUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  init: () => () => void;
  clearError: () => void;
  approveUser: (uid: string, role: string) => Promise<void>;
  suspendUser: (uid: string) => Promise<void>;
  updateUserRole: (uid: string, role: string) => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;
  // Profile photo
  updatePhotoURL: (uid: string, photoURL: string) => Promise<void>;
  // Archive system
  archiveUser: (uid: string) => Promise<void>;
  restoreUser: (uid: string) => Promise<void>;
  // Permanent delete (Firestore + email block)
  deleteUserPermanently: (uid: string) => Promise<{ success: boolean; message: string }>;
  // Real-time user lists
  allUsers: AppUser[];
  pendingUsers: AppUser[];
  archivedUsers: AppUser[];
  refreshUsers: () => Promise<void>;
}

function tr(e: string): string {
  const m: Record<string, string> = {
    'auth/invalid-email': 'البريد غير صالح',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد',
    'auth/wrong-password': 'كلمة المرور غير صحيحة',
    'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
    'auth/email-already-in-use': 'هذا البريد مستخدم',
    'auth/weak-password': 'كلمة المرور ضعيفة (6 أحرف على الأقل)',
    'auth/network-request-failed': 'فشل الاتصال',
    'auth/too-many-requests': 'محاولات كثيرة',
    'auth/popup-closed-by-user': 'تم إغلاق النافذة',
    'auth/popup-blocked': 'تم حظر النافذة',
    'auth/unauthorized-domain': 'النطاق غير مسموح في Firebase Auth',
    'auth/account-exists-with-different-credential': 'الحساب موجود ببيانات مختلفة',
    'auth/internal-error': 'خطأ داخلي في Firebase',
    'permission-denied': 'لا يوجد صلاحية للكتابة في Firestore',
  };
  for (const [k, v] of Object.entries(m)) if (e.includes(k)) return v;
  return e;
}

// ─── SECURITY: Emergency admin list — EMPTY by default ───
// If you need runtime emergency admins, populate this from
// Firebase Remote Config (not hardcoded in client code).
const EMERGENCY_ADMIN_EMAILS: string[] = [];
function isEmergencyAdmin(email: string): boolean {
  return EMERGENCY_ADMIN_EMAILS.includes((email || '').toLowerCase().trim());
}

/**
 * Audit log helper — records every admin action into Firestore `auditLogs`.
 * This lives client-side for convenience; in production, consider
 * Cloud Functions for tamper-proof audit logging.
 */
async function logAudit(
  actorUid: string,
  actorName: string,
  actorEmail: string,
  action: string,
  targetUid: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      actorUid,
      actorName,
      actorEmail,
      action,
      targetUid,
      details: details || null,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[logAudit] Failed to write audit log:', e);
  }
}

/**
 * Require that the current user is an admin.
 * Throws an error if not authenticated or not an admin.
 */
function requireAdmin(user: AppUser | null): void {
  if (!user) {
    throw new Error('AUTH_REQUIRED: يجب تسجيل الدخول');
  }
  if (user.role !== 'admin') {
    throw new Error('ADMIN_REQUIRED: هذه العملية تتطلب صلاحيات مسؤول');
  }
  if (user.status !== 'active') {
    throw new Error('ACCOUNT_INACTIVE: الحساب غير نشط');
  }
}

async function syncUserFromFirestore(fbUser: FirebaseUser): Promise<AppUser> {
  const uid = fbUser.uid;
  const email = (fbUser.email || '').toLowerCase().trim();
  const forceAdmin = isEmergencyAdmin(email);

  // 0. Check if email is permanently blocked
  if (email) {
    const blockedSnap = await getDoc(doc(db, 'blockedEmails', email.replace(/\./g, '_')));
    if (blockedSnap.exists()) {
      console.log('[syncUserFromFirestore] Blocked email tried to login:', email);
      throw new Error('PERMANENTLY_BLOCKED');
    }
  }

  // 1. Try active users
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (userSnap.exists()) {
    const data = userSnap.data() as AppUser;
    // Sync Google photoURL if changed
    if (fbUser.photoURL && fbUser.photoURL !== data.photoURL) {
      await updateDoc(doc(db, 'users', uid), { photoURL: fbUser.photoURL, lastLogin: new Date().toISOString() });
      return { ...data, photoURL: fbUser.photoURL, lastLogin: new Date().toISOString() };
    }
    if (forceAdmin && (data.role !== 'admin' || data.status !== 'active')) {
      const fixed: AppUser = { ...data, role: 'admin' as const, status: 'active' as const, lastLogin: new Date().toISOString() };
      await setDoc(doc(db, 'users', uid), fixed, { merge: true });
      return fixed;
    }
    await updateDoc(doc(db, 'users', uid), { lastLogin: new Date().toISOString() });
    return { ...data, lastLogin: new Date().toISOString() };
  }

  // 2. Try pending users
  const pendingSnap = await getDoc(doc(db, 'pendingUsers', uid));
  if (pendingSnap.exists()) {
    const data = pendingSnap.data() as AppUser;
    if (forceAdmin) {
      const adminUser: AppUser = { ...data, role: 'admin' as const, status: 'active' as const, lastLogin: new Date().toISOString() };
      await setDoc(doc(db, 'users', uid), adminUser);
      return adminUser;
    }
    return data;
  }

  // 3. Try archived users — prevent login
  const archivedSnap = await getDoc(doc(db, 'archivedUsers', uid));
  if (archivedSnap.exists()) {
    throw new Error('ARCHIVED_USER');
  }

  // 4. New user
  const hasAdmin = await hasAdminUser();
  const isFirstAdmin = !hasAdmin || forceAdmin;

  const newUser: AppUser = {
    id: uid,
    email: fbUser.email || '',
    name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'مستخدم'),
    role: (isFirstAdmin ? 'admin' : 'pending') as AppUser['role'],
    status: (isFirstAdmin ? 'active' : 'pending') as AppUser['status'],
    ...(fbUser.photoURL ? { photoURL: fbUser.photoURL } : {}),
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  if (isFirstAdmin) {
    await setDoc(doc(db, 'users', uid), newUser);
  } else {
    await setDoc(doc(db, 'pendingUsers', uid), newUser);
  }
  return newUser;
}

async function hasAdminUser(): Promise<boolean> {
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin'), limit(1)));
    return !snap.empty;
  } catch { return false; }
}

/**
 * Paginated fetch helper — reads up to `pageSize` docs, optionally starting after `startAfterDoc`.
 * Returns { docs, lastDoc } so callers can paginate.
 */
async function fetchPage(
  collectionName: string,
  pageSize: number = DEFAULT_PAGE_SIZE,
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ docs: AppUser[]; lastDoc?: QueryDocumentSnapshot<DocumentData> }> {
  let q;
  if (startAfterDoc) {
    q = query(collection(db, collectionName), orderBy('createdAt', 'desc'), startAfter(startAfterDoc), limit(pageSize));
  } else {
    q = query(collection(db, collectionName), orderBy('createdAt', 'desc'), limit(pageSize));
  }
  const snap = await getDocs(q);
  const docs: AppUser[] = [];
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    docs.push({ ...data, id: d.id } as AppUser);
  });
  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  return { docs, lastDoc };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  user: null,
  isLoggedIn: false,
  isLoading: true,
  authError: null,
  allUsers: [],
  pendingUsers: [],
  archivedUsers: [],

  init: () => {
    set({ isLoading: true });

    // Safety timeout — force hide loading after 15s no matter what
    const safetyTimeout = setTimeout(() => {
      set({ isLoading: false });
    }, 15000);

    // Real-time sync for all 3 collections
    const unsubUsers = onSnapshot(collection(db, 'users'), () => get().refreshUsers(), () => {});
    const unsubPending = onSnapshot(collection(db, 'pendingUsers'), () => get().refreshUsers(), () => {});
    const unsubArchived = onSnapshot(collection(db, 'archivedUsers'), () => get().refreshUsers(), () => {});
    get().refreshUsers();

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        clearTimeout(safetyTimeout);
        set({ user: null, firebaseUser: null, isLoggedIn: false, isLoading: false });
        return;
      }
      try {
        const appUser = await syncUserFromFirestore(fbUser);
        clearTimeout(safetyTimeout);
        set({ firebaseUser: fbUser, user: appUser, isLoggedIn: true, isLoading: false, authError: null });
      } catch (e: any) {
        clearTimeout(safetyTimeout);
        if (e.message === 'PERMANENTLY_BLOCKED') {
          await firebaseSignOut(auth);
          set({ user: null, firebaseUser: null, isLoggedIn: false, isLoading: false, authError: 'هذا الحساب محظور بشكل دائم من النظام. تواصل مع المسؤول.' });
        } else if (e.message === 'ARCHIVED_USER') {
          await firebaseSignOut(auth);
          set({ user: null, firebaseUser: null, isLoggedIn: false, isLoading: false, authError: 'تم إلغاء صلاحية حسابك. تواصل مع المسؤول.' });
        } else {
          // On error, still set firebaseUser so UI can show error + logout option
          set({ firebaseUser: fbUser, user: null, isLoggedIn: true, isLoading: false, authError: tr(e.message || String(e)) });
        }
      }
    });
    return () => { clearTimeout(safetyTimeout); unsub(); unsubUsers(); unsubPending(); unsubArchived(); };
  },

  login: async (email, password) => {
    set({ isLoading: true, authError: null });
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      set({ isLoading: false, authError: tr(e.code || e.message) });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, authError: null });
    try {
      // Check if email is permanently blocked
      const normalizedEmail = email.toLowerCase().trim();
      const blockedSnap = await getDoc(doc(db, 'blockedEmails', normalizedEmail.replace(/\./g, '_')));
      if (blockedSnap.exists()) {
        throw new Error('PERMANENTLY_BLOCKED');
      }
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
    } catch (e: any) {
      if (e.message === 'PERMANENTLY_BLOCKED') {
        set({ isLoading: false, authError: 'هذا البريد محظور بشكل دائم. تواصل مع المسؤول.' });
      } else {
        set({ isLoading: false, authError: tr(e.code || e.message) });
      }
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, authError: null });
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      set({ isLoading: false, authError: tr(e.code || e.message) });
    }
  },

  logout: async () => {
    await firebaseSignOut(auth);
    set({ user: null, firebaseUser: null, isLoggedIn: false, authError: null });
  },

  clearError: () => set({ authError: null }),

  // ─── approveUser: admin only + audit log ───
  approveUser: async (uid: string, role: string) => {
    const currentUser = get().user;
    requireAdmin(currentUser);
    if (!currentUser) return;

    const snap = await getDoc(doc(db, 'pendingUsers', uid));
    if (!snap.exists()) throw new Error('User not found in pending');
    const data = snap.data() as AppUser;
    const approved: AppUser = { ...data, role: role as any, status: 'active', approvedAt: new Date().toISOString() };
    await setDoc(doc(db, 'users', uid), approved);
    await updateDoc(doc(db, 'pendingUsers', uid), { status: 'approved' });
    await logAudit(currentUser.id, currentUser.name, currentUser.email, 'approve', uid, { role });
    await get().refreshUsers();
  },

  // ─── suspendUser: admin only + audit log ───
  suspendUser: async (uid: string) => {
    const currentUser = get().user;
    requireAdmin(currentUser);
    if (!currentUser) return;

    await updateDoc(doc(db, 'users', uid), { status: 'suspended' });
    await logAudit(currentUser.id, currentUser.name, currentUser.email, 'suspend', uid, {});
    await get().refreshUsers();
  },

  // ─── updateUserRole: admin only + audit log ───
  updateUserRole: async (uid: string, role: string) => {
    const currentUser = get().user;
    requireAdmin(currentUser);
    if (!currentUser) return;

    await updateDoc(doc(db, 'users', uid), { role, updatedAt: new Date().toISOString() });
    await logAudit(currentUser.id, currentUser.name, currentUser.email, 'updateRole', uid, { role });
    await get().refreshUsers();
  },

  // ─── Archive user: admin only + audit log ───
  archiveUser: async (uid: string) => {
    const currentUser = get().user;
    requireAdmin(currentUser);
    if (!currentUser) return;

    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) return;
      const data = userSnap.data() as AppUser;
      const archived: AppUser = {
        ...data,
        status: 'archived',
        role: 'none',
        archivedAt: new Date().toISOString(),
        previousRole: data.role,
      };
      // 1. Save to archivedUsers FIRST
      await setDoc(doc(db, 'archivedUsers', uid), archived);
      // 2. Delete from active users (completely remove)
      await deleteDoc(doc(db, 'users', uid));
      // 3. Block login
      await setDoc(doc(db, 'blockedLogins', uid), { blockedAt: new Date().toISOString(), reason: 'archived' });
      // 4. Audit log
      await logAudit(currentUser.id, currentUser.name, currentUser.email, 'archive', uid, { previousRole: data.role });
      // 5. Force refresh
      await get().refreshUsers();
    } catch (e) {
      console.error('[archiveUser] error:', e);
      throw e;
    }
  },

  // ─── Restore user from archive: admin only + audit log ───
  restoreUser: async (uid: string) => {
    const currentUser = get().user;
    requireAdmin(currentUser);
    if (!currentUser) return;

    const archivedSnap = await getDoc(doc(db, 'archivedUsers', uid));
    if (!archivedSnap.exists()) return;
    const data = archivedSnap.data() as AppUser & { previousRole?: string };
    // Restore with previous role or default
    const restored: AppUser = {
      ...data,
      status: 'active',
      role: data.previousRole || 'analysis',
      restoredAt: new Date().toISOString(),
    };
    // Move back to active users
    await setDoc(doc(db, 'users', uid), restored);
    // Remove from archived
    await updateDoc(doc(db, 'archivedUsers', uid), { status: 'restored', restoredAt: new Date().toISOString() });
    // Remove blocked login marker
    try { await updateDoc(doc(db, 'blockedLogins', uid), { unblockedAt: new Date().toISOString() }); } catch {}
    await logAudit(currentUser.id, currentUser.name, currentUser.email, 'restore', uid, { role: restored.role });
    await get().refreshUsers();
  },

  deleteUser: async (uid: string) => {
    const currentUser = get().user;
    requireAdmin(currentUser);
    if (!currentUser) return;

    await updateDoc(doc(db, 'users', uid), { status: 'deleted', deletedAt: new Date().toISOString() });
    await logAudit(currentUser.id, currentUser.name, currentUser.email, 'delete', uid, {});
    await get().refreshUsers();
  },

  updatePhotoURL: async (uid: string, photoURL: string) => {
    await updateDoc(doc(db, 'users', uid), { photoURL, updatedAt: new Date().toISOString() });
    // Also update Firebase Auth profile
    const { updateProfile } = await import('firebase/auth');
    const { auth } = await import('@/firebase/config');
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { photoURL });
    }
    await get().refreshUsers();
  },

  // ─── Permanently delete user: admin only + audit log ───
  deleteUserPermanently: async (uid: string) => {
    const currentUser = get().user;
    requireAdmin(currentUser);
    if (!currentUser) return { success: false, message: 'غير مصرح' };

    try {
      // 1. Get user data from wherever it exists
      let userData: AppUser | null = null;
      const activeSnap = await getDoc(doc(db, 'users', uid));
      if (activeSnap.exists()) userData = activeSnap.data() as AppUser;
      const pendingSnap = await getDoc(doc(db, 'pendingUsers', uid));
      if (pendingSnap.exists()) userData = pendingSnap.data() as AppUser;
      const archivedSnap = await getDoc(doc(db, 'archivedUsers', uid));
      if (archivedSnap.exists()) userData = archivedSnap.data() as AppUser;

      if (!userData) throw new Error('User not found in any collection');

      const email = (userData.email || '').toLowerCase().trim();

      // 2. Delete from all collections simultaneously
      await Promise.all([
        deleteDoc(doc(db, 'users', uid)).catch(() => {}),
        deleteDoc(doc(db, 'pendingUsers', uid)).catch(() => {}),
        deleteDoc(doc(db, 'archivedUsers', uid)).catch(() => {}),
        deleteDoc(doc(db, 'blockedLogins', uid)).catch(() => {}),
      ]);

      // 3. Permanently block the email (can never re-register)
      if (email) {
        await setDoc(doc(db, 'blockedEmails', email.replace(/\./g, '_')), {
          email,
          uid,
          blockedAt: new Date().toISOString(),
          reason: 'permanently_deleted',
          deletedBy: currentUser.id,
        });
      }

      // 4. Audit log
      await logAudit(currentUser.id, currentUser.name, currentUser.email, 'deletePermanently', uid, { email });

      await get().refreshUsers();
      return { success: true, message: 'تم الحذف النهائي' };
    } catch (e: any) {
      console.error('[deleteUserPermanently] error:', e);
      throw e;
    }
  },

  // ─── refreshUsers: paginated with limit(100) ───
  refreshUsers: async () => {
    try {
      const { docs: allUsers } = await fetchPage('users', DEFAULT_PAGE_SIZE);
      const { docs: pendingUsers } = await fetchPage('pendingUsers', DEFAULT_PAGE_SIZE);
      const { docs: archivedUsers } = await fetchPage('archivedUsers', DEFAULT_PAGE_SIZE);

      // Filter: only include non-archived users in allUsers
      const filteredAllUsers = allUsers.filter((u) => u.status !== 'archived');
      const filteredPendingUsers = pendingUsers.filter((u) => u.status === 'pending');
      const filteredArchivedUsers = archivedUsers.filter((u) => u.status === 'archived');

      set({ allUsers: filteredAllUsers, pendingUsers: filteredPendingUsers, archivedUsers: filteredArchivedUsers });
    } catch (e) {
      console.error('[Auth] refreshUsers error:', e);
    }
  },
}));
