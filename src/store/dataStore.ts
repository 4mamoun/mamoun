// ============================================================
// Data Store — Firestore ONLY, no localStorage cache
// All data is cloud-first, synced across all devices
// ============================================================

import { create } from 'zustand';
import {
  doc, setDoc, getDoc, getDocs, collection, deleteDoc, onSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import type {
  Part, Top, Accessory, Product, Project, Batch,
  Container, Pallet, Box, Movement, RejectedItem, Inspection,
  ProductInstallation,
  AppSettings, AppUser,
} from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'شركة الإنتاج والشحن',
  defaultLang: 'ar',
  timezone: 'UTC+3',
  dateFormat: 'YYYY-MM-DD',
  currency: 'USD',
  forcePasswordChange: true,
  approvalRequired: true,
  minPasswordLength: 8,
  sessionTimeout: 30,
  maxBoxesPerContainer: 100,
  maxPalletsPerContainer: 10,
  autoCreateContainer: true,
  barcodeSegments: [
    { id: 's1', type: 'type', value: 'TYPE' },
    { id: 's2', type: 'custom', value: '-' },
    { id: 's3', type: 'year', value: 'YEAR' },
    { id: 's4', type: 'custom', value: '-' },
    { id: 's5', type: 'seq', value: '000001', length: 6 },
  ],
};

// ─── Default collections list ───
const DEFAULT_COLLECTIONS = [
  'parts', 'tops', 'accessories', 'products', 'projects', 'batches',
  'containers', 'pallets', 'boxes', 'movements', 'rejected',
  'inspections', 'stockTransactions', 'installations',
];

// ─── Required fields per collection for validation ───
const REQUIRED_FIELDS: Record<string, string[]> = {
  parts: ['id', 'name'],
  tops: ['id', 'name'],
  accessories: ['id', 'name'],
  products: ['id', 'name'],
  projects: ['id', 'name'],
  batches: ['id', 'name'],
  containers: ['id', 'name'],
  pallets: ['id', 'name'],
  boxes: ['id', 'name'],
  movements: ['id', 'type'],
  rejected: ['id', 'reason'],
  inspections: ['id', 'status'],
  stockTransactions: ['id', 'itemId', 'type'],
  installations: ['id', 'productId'],
};

function arrUpdate<T extends { id: string }>(arr: T[], id: string, patch: Partial<T>): T[] {
  return arr.map(x => x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } as T : x);
}
function arrRemove<T extends { id: string }>(arr: T[], id: string): T[] {
  return arr.filter(x => x.id !== id);
}

// ─── Firestore helpers — CLOUD ONLY, NO localStorage ───
/**
 * Firestore rejects: undefined, functions, Date objects
 * Simple approach: delete keys where value === undefined
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const cleaned: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      cleaned[k] = typeof v === 'object' ? sanitizeForFirestore(v) : v;
    }
  }
  return cleaned;
}

/** Deep-check every field for Firestore compatibility */
function deepCheck(obj: any, path = ''): string[] {
  const issues: string[] = [];
  if (obj === undefined) { issues.push(`${path}=undefined`); return issues; }
  if (obj === null) return issues;
  const t = typeof obj;
  if (t === 'function') { issues.push(`${path}=function`); return issues; }
  if (t === 'symbol') { issues.push(`${path}=symbol`); return issues; }
  if (t === 'bigint') { issues.push(`${path}=bigint`); return issues; }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => issues.push(...deepCheck(v, `${path}[${i}]`)));
  } else if (t === 'object') {
    for (const [k, v] of Object.entries(obj)) issues.push(...deepCheck(v, path ? `${path}.${k}` : k));
  }
  return issues;
}

// ─── Validation helper ───
/**
 * Validate input data before saving to Firestore.
 * Checks that id exists and is non-empty, and that required fields are present.
 * Returns { valid: true } if all checks pass, or { valid: false, errors: string[] } otherwise.
 */
function validateInput(col: string, data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data must be a non-null object');
    return { valid: false, errors };
  }

  // Check id exists and is non-empty
  if (!data.id || typeof data.id !== 'string' || data.id.trim() === '') {
    errors.push('id is required and must be a non-empty string');
  }

  // Check required fields for this collection
  const required = REQUIRED_FIELDS[col];
  if (required) {
    for (const field of required) {
      if (field === 'id') continue; // already checked above
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        // Auto-fill missing name for old boxes
        if (col === 'boxes' && field === 'name' && data.num) {
          data[field] = `صندوق ${data.num}`;
          continue;
        }
        errors.push(`Required field "${field}" is missing or empty`);
      }
    }
  }

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

