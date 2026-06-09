// ============================================================
// Installation v10.0 — شاشة التركيب بالمنتجات (مُعاد هيكلتها)
// كل منتج = بطاقة مستقلة مع صورة + قطع + أزرار حالة + موقع
// Firestore real-time — بدون localStorage
// ============================================================

import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import BatchNotes from '@/components/BatchNotes';
import { Button } from '@/components/ui/button';
import {
  Wrench, CheckCircle, Building2, Layers, Package,
  LogOut, ChevronDown, ChevronUp, Box, Puzzle, Gem, Sofa,
  XSquare, AlertTriangle, MessageSquare,
  MapPin, Percent, StickyNote, ImageIcon, Hash,
} from 'lucide-react';
import type {
  ProductInstallation, ProductInstallComponent, InstallItemStatus,
  ProductComponent, BatchProduct, Product,
} from '@/types';

// ─── Helpers ───
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ─── Status Config ───
const STATUS_CONFIG: Record<InstallItemStatus, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
  pending:   { label: 'قيد الانتظار', color: 'text-gray-500',  bg: 'bg-gray-100',  border: 'border-gray-200',  icon: Box },
  installed: { label: 'تم الاستلام',  color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200', icon: CheckCircle },
  missing:   { label: 'نقص',          color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200', icon: AlertTriangle },
  rejected:  { label: 'مرفوض',        color: 'text-red-700',   bg: 'bg-red-100',   border: 'border-red-200',   icon: XSquare },
  noted:     { label: 'ملاحظة',       color: 'text-blue-700',  bg: 'bg-blue-100',  border: 'border-blue-200',  icon: MessageSquare },
};

// ─── Component Type Icons ───
const COMP_TYPE_ICON: Record<string, typeof Puzzle> = {
  part: Puzzle,
  'part-set': Puzzle,
  accessory: Gem,
  'acc-set': Gem,
  top: Sofa,
};
const COMP_TYPE_LABEL: Record<string, string> = {
  part: 'قطعة',
  'part-set': 'طقم قطع',
  accessory: 'اكسسوار',
  'acc-set': 'طقم اكسسوار',
  top: 'توب',
};

// ─── Map product compType to install partType ───
function compTypeToPartType(ct: ProductComponent['compType']): ProductInstallComponent['partType'] {
  if (ct === 'top') return 'top';
  if (ct === 'accessory' || ct === 'acc-set') return 'accessory';
  return 'part';
}

// ─── Progress bar color based on percentage ───
function progressColor(pct: number): string {
  if (pct === 0)   return 'bg-gray-200';
  if (pct < 50)    return 'bg-amber-400';
  if (pct < 100)   return 'bg-blue-500';
  return 'bg-green-500';
}
function progressTextColor(pct: number): string {
  if (pct === 0)   return 'text-gray-400';
  if (pct < 50)    return 'text-amber-600';
  if (pct < 100)   return 'text-blue-600';
  return 'text-green-600';
}

// ─── Group by project+building+floor+room ───
interface InstallGroup {
  projectId: string;
  projectName: string;
  buildingName: string;
  floorName: string;
  roomName: string;
  products: ProductInstallation[];
}

export default function Installation() {
  const {
    projects, batches, products, installations,
    addInstallation, updateInstallation, updateBox,
    boxes,
  } = useDataStore();
  const user = useAuthStore(s => s.user);

  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesBatchId, setNotesBatchId] = useState('');
  const [notesBatchName, setNotesBatchName] = useState('');

  // ─── Build product installations from batch.prods ───
  // New: Use batch.prods directly (not just delivered boxes)
  const installGroups: InstallGroup[] = useMemo(() => {
    const groups: InstallGroup[] = [];

    for (const batch of batches) {
      const project = projects.find(p => p.id === batch.projectId);
      if (!project) continue;

      for (const bp of batch.prods) {
        const productInfo = products.find(p => p.id === bp.id || p.code === bp.code);
        if (!productInfo) continue;

        // Resolve location from bp (batch product room info)
        let buildingName = '—';
        let floorName = '—';
        let roomName = bp.roomName || '—';

        if (bp.buildingId) {
          const bldg = project.buildings.find(b => b.id === bp.buildingId);
          if (bldg) {
            buildingName = bldg.name;
            if (bp.floorId) {
              const flr = bldg.floors.find(f => (f.id || f.name) === bp.floorId);
              if (flr) floorName = flr.name;
            }
          }
        }

        // Build unique key per batch+product+room
        const key = `${batch.id}_${productInfo.id}_${bp.roomId || 'no-room'}`;

        // Check if we have an existing installation record
        const existing = installations.find(i =>
          i.batchId === batch.id && i.productId === productInfo.id && i.roomId === (bp.roomId || '')
        );

        // Build components from product.components
        const comps: ProductInstallComponent[] = existing?.components ||
          productInfo.components.map((pc: ProductComponent) => ({
            partId: pc.id,
            partCode: pc.code,
            partName: pc.name,
            partType: compTypeToPartType(pc.compType),
            qty: pc.qty * (bp.qty || 1),
            status: 'pending' as InstallItemStatus,
          }));

        const installedCount = comps.filter(c => c.status === 'installed').length;
        const totalCount = comps.length;
        const progress = totalCount > 0 ? Math.round((installedCount / totalCount) * 100) : 0;

        // Find associated box (if delivered)
        const batchBoxes = boxes.filter(b => b.batchId === batch.id);
        const boxWithProd = batchBoxes.find(b =>
          b.prods?.some((p: any) => p.id === productInfo.id)
        );

        const inst: ProductInstallation = {
          id: existing?.id || uid(),
          batchId: batch.id,
          batchName: batch.name,
          productId: productInfo.id,
          productName: productInfo.name,
          productCode: productInfo.code,
          productImg: productInfo.img,
          projectId: project.id,
          projectName: project.name,
          buildingId: bp.buildingId || '',
          buildingName,
          floorId: bp.floorId || '',
          floorName,
          roomId: bp.roomId || '',
          roomName,
          qty: bp.qty || 1,
          components: comps,
          overallProgress: existing?.overallProgress ?? progress,
          installedAt: existing?.installedAt,
          installedBy: existing?.installedBy,
          boxId: boxWithProd?.id,
          boxNum: boxWithProd?.num,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: existing?.updatedAt || new Date().toISOString(),
        };

        // Find or create group
        const groupKey = `${project.id}_${buildingName}_${floorName}_${roomName}`;
        let group = groups.find(g =>
          g.projectId === project.id &&
          g.buildingName === buildingName &&
          g.floorName === floorName &&
          g.roomName === roomName
        );

        if (!group) {
          group = {
            projectId: project.id,
            projectName: project.name,
            buildingName,
            floorName,
            roomName,
            products: [],
          };
          groups.push(group);
        }

        // Avoid duplicate
        if (!group.products.find(p => p.id === inst.id)) {
          group.products.push(inst);
        }
      }
    }

    // Sort: by building → floor → room
    return groups.sort((a, b) => {
      if (a.buildingName !== b.buildingName) return a.buildingName.localeCompare(b.buildingName);
      if (a.floorName !== b.floorName) return a.floorName.localeCompare(b.floorName);
      return a.roomName.localeCompare(b.roomName);
    });
  }, [batches, projects, products, installations, boxes]);

  // ─── Handle component status change ───
  const handleComponentStatus = async (
    inst: ProductInstallation,
    partIdx: number,
    newStatus: InstallItemStatus
  ) => {
    const updatedComps = inst.components.map((c, i) =>
      i === partIdx ? { ...c, status: newStatus } : c
    );
    const installedCount = updatedComps.filter(c => c.status === 'installed').length;
    const totalCount = updatedComps.length;
    const newProgress = totalCount > 0 ? Math.round((installedCount / totalCount) * 100) : 0;

    const patch: Partial<ProductInstallation> = {
      components: updatedComps,
      overallProgress: newProgress,
      updatedAt: new Date().toISOString(),
    };

    // If all installed, pre-fill the installation info
    if (newProgress === 100 && !inst.installedAt) {
      patch.installedAt = new Date().toISOString();
      patch.installedBy = user?.name || user?.email || '—';
    }

    // Check if this installation already exists in store
    const existing = installations.find(i => i.id === inst.id);
    if (existing) {
      await updateInstallation(inst.id, patch);
    } else {
      await addInstallation({ ...inst, ...patch } as ProductInstallation);
    }
  };

  // ─── Handle final box confirmation ───
  const handleConfirmInstallation = async (inst: ProductInstallation) => {
    if (!confirm('تأكيد التركيب النهائي؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    const now = new Date().toISOString();
    const installer = user?.name || user?.email || '—';

    const patch: Partial<ProductInstallation> = {
      overallProgress: 100,
      installedAt: now,
      installedBy: installer,
      updatedAt: now,
    };

    const existing = installations.find(i => i.id === inst.id);
    if (existing) {
      await updateInstallation(inst.id, patch);
    } else {
      await addInstallation({ ...inst, ...patch } as ProductInstallation);
    }

    // Update the box
    if (inst.boxId) {
      await updateBox(inst.boxId, {
        installed: true,
        installedAt: now,
        installedBy: installer,
      });
    }
  };

  // ─── Open notes ───
  const openNotes = (batchId: string, batchName: string) => {
    setNotesBatchId(batchId);
    setNotesBatchName(batchName);
    setNotesOpen(true);
  };

  // ─── Stats ───
  const allProducts = installGroups.flatMap(g => g.products);
  const totalProducts = allProducts.length;
  const completedProducts = allProducts.filter(p => p.overallProgress === 100).length;
  const inProgressProducts = totalProducts - completedProducts;

  const totalComponents = allProducts.reduce((s, p) => s + p.components.length, 0);
  const installedComponents = allProducts.reduce(
    (s, p) => s + p.components.filter(c => c.status === 'installed').length, 0
  );

  // ═══ Empty State ═══
  if (installGroups.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800">التركيب</h1>
              <p className="text-[9px] text-gray-400">v10.0</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-lg font-bold text-gray-500 mb-2">لا توجد منتجات للتركيب</p>
          <p className="text-sm text-gray-400 text-center max-w-md">
            سيتم عرض المنتجات هنا بعد إضافتها في شاشة الدفعات
            <br />
            <span className="text-xs text-gray-300 mt-1 block">الخطوة السابقة: إضافة منتجات للدفعة وتحديد الغرفة</span>
          </p>
        </div>
      </div>
    );
  }

  // ═══ Main View ═══
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-800">التركيب</h1>
            <p className="text-[9px] text-gray-400">{user?.name || 'عامل تركيب'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {inProgressProducts} قيد التركيب
          </span>
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            {completedProducts} مكتمل
          </span>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <Package className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{totalProducts}</p>
            <p className="text-[9px] text-gray-400">منتج</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <Wrench className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-700">{inProgressProducts}</p>
            <p className="text-[9px] text-gray-400">قيد التركيب</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-700">{completedProducts}</p>
            <p className="text-[9px] text-gray-400">مكتمل</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <Percent className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-purple-700">
              {totalComponents > 0 ? Math.round((installedComponents / totalComponents) * 100) : 0}%
            </p>
            <p className="text-[9px] text-gray-400">الإجمالي</p>
          </div>
        </div>

        {/* Install Groups by Location */}
        {installGroups.map(group => (
          <div key={`${group.projectId}_${group.buildingName}_${group.floorName}_${group.roomName}`} className="space-y-3">
            {/* Location Header */}
            <div className="flex items-center gap-2 px-1">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-gray-700">{group.projectName}</span>
              <span className="text-[10px] text-gray-400">/</span>
              <span className="text-xs text-gray-600">{group.buildingName}</span>
              <Layers className="w-3 h-3 text-gray-300 mx-0.5" />
              <span className="text-xs text-gray-600">{group.floorName}</span>
              <MapPin className="w-3 h-3 text-purple-400 mx-0.5" />
              <span className="text-xs font-bold text-purple-600">{group.roomName}</span>
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {group.products.length} منتج
              </span>
            </div>

            {/* Product Cards */}
            {group.products.map(inst => {
              const isOpen = expandedProduct === inst.id;
              const isCompleted = inst.overallProgress === 100;
              const pct = inst.overallProgress;

              return (
                <div
                  key={inst.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                    isCompleted ? 'border-green-200' : 'border-gray-100'
                  }`}
                >
                  {/* Product Header (always visible) */}
                  <button
                    onClick={() => setExpandedProduct(isOpen ? null : inst.id)}
                    className="w-full p-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors text-right"
                  >
                    {/* Product Image */}
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border ${
                      isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      {inst.productImg ? (
                        <img src={inst.productImg} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className={`w-7 h-7 ${isCompleted ? 'text-green-400' : 'text-gray-300'}`} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-800 truncate">{inst.productName}</p>
                        {isCompleted && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {inst.productCode}
                      </p>

                      {/* Batch & Qty */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-0.5 text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">
                          <Package className="w-2.5 h-2.5" /> {inst.batchName}
                        </span>
                        <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                          الكمية: ×{inst.qty}
                        </span>
                        {inst.boxNum && (
                          <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">
                            صندوق: {inst.boxNum}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold ${progressTextColor(pct)}`}>
                            {pct}% مكتمل
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {inst.components.filter(c => c.status === 'installed').length}/{inst.components.length} قطعة
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor(pct)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Chevron */}
                    <div className="flex-shrink-0 mt-1">
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded: Components + Actions */}
                  {isOpen && (
                    <div className="border-t border-gray-100 p-3 space-y-2">
                      {/* Components List */}
                      {inst.components.length === 0 ? (
                        <p className="text-[11px] text-gray-400 text-center py-4">لا توجد قطع لهذا المنتج</p>
                      ) : (
                        inst.components.map((comp, idx) => {
                          const cfg = STATUS_CONFIG[comp.status];
                          const StatusIcon = cfg.icon;
                          const TypeIcon = COMP_TYPE_ICON[comp.partType] || Puzzle;
                          const typeLabel = COMP_TYPE_LABEL[comp.partType] || comp.partType;

                          return (
                            <div
                              key={`${comp.partId}_${idx}`}
                              className={`rounded-xl border p-3 transition-all ${
                                comp.status === 'pending'
                                  ? 'bg-gray-50/50 border-gray-100'
                                  : `${cfg.bg} ${cfg.border}`
                              }`}
                            >
                              {/* Component Info */}
                              <div className="flex items-start gap-2 mb-2.5">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  comp.status === 'pending' ? 'bg-gray-100' : cfg.bg
                                }`}>
                                  <TypeIcon className={`w-3.5 h-3.5 ${
                                    comp.status === 'pending' ? 'text-gray-400' : cfg.color
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-gray-800 truncate">{comp.partName}</p>
                                    <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                      <StatusIcon className="w-2.5 h-2.5" />
                                      {cfg.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[10px] text-gray-500 font-mono">{comp.partCode}</p>
                                    <span className="text-[9px] text-gray-400 bg-white px-1.5 py-0.5 rounded-full border border-gray-100">
                                      {typeLabel}
                                    </span>
                                    <span className="text-[10px] text-gray-600">
                                      الكمية: <span className="font-bold">{comp.qty}</span>
                                    </span>
                                  </div>
                                  {/* Note text if exists */}
                                  {comp.noteText && (
                                    <p className="text-[10px] text-blue-600 mt-1 bg-blue-50 px-2 py-1 rounded">
                                      {comp.noteText}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="grid grid-cols-4 gap-1.5">
                                {(['installed', 'missing', 'rejected', 'noted'] as InstallItemStatus[]).map(st => {
                                  const stCfg = STATUS_CONFIG[st];
                                  const StIcon = stCfg.icon;
                                  const isActive = comp.status === st;
                                  return (
                                    <button
                                      key={st}
                                      onClick={() => handleComponentStatus(inst, idx, st)}
                                      className={`flex items-center justify-center gap-1 text-[10px] font-bold py-2 rounded-lg border transition-all active:scale-[0.97] ${
                                        isActive
                                          ? `${stCfg.bg} ${stCfg.color} ${stCfg.border}`
                                          : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                                      }`}
                                    >
                                      <StIcon className="w-3 h-3" />
                                      {st === 'installed' && 'استلام'}
                                      {st === 'missing' && 'نقص'}
                                      {st === 'rejected' && 'رفض'}
                                      {st === 'noted' && 'ملاحظة'}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Bottom Actions */}
                      <div className="pt-2 flex gap-2">
                        {/* Final Confirm Button (only at 100%) */}
                        {isCompleted && !inst.installedAt && (
                          <Button
                            onClick={() => handleConfirmInstallation(inst)}
                            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-sm active:scale-[0.98] transition-all text-xs"
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            تأكيد التركيب
                          </Button>
                        )}

                        {isCompleted && inst.installedAt && (
                          <div className="flex-1 bg-green-50 border border-green-200 rounded-xl py-2.5 text-center">
                            <p className="text-[10px] text-green-700 font-bold flex items-center justify-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              تم التركيب — {inst.installedBy} ({inst.installedAt ? new Date(inst.installedAt).toLocaleDateString('ar-SA') : ''})
                            </p>
                          </div>
                        )}

                        {/* Notes Button */}
                        <button
                          onClick={() => openNotes(inst.batchId, inst.batchName)}
                          className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-3 py-2.5 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          ملاحظات الدفعة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* BatchNotes Modal */}
      <BatchNotes
        batchId={notesBatchId}
        batchName={notesBatchName}
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
      />
    </div>
  );
}