// ─── Retry helper with exponential backoff ───
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3,
  baseDelay = 500,
): Promise<{ success: boolean; result?: T; error?: string }> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return { success: true, result };
    } catch (e: any) {
      lastError = e;
      const isLastAttempt = attempt === maxRetries;
      if (isLastAttempt) break;
      const delay = baseDelay * Math.pow(2, attempt - 1); // 500, 1000, 2000
      console.warn(`[${operationName}] ⚠️ Attempt ${attempt} failed (${e.code || e.message}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return { success: false, error: lastError?.code || lastError?.message || String(lastError) };
}

async function fsSave(col: string, id: string, data: any): Promise<boolean> {
  // Pre-validate input
  const validation = validateInput(col, data);
  if (!validation.valid) {
    console.error(`[fsSave] 🚫 ${col}/${id} validation failed:`, validation.errors);
    return false;
  }

  // Pre-flight check for Firestore compatibility
  let dataToSave = data;
  const issues = deepCheck(data);
  if (issues.length > 0) {
    console.warn(`[fsSave] ⚠️ ${col}/${id} pre-flight issues found, sanitizing:`, issues);
    dataToSave = sanitizeForFirestore(data);
  }

  const { success, error } = await withRetry(
    () => setDoc(doc(db, col, id), dataToSave, { merge: true }),
    `fsSave(${col}/${id})`,
    3,
    500,
  );

  if (success) {
    console.log(`[fsSave] ✅ ${col}/${id} saved to Cloud`);
    return true;
  } else {
    console.error(`[fsSave] ❌ ${col}/${id} failed after 3 retries:`, error);
    console.error(`[fsSave] 📋 keys:`, Object.keys(dataToSave));
    console.error(`[fsSave] 📋 data:`, JSON.stringify(dataToSave, null, 2));
    return false;
  }
}

async function fsDel(col: string, id: string): Promise<boolean> {
  const { success, error } = await withRetry(
    () => deleteDoc(doc(db, col, id)),
    `fsDel(${col}/${id})`,
    3,
    500,
  );

  if (success) {
    console.log(`[fsDel] ✅ ${col}/${id} deleted from Cloud`);
    return true;
  } else {
    console.error(`[fsDel] ❌ ${col}/${id}:`, error);
    return false;
  }
}

// ─── Stock Card Transaction ───
export interface StockTransaction {
  id: string;
  itemId: string;           // part/top/accessory ID
  itemType: 'part' | 'top' | 'accessory' | 'product';
  itemName: string;
  itemCode: string;
  type: 'in' | 'out' | 'adj' | 'return' | 'reserve' | 'release' | 'shipment';
  qty: number;
  beforeQty: number;
  afterQty: number;
  reason: string;
  refId?: string;           // batchId, containerId, etc.
  refType?: string;         // 'batch', 'container', 'adjustment'
  refName?: string;
  userName?: string;
  date: string;
  createdAt: string;
}

interface DataState {
  parts: Part[]; tops: Top[]; accessories: Accessory[]; products: Product[];
  projects: Project[]; batches: Batch[]; containers: Container[];
  pallets: Pallet[]; boxes: Box[]; movements: Movement[];
  rejected: RejectedItem[]; inspections: Inspection[];
  stockTransactions: StockTransaction[];
  installations: ProductInstallation[];
  settings: AppSettings;
  isLoading: boolean;
  cloudConnected: boolean;
  cloudError: string | null;
  // Actions
  addPart: (p: Part) => Promise<boolean>; updatePart: (id: string, p: Partial<Part>) => Promise<boolean>; deletePart: (id: string) => Promise<boolean>;
  addTop: (t: Top) => Promise<boolean>; updateTop: (id: string, t: Partial<Top>) => Promise<boolean>; deleteTop: (id: string) => Promise<boolean>;
  addAccessory: (a: Accessory) => Promise<boolean>; updateAccessory: (id: string, a: Partial<Accessory>) => Promise<boolean>; deleteAccessory: (id: string) => Promise<boolean>;
  addProduct: (p: Product) => Promise<boolean>; updateProduct: (id: string, p: Partial<Product>) => Promise<boolean>; deleteProduct: (id: string) => Promise<boolean>;
  addProject: (p: Project) => Promise<boolean>; updateProject: (id: string, p: Partial<Project>) => Promise<boolean>; deleteProject: (id: string) => Promise<boolean>;
  addBatch: (b: Batch) => Promise<boolean>; updateBatch: (id: string, b: Partial<Batch>) => Promise<boolean>; deleteBatch: (id: string) => Promise<boolean>;
  addContainer: (c: Container) => Promise<boolean>; updateContainer: (id: string, c: Partial<Container>) => Promise<boolean>; deleteContainer: (id: string) => Promise<boolean>; archiveContainer: (id: string, userName?: string) => Promise<boolean>;
  addPallet: (p: Pallet) => Promise<boolean>; updatePallet: (id: string, p: Partial<Pallet>) => Promise<boolean>; deletePallet: (id: string) => Promise<boolean>;
  addBox: (b: Box) => Promise<boolean>; updateBox: (id: string, b: Partial<Box>) => Promise<boolean>; deleteBox: (id: string) => Promise<boolean>;
  addMovement: (m: Movement) => Promise<boolean>;
  addRejected: (r: RejectedItem) => Promise<boolean>; updateRejected: (id: string, r: Partial<RejectedItem>) => Promise<boolean>; deleteRejected: (id: string) => Promise<boolean>;
  addInspection: (i: Inspection) => Promise<boolean>; updateInspection: (id: string, i: Partial<Inspection>) => Promise<boolean>; deleteInspection: (id: string) => Promise<boolean>;
  // ─── Installation (v9.0) ───
  addInstallation: (inst: ProductInstallation) => Promise<boolean>;
  updateInstallation: (id: string, patch: Partial<ProductInstallation>) => Promise<boolean>;
  deleteInstallation: (id: string) => Promise<boolean>;
  setSettings: (s: Partial<AppSettings>) => Promise<boolean>;
  // Stock Card
  addStockTransaction: (t: StockTransaction) => Promise<boolean>;
  getStockCard: (itemId: string, itemType?: string) => StockTransaction[];
  _createStockTx: (itemId: string, itemType: 'part' | 'top' | 'accessory', itemName: string, itemCode: string, type: StockTransaction['type'], qty: number, beforeQty: number, afterQty: number, reason: string, refId?: string, refType?: string, refName?: string, userName?: string) => Promise<boolean>;
  // Reserve stock when packing (حجز)
  reserveStock: (itemId: string, itemType: 'part' | 'top' | 'accessory', itemName: string, itemCode: string, qty: number, boxName: string, userName?: string) => Promise<boolean>;
  // Release stock when removed from box (إلغاء حجز)
  releaseStock: (itemId: string, itemType: 'part' | 'top' | 'accessory', itemName: string, itemCode: string, qty: number, boxName: string, userName?: string) => Promise<boolean>;
  // Deduct stock when shipment sent (صرف)
  deductStockForShipment: (containerId: string, containerName: string, userName: string) => Promise<{ success: boolean; message: string; deducted: number }>;
  // Legacy
  deductStockForBatch: (batchId: string, batchName: string, userName: string) => Promise<{ success: boolean; message: string; deducted: number }>;
  // Cloud
  checkConnection: () => Promise<boolean>;
  initFromFirestore: () => Promise<void>;
  subscribeToFirestore: (collections?: string[]) => (() => void);
  clearAll: (userRole: string) => Promise<boolean>;
  getLowStockParts: () => Part[];
}

export const useDataStore = create<DataState>((set, get) => ({
  parts: [], tops: [], accessories: [], products: [],
  projects: [], batches: [], containers: [],
  pallets: [], boxes: [], movements: [],
  rejected: [], inspections: [], stockTransactions: [],
  installations: [],
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  cloudConnected: false,
  cloudError: null,

  // ─── Check Firestore connection ───
  checkConnection: async () => {
    try {
      await getDoc(doc(db, 'app', 'ping'));
      set({ cloudConnected: true, cloudError: null });
      return true;
    } catch (e: any) {
      console.error('[DataStore] ❌ Firestore connection failed:', e.code, e.message);
      set({ cloudConnected: false, cloudError: e.code || e.message });
      return false;
    }
  },

  // ─── Init — load from Firestore in parallel ───
  initFromFirestore: async () => {
    console.log('[DataStore] 🔄 Loading from Firestore (parallel)...');
    set({ isLoading: true });
    let loadedCount = 0;

    const colDefs = [
      { name: 'parts', key: 'parts' },
      { name: 'tops', key: 'tops' },
      { name: 'accessories', key: 'accessories' },
      { name: 'products', key: 'products' },
      { name: 'projects', key: 'projects' },
      { name: 'batches', key: 'batches' },
      { name: 'containers', key: 'containers' },
      { name: 'pallets', key: 'pallets' },
      { name: 'boxes', key: 'boxes' },
      { name: 'movements', key: 'movements' },
      { name: 'rejected', key: 'rejected' },
      { name: 'inspections', key: 'inspections' },
      { name: 'stockTransactions', key: 'stockTransactions' },
      { name: 'installations', key: 'installations' },
    ];

    // Load all collections in parallel using Promise.allSettled
    const collectionPromises = colDefs.map(async (col) => {
      try {
        const snap = await getDocs(collection(db, col.name));
        const items: any[] = [];
        snap.forEach(d => {
          const data = d.data();
          // Ensure id is always present — use doc id as fallback
          items.push({ id: d.id, ...data });
        });
        if (items.length > 0) {
          set({ [col.key as keyof DataState]: items } as any);
          loadedCount += items.length;
          console.log(`[DataStore] ✅ ${col.name}: ${items.length} items loaded`);
        }
        return { name: col.name, status: 'success', count: items.length } as const;
      } catch (e: any) {
        console.error(`[DataStore] ❌ ${col.name}:`, e.code || e.message);
        return { name: col.name, status: 'error', error: e.code || e.message } as const;
      }
    });

    const results = await Promise.allSettled(collectionPromises);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    if (rejected.length > 0) {
      console.warn(`[DataStore] ⚠️ ${rejected.length} collection(s) failed to load`);
    }
    console.log(`[DataStore] 📊 Collections loaded: ${fulfilled.length}/${colDefs.length}`);

    // Load settings separately
    try {
      const s = await getDoc(doc(db, 'app', 'settings'));
      if (s.exists()) set({ settings: { ...DEFAULT_SETTINGS, ...s.data() as AppSettings } });
    } catch (e: any) {
      console.error('[DataStore] ❌ settings:', e.code || e.message);
    }

    console.log(`[DataStore] 📊 Total loaded: ${loadedCount} items`);
    if (loadedCount > 0) {
      set({ cloudConnected: true, cloudError: null, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  // ─── Real-time sync ───
  subscribeToFirestore: (collections?: string[]) => {
    const colsToSubscribe = collections && collections.length > 0 ? collections : DEFAULT_COLLECTIONS;
    console.log('[DataStore] 🔄 Starting real-time sync for:', colsToSubscribe.join(', '));
    const unsubs: (() => void)[] = [];

    for (const colName of colsToSubscribe) {
      const unsub = onSnapshot(
        collection(db, colName),
        (snap) => {
          const items: any[] = [];
          snap.forEach(d => {
            const data = d.data();
            // Ensure id is always present — use doc id as fallback
            items.push({ id: d.id, ...data });
          });
          set({ [colName as keyof DataState]: items } as any);
          console.log(`[DataStore] 🔔 ${colName}: ${items.length} items synced`);
        },
        (err) => {
          console.error(`[DataStore] ❌ onSnapshot ${colName}:`, err.code, err.message);
        }
      );
      unsubs.push(unsub);
    }

    return () => { console.log('[DataStore] 🛑 Stopping sync'); unsubs.forEach(u => u()); };
  },

  // ─── Parts ───
  addPart: async (p) => {
    const v = [...get().parts, p];
    set({ parts: v });
    const ok = await fsSave('parts', p.id, p);
    if (!ok) set({ parts: get().parts.filter(x => x.id !== p.id) }); // rollback
    return ok;
  },
  updatePart: async (id, p) => {
    const prev = get().parts.find(x => x.id === id);
    const v = arrUpdate(get().parts, id, p);
    set({ parts: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('parts', id, data) : false;
    if (!ok && prev) set({ parts: arrUpdate(get().parts, id, prev) }); // rollback
    return ok;
  },
  deletePart: async (id) => {
    const prev = get().parts.find(x => x.id === id);
    const v = arrRemove(get().parts, id);
    set({ parts: v });
    const ok = await fsDel('parts', id);
    if (!ok && prev) set({ parts: [...get().parts, prev] }); // rollback
    return ok;
  },

  // ─── Tops ───
  addTop: async (t) => {
    const v = [...get().tops, t];
    set({ tops: v });
    const ok = await fsSave('tops', t.id, t);
    if (!ok) set({ tops: get().tops.filter(x => x.id !== t.id) });
    return ok;
  },
  updateTop: async (id, t) => {
    const prev = get().tops.find(x => x.id === id);
    const v = arrUpdate(get().tops, id, t);
    set({ tops: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('tops', id, data) : false;
    if (!ok && prev) set({ tops: arrUpdate(get().tops, id, prev) });
    return ok;
  },
  deleteTop: async (id) => {
    const prev = get().tops.find(x => x.id === id);
    const v = arrRemove(get().tops, id);
    set({ tops: v });
    const ok = await fsDel('tops', id);
    if (!ok && prev) set({ tops: [...get().tops, prev] });
    return ok;
  },

  // ─── Accessories ───
  addAccessory: async (a) => {
    const v = [...get().accessories, a];
    set({ accessories: v });
    const ok = await fsSave('accessories', a.id, a);
    if (!ok) set({ accessories: get().accessories.filter(x => x.id !== a.id) });
    return ok;
  },
  updateAccessory: async (id, a) => {
    const prev = get().accessories.find(x => x.id === id);
    const v = arrUpdate(get().accessories, id, a);
    set({ accessories: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('accessories', id, data) : false;
    if (!ok && prev) set({ accessories: arrUpdate(get().accessories, id, prev) });
    return ok;
  },
  deleteAccessory: async (id) => {
    const prev = get().accessories.find(x => x.id === id);
    const v = arrRemove(get().accessories, id);
    set({ accessories: v });
    const ok = await fsDel('accessories', id);
    if (!ok && prev) set({ accessories: [...get().accessories, prev] });
    return ok;
  },

  // ─── Products ───
  addProduct: async (p) => {
    const v = [...get().products, p];
    set({ products: v });
    const ok = await fsSave('products', p.id, p);
    if (!ok) set({ products: get().products.filter(x => x.id !== p.id) });
    return ok;
  },
  updateProduct: async (id, p) => {
    const prev = get().products.find(x => x.id === id);
    const v = arrUpdate(get().products, id, p);
    set({ products: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('products', id, data) : false;
    if (!ok && prev) set({ products: arrUpdate(get().products, id, prev) });
    return ok;
  },
  deleteProduct: async (id) => {
    const prev = get().products.find(x => x.id === id);
    const v = arrRemove(get().products, id);
    set({ products: v });
    const ok = await fsDel('products', id);
    if (!ok && prev) set({ products: [...get().products, prev] });
    return ok;
  },

  // ─── Projects ───
  addProject: async (p) => {
    const v = [...get().projects, p];
    set({ projects: v });
    const ok = await fsSave('projects', p.id, p);
    if (!ok) set({ projects: get().projects.filter(x => x.id !== p.id) });
    return ok;
  },
  updateProject: async (id, p) => {
    const prev = get().projects.find(x => x.id === id);
    const v = arrUpdate(get().projects, id, p);
    set({ projects: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('projects', id, data) : false;
    if (!ok && prev) set({ projects: arrUpdate(get().projects, id, prev) });
    return ok;
  },
  deleteProject: async (id) => {
    const prev = get().projects.find(x => x.id === id);
    const v = arrRemove(get().projects, id);
    set({ projects: v });
    const ok = await fsDel('projects', id);
    if (!ok && prev) set({ projects: [...get().projects, prev] });
    return ok;
  },

  // ─── Batches ───
  addBatch: async (b) => {
    const v = [...get().batches, b];
    set({ batches: v });
    const ok = await fsSave('batches', b.id, b);
    if (!ok) set({ batches: get().batches.filter(x => x.id !== b.id) });
    return ok;
  },
  updateBatch: async (id, b) => {
    const prev = get().batches.find(x => x.id === id);
    const v = arrUpdate(get().batches, id, b);
    set({ batches: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('batches', id, data) : false;
    if (!ok && prev) set({ batches: arrUpdate(get().batches, id, prev) });
    return ok;
  },
  deleteBatch: async (id) => {
    const prev = get().batches.find(x => x.id === id);
    const v = arrRemove(get().batches, id);
    set({ batches: v });
    const ok = await fsDel('batches', id);
    if (!ok && prev) set({ batches: [...get().batches, prev] });
    return ok;
  },

  // ─── Containers ───
  addContainer: async (c) => {
    const v = [...get().containers, c];
    set({ containers: v });
    const ok = await fsSave('containers', c.id, c);
    if (!ok) set({ containers: get().containers.filter(x => x.id !== c.id) });
    return ok;
  },
  updateContainer: async (id, c) => {
    const prev = get().containers.find(x => x.id === id);
    const v = arrUpdate(get().containers, id, c);
    set({ containers: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('containers', id, data) : false;
    if (!ok && prev) set({ containers: arrUpdate(get().containers, id, prev) });
    return ok;
  },
  deleteContainer: async (id) => {
    const prev = get().containers.find(x => x.id === id);
    const v = arrRemove(get().containers, id);
    set({ containers: v });
    const ok = await fsDel('containers', id);
    if (!ok && prev) set({ containers: [...get().containers, prev] });
    return ok;
  },
  archiveContainer: async (id, userName) => {
    const cont = get().containers.find(c => c.id === id);
    if (!cont) return false;
    const now = new Date().toISOString();
    const updated = { ...cont, archived: true, archivedAt: now, archivedBy: userName };
    const prev = get().containers.find(x => x.id === id);
    const v = arrUpdate(get().containers, id, { archived: true, archivedAt: now, archivedBy: userName });
    set({ containers: v });
    const ok = await fsSave('containers', id, updated);
    if (!ok && prev) set({ containers: arrUpdate(get().containers, id, prev) });
    return ok;
  },

  // ─── Pallets ───
  addPallet: async (p) => {
    const v = [...get().pallets, p];
    set({ pallets: v });
    const ok = await fsSave('pallets', p.id, p);
    if (!ok) set({ pallets: get().pallets.filter(x => x.id !== p.id) });
    return ok;
  },
  updatePallet: async (id, p) => {
    const prev = get().pallets.find(x => x.id === id);
    const v = arrUpdate(get().pallets, id, p);
    set({ pallets: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('pallets', id, data) : false;
    if (!ok && prev) set({ pallets: arrUpdate(get().pallets, id, prev) });
    return ok;
  },
  deletePallet: async (id) => {
    const prev = get().pallets.find(x => x.id === id);
    const v = arrRemove(get().pallets, id);
    set({ pallets: v });
    const ok = await fsDel('pallets', id);
    if (!ok && prev) set({ pallets: [...get().pallets, prev] });
    return ok;
  },

  // ─── Boxes ───
  addBox: async (b) => {
    const v = [...get().boxes, b];
    set({ boxes: v });
    const ok = await fsSave('boxes', b.id, b);
    if (!ok) set({ boxes: get().boxes.filter(x => x.id !== b.id) });
    return ok;
  },
  updateBox: async (id, b) => {
    const prev = get().boxes.find(x => x.id === id);
    const v = arrUpdate(get().boxes, id, b);
    set({ boxes: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('boxes', id, data) : false;
    if (!ok && prev) set({ boxes: arrUpdate(get().boxes, id, prev) });
    return ok;
  },
  deleteBox: async (id) => {
    const prev = get().boxes.find(x => x.id === id);
    const v = arrRemove(get().boxes, id);
    set({ boxes: v });
    const ok = await fsDel('boxes', id);
    if (!ok && prev) set({ boxes: [...get().boxes, prev] });
    return ok;
  },

  // ─── Movements ───
  addMovement: async (m) => {
    const v = [...get().movements, m];
    set({ movements: v });
    return fsSave('movements', m.id, m);
  },

  // ─── Rejected ───
  addRejected: async (r) => {
    const v = [...get().rejected, r];
    set({ rejected: v });
    const ok = await fsSave('rejected', r.id, r);
    if (!ok) set({ rejected: get().rejected.filter(x => x.id !== r.id) });
    return ok;
  },
  updateRejected: async (id, r) => {
    const prev = get().rejected.find(x => x.id === id);
    const v = arrUpdate(get().rejected, id, r);
    set({ rejected: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('rejected', id, data) : false;
    if (!ok && prev) set({ rejected: arrUpdate(get().rejected, id, prev) });
    return ok;
  },
  deleteRejected: async (id) => {
    const prev = get().rejected.find(x => x.id === id);
    const v = arrRemove(get().rejected, id);
    set({ rejected: v });
    const ok = await fsDel('rejected', id);
    if (!ok && prev) set({ rejected: [...get().rejected, prev] });
    return ok;
  },

  // ─── Inspections ───
  addInspection: async (i) => {
    const v = [...get().inspections, i];
    set({ inspections: v });
    const ok = await fsSave('inspections', i.id, i);
    if (!ok) set({ inspections: get().inspections.filter(x => x.id !== i.id) });
    return ok;
  },
  updateInspection: async (id, i) => {
    const prev = get().inspections.find(x => x.id === id);
    const v = arrUpdate(get().inspections, id, i);
    set({ inspections: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('inspections', id, data) : false;
    if (!ok && prev) set({ inspections: arrUpdate(get().inspections, id, prev) });
    return ok;
  },
  deleteInspection: async (id) => {
    const prev = get().inspections.find(x => x.id === id);
    const v = arrRemove(get().inspections, id);
    set({ inspections: v });
    const ok = await fsDel('inspections', id);
    if (!ok && prev) set({ inspections: [...get().inspections, prev] });
    return ok;
  },

  // ═══ Installation (v9.0) ═══
  addInstallation: async (inst) => {
    const v = [...get().installations, inst];
    set({ installations: v });
    const ok = await fsSave('installations', inst.id, inst);
    if (!ok) set({ installations: get().installations.filter(x => x.id !== inst.id) });
    return ok;
  },
  updateInstallation: async (id, patch) => {
    const prev = get().installations.find(x => x.id === id);
    const v = arrUpdate(get().installations, id, patch);
    set({ installations: v });
    const data = v.find(x => x.id === id);
    const ok = data ? await fsSave('installations', id, data) : false;
    if (!ok && prev) set({ installations: arrUpdate(get().installations, id, prev) });
    return ok;
  },
  deleteInstallation: async (id) => {
    const prev = get().installations.find(x => x.id === id);
    const v = arrRemove(get().installations, id);
    set({ installations: v });
    const ok = await fsDel('installations', id);
    if (!ok && prev) set({ installations: [...get().installations, prev] });
    return ok;
  },

  // ─── Settings ───
  setSettings: async (s) => {
    const merged = { ...get().settings, ...s };
    // Log every field with its type for debugging
    console.log('[setSettings] Saving fields:');
    for (const [k, v] of Object.entries(merged)) {
      const t = Array.isArray(v) ? `array[${v.length}]` : typeof v;
      let preview = v;
      if (typeof v === 'string' && v.length > 50) preview = `${v.slice(0, 50)}...(${v.length}ch)`;
      console.log(`  ${k}: ${t} = ${preview}`);
    }
    const prev = get().settings;
    set({ settings: merged });
    const ok = await fsSave('app', 'settings', merged);
    if (!ok) set({ settings: prev }); // rollback
    return ok;
  },

  // ─── Clear All — Admin Only ───
  clearAll: async (userRole: string) => {
    // Admin-only guard
    if (userRole !== 'admin') {
      console.error('[clearAll] 🚫 Access denied: admin role required, got:', userRole);
      alert('لا يمكن مسح البيانات — هذه العملية مخصصة للمسؤول فقط');
      return false;
    }

    // Confirmation prompt
    const confirmed = window.confirm(
      '⚠️ هل أنت متأكد من مسح جميع البيانات؟\n\n' +
      'هذه العملية لا يمكن التراجع عنها!'
    );
    if (!confirmed) {
      console.log('[clearAll] ❎ User cancelled');
      return false;
    }

    // Double confirmation for safety
    const doubleConfirm = window.confirm(
      '🔴 تأكيد نهائي: سيتم حذف جميع البيانات بشكل دائم.\n' +
      'اضغط "موافق" للتأكيد النهائي.'
    );
    if (!doubleConfirm) {
      console.log('[clearAll] ❎ User cancelled at double confirmation');
      return false;
    }

    console.log('[clearAll] 🧹 Starting admin wipe...');
    const cols = ['parts', 'tops', 'accessories', 'products', 'projects', 'batches', 'containers', 'pallets', 'boxes', 'movements', 'rejected', 'inspections', 'installations'];

    const deletePromises = cols.map(async (col) => {
      try {
        const snap = await getDocs(collection(db, col));
        const docDeletions = snap.docs.map(d => deleteDoc(doc(db, col, d.id)));
        await Promise.all(docDeletions);
        console.log(`[clearAll] ✅ ${col}: all docs deleted`);
        return { col, status: 'success' as const };
      } catch (e: any) {
        console.error(`[clearAll] ❌ ${col}:`, e.code || e.message);
        return { col, status: 'error' as const, error: e.code || e.message };
      }
    });

    const results = await Promise.allSettled(deletePromises);
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.status === 'success');
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'error'));

    console.log(`[clearAll] 📊 Deleted: ${succeeded.length}/${cols.length} collections`);
    if (failed.length > 0) {
      console.warn(`[clearAll] ⚠️ ${failed.length} collection(s) had errors`);
    }

    set({
      parts: [], tops: [], accessories: [], products: [], projects: [],
      batches: [], containers: [], pallets: [], boxes: [], movements: [],
      rejected: [], inspections: [], stockTransactions: [], installations: [],
      settings: DEFAULT_SETTINGS,
    });

    return failed.length === 0;
  },

  getLowStockParts: () => get().parts.filter(p => (p.qty - (p.reservedQty || 0)) <= (p.min || 0) && p.min > 0),

  // ─── Stock Card — add transaction ───
  addStockTransaction: async (t) => {
    const v = [...get().stockTransactions, t];
    set({ stockTransactions: v });
    return fsSave('stockTransactions', t.id, t);
  },

  // ─── Stock Card — get all transactions for an item ───
  getStockCard: (itemId: string, itemType?: string) => {
    const txs = get().stockTransactions;
    return txs
      .filter(t => t.itemId === itemId && (!itemType || t.itemType === itemType))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // ─── Helper: create stock transaction ───
  _createStockTx: async (itemId: string, itemType: 'part' | 'top' | 'accessory', itemName: string, itemCode: string, type: StockTransaction['type'], qty: number, beforeQty: number, afterQty: number, reason: string, refId?: string, refType?: string, refName?: string, userName?: string) => {
    const tx: StockTransaction = {
      id: 'TX_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      itemId, itemType, itemName, itemCode, type, qty, beforeQty, afterQty,
      reason, refId, refType, refName, userName,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    return get().addStockTransaction(tx);
  },

  // ─── Reserve stock when items are assigned to boxes (Packing)
  // Deducts from AVAILABLE qty immediately (user sees the change)
  // Physical deduct happens later on shipment.
  reserveStock: async (itemId: string, itemType: 'part' | 'top' | 'accessory', itemName: string, itemCode: string, qty: number, boxName: string, userName?: string) => {
    const state = get();
    if (itemType === 'part') {
      const part = state.parts.find(p => p.id === itemId);
      if (part) {
        const currentReserved = part.reservedQty || 0;
        const newReserved = currentReserved + qty;
        await get().updatePart(part.id, { reservedQty: newReserved });
        await get()._createStockTx(
          itemId, itemType, itemName, itemCode,
          'reserve', qty, part.qty, part.qty,
          `حجز للتعبئة — صندوق: ${boxName}`,
          undefined, 'box', boxName, userName
        );
        return true;
      }
    }
    // For tops/accessories (no qty tracking), just record transaction
    await get()._createStockTx(
      itemId, itemType, itemName, itemCode,
      'reserve', qty, 0, 0,
      `حجز للتعبئة — صندوق: ${boxName}`,
      undefined, 'box', boxName, userName
    );
    return true;
  },

  // ─── Release stock when items are removed from boxes (Packing)
  // Returns reserved qty back to available.
  releaseStock: async (itemId: string, itemType: 'part' | 'top' | 'accessory', itemName: string, itemCode: string, qty: number, boxName: string, userName?: string) => {
    const state = get();
    if (itemType === 'part') {
      const part = state.parts.find(p => p.id === itemId);
      if (part) {
        const currentReserved = part.reservedQty || 0;
        const newReserved = Math.max(0, currentReserved - qty);
        await get().updatePart(part.id, { reservedQty: newReserved });
        await get()._createStockTx(
          itemId, itemType, itemName, itemCode,
          'release', qty, part.qty, part.qty,
          `إلغاء حجز — صندوق: ${boxName}`,
          undefined, 'box', boxName, userName
        );
        return true;
      }
    }
    await get()._createStockTx(
      itemId, itemType, itemName, itemCode,
      'release', qty, 0, 0,
      `إلغاء حجز — صندوق: ${boxName}`,
      undefined, 'box', boxName, userName
    );
    return true;
  },

  // ─── Deduct (صرف) stock when shipment is sent ───
  deductStockForShipment: async (containerId: string, containerName: string, userName: string) => {
    const state = get();
    const container = state.containers.find(c => c.id === containerId);
    if (!container) return { success: false, message: 'الكونتينر غير موجود', deducted: 0 };

    const deducted: { item: string; qty: number }[] = [];

    // Collect all items from all boxes in this container
    const containerBoxIds = new Set(container.boxes);
    const containerBoxes = state.boxes.filter(b => containerBoxIds.has(b.id));

    // Aggregate items by ID
    const itemMap = new Map<string, { id: string; type: string; name: string; code: string; qty: number }>();

    for (const box of containerBoxes) {
      for (const item of (box.pickItems || []) as any[]) {
        const key = `${item.id}_${item.type}`;
        const existing = itemMap.get(key);
        if (existing) {
          existing.qty += item.assignedQty || 1;
        } else {
          itemMap.set(key, {
            id: item.id,
            type: item.type,
            name: item.name,
            code: item.code,
            qty: item.assignedQty || 1,
          });
        }
      }
    }

    // Process each aggregated item
    for (const item of itemMap.values()) {
      const itemType = item.type as 'part' | 'top' | 'accessory';

      if (itemType === 'part') {
        const part = state.parts.find(p => p.id === item.id || p.revit === item.code);
        if (part) {
          const beforeQty = part.qty;
          const afterQty = Math.max(0, part.qty - item.qty);
          const currentReserved = part.reservedQty || 0;
          const afterReserved = Math.max(0, currentReserved - item.qty);
          // Physical deduct: reduce qty AND clear reserved
          await get().updatePart(part.id, { qty: afterQty, reservedQty: afterReserved });
          await get()._createStockTx(
            part.id, 'part', part.name, part.revit || part.barcode || '',
            'out', item.qty, beforeQty, afterQty,
            `صادر شحنة — كونتينر: ${containerName}`,
            containerId, 'container', containerName, userName
          );
          deducted.push({ item: part.name, qty: item.qty });
        }
      } else if (itemType === 'accessory') {
        const acc = state.accessories.find(a => a.id === item.id || a.code === item.code);
        if (acc) {
          await get()._createStockTx(
            acc.id, 'accessory', acc.name, acc.code,
            'out', item.qty, 0, 0,
            `صادر شحنة — كونتينر: ${containerName}`,
            containerId, 'container', containerName, userName
          );
          deducted.push({ item: acc.name, qty: item.qty });
        }
      } else if (itemType === 'top') {
        const top = state.tops.find(t => t.id === item.id || t.code === item.code);
        if (top) {
          await get()._createStockTx(
            top.id, 'top', top.name, top.code,
            'out', item.qty, 0, 0,
            `صادر شحة — كونتينر: ${containerName}`,
            containerId, 'container', containerName, userName
          );
          deducted.push({ item: top.name, qty: item.qty });
        }
      }
    }

    return {
      success: true,
      message: `تم صرف ${deducted.length} صنف من المخزون`,
      deducted: deducted.length,
    };
  },

  // ─── Legacy: deduct stock for batch (kept for backward compat) ───
  deductStockForBatch: async (batchId: string, batchName: string, userName: string) => {
    const state = get();
    const batch = state.batches.find(b => b.id === batchId);
    if (!batch) return { success: false, message: 'الدفعة غير موجودة', deducted: 0 };

    const deducted: { item: string; qty: number }[] = [];

    // Deduct from product components
    for (const bp of batch.prods) {
      const product = state.products.find(p => p.id === bp.id);
      if (!product) continue;
      for (const comp of product.components) {
        const qtyNeeded = comp.qty * bp.qty;
        if (comp.compType === 'part' || comp.compType === 'part-set') {
          const part = state.parts.find(p => p.id === comp.id || p.revit === comp.code);
          if (part) {
            const beforeQty = part.qty;
            const afterQty = Math.max(0, part.qty - qtyNeeded);
            await get().updatePart(part.id, { qty: afterQty });
            await get()._createStockTx(part.id, 'part', part.name, part.revit || part.barcode || '', 'out', qtyNeeded, beforeQty, afterQty, `صادر — دفعة: ${batchName}`, batchId, 'batch', batchName, userName);
            deducted.push({ item: part.name, qty: qtyNeeded });
          }
        } else if (comp.compType === 'accessory' || comp.compType === 'acc-set') {
          const acc = state.accessories.find(a => a.id === comp.id || a.code === comp.code);
          if (acc) {
            await get()._createStockTx(acc.id, 'accessory', acc.name, acc.code, 'out', qtyNeeded, 0, 0, `صادر — دفعة: ${batchName}`, batchId, 'batch', batchName, userName);
            deducted.push({ item: acc.name, qty: qtyNeeded });
          }
        } else if (comp.compType === 'top') {
          const top = state.tops.find(t => t.id === comp.id || t.code === comp.code);
          if (top) {
            await get()._createStockTx(top.id, 'top', top.name, top.code, 'out', qtyNeeded, 0, 0, `صادر — دفعة: ${batchName}`, batchId, 'batch', batchName, userName);
            deducted.push({ item: top.name, qty: qtyNeeded });
          }
        }
      }
    }

    // Extra items
    for (const extra of batch.extraParts || []) {
      const part = state.parts.find(p => p.id === extra.itemId);
      if (part) {
        const beforeQty = part.qty;
        const afterQty = Math.max(0, part.qty - extra.qty);
        await get().updatePart(part.id, { qty: afterQty });
        await get()._createStockTx(part.id, 'part', part.name, part.revit || part.barcode || '', 'out', extra.qty, beforeQty, afterQty, `صادر قطع إضافية — دفعة: ${batchName}`, batchId, 'batch', batchName, userName);
        deducted.push({ item: part.name, qty: extra.qty });
      }
    }

    return {
      success: true,
      message: `تم صرف ${deducted.length} صنف من المخزون`,
      deducted: deducted.length,
    };
  },
}));
