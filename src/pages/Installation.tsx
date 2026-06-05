// ============================================================
// Installation v2.0 — شاشة التركيب
// تعرض الدفعات المستلمة + منتجاتها للتركيب في الموقع
// Firestore real-time — بدون localStorage
// ============================================================

import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  Wrench, CheckCircle, Building2, Layers, Package,
  ImageIcon, LogOut, ChevronDown, ChevronUp,
  Box, Puzzle, Gem, Sofa, AlertCircle,
} from 'lucide-react';

type ItemCategory = 'product' | 'part' | 'accessory' | 'top';

interface InstallItem {
  id: string;
  name: string;
  code: string;
  img?: string;
  category: ItemCategory;
  categoryLabel: string;
  qty: number;
  boxNum: string;
  boxId: string;
  installed: boolean;
}

// ─── Group items by category ───
const CAT_COLORS: Record<string, { bg: string; text: string; icon: typeof Box }> = {
  product: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Box },
  part: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: Puzzle },
  accessory: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Gem },
  top: { bg: 'bg-teal-100', text: 'text-teal-700', icon: Sofa },
};

export default function Installation() {
  const {
    boxes, containers, projects, batches,
    products, parts, tops, updateBox,
  } = useDataStore();
  const user = useAuthStore(s => s.user);

  const [expandedBox, setExpandedBox] = useState<string | null>(null);

  // ─── Get delivered batches (all containers delivered) ───
  const deliveredBatches = useMemo(() => {
    return batches.filter(batch => {
      const batchBoxes = boxes.filter(b => b.batchId === batch.id);
      const batchContainerIds = new Set(
        batchBoxes.filter(b => b.containerId).map(b => b.containerId as string)
      );
      const batchContainers = containers.filter(c => batchContainerIds.has(c.id));
      // Must have containers AND all delivered
      return batchContainers.length > 0 && batchContainers.every(c => c.shipmentStatus === 'delivered');
    }).map(batch => {
      const project = projects.find(p => p.id === batch.projectId);
      const batchBoxes = boxes.filter(b => b.batchId === batch.id);
      const batchContainerIds = new Set(
        batchBoxes.filter(b => b.containerId).map(b => b.containerId as string)
      );
      const batchContainers = containers.filter(c => batchContainerIds.has(c.id));
      return { batch, project: project || { id: '', name: '—' }, boxes: batchBoxes, containers: batchContainers };
    });
  }, [batches, boxes, containers, projects]);

  // ─── Build install items from boxes ───
  const getBoxItems = (box: typeof boxes[0]): InstallItem[] => {
    const items: InstallItem[] = [];

    // 1. Products from box.prods
    (box.prods || []).forEach((prod, idx) => {
      const productInfo = products.find(p => p.id === prod.id || p.code === prod.code);
      items.push({
        id: `prod_${box.id}_${idx}`,
        name: prod.name || productInfo?.name || 'منتج',
        code: prod.code || productInfo?.code || '—',
        img: productInfo?.img,
        category: 'product',
        categoryLabel: 'منتج',
        qty: prod.qty,
        boxNum: box.num,
        boxId: box.id,
        installed: !!box.installed,
      });
    });

    // 2. Pick items (not from products)
    (box.pickItems || []).forEach((item, idx) => {
      if (item.fromProduct && !item.isExtra) return; // Skip product-derived items

      const catLabels: Record<string, string> = {
        part: 'قطعة', accessory: 'اكسسوار', top: 'توب', product: 'منتج',
      };
      let itemImg: string | undefined;
      if (item.type === 'part') {
        const p = parts.find((x: any) => x.revit === item.code || x.id === (item as any).itemId);
        if (p) itemImg = p.img;
      } else if (item.type === 'top') {
        const t = tops.find((x: any) => x.code === item.code || x.id === (item as any).itemId);
        if (t) itemImg = t.img;
      }

      items.push({
        id: `extra_${box.id}_${idx}`,
        name: item.name,
        code: item.code,
        img: itemImg,
        category: (item.type as ItemCategory) || 'part',
        categoryLabel: catLabels[item.type] || 'قطعة',
        qty: item.assignedQty || item.qty,
        boxNum: box.num,
        boxId: box.id,
        installed: !!box.installed,
      });
    });

    return items;
  };

  // ─── Confirm installation of a box ───
  const handleConfirmBox = (boxId: string) => {
    if (!confirm('تأكيد تركيب كل محتويات هذا الصندوق؟')) return;
    updateBox(boxId, {
      installed: true,
      installedAt: new Date().toISOString(),
      installedBy: user?.name || user?.email,
    });
  };

  // ─── Stats ───
  const totalItems = useMemo(() => {
    return deliveredBatches.reduce((sum, db) => {
      return sum + db.boxes.reduce((s, b) => s + (b.prods || []).length + (b.pickItems || []).filter(i => !i.fromProduct || i.isExtra).length, 0);
    }, 0);
  }, [deliveredBatches]);

  const installedBoxesCount = useMemo(() => {
    return deliveredBatches.reduce((sum, db) => sum + db.boxes.filter(b => b.installed).length, 0);
  }, [deliveredBatches]);

  const totalBoxesCount = useMemo(() => {
    return deliveredBatches.reduce((sum, db) => sum + db.boxes.length, 0);
  }, [deliveredBatches]);

  // ═══ Empty State ═══
  if (deliveredBatches.length === 0) {
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
              <p className="text-[9px] text-gray-400">Installation</p>
            </div>
          </div>
          <button onClick={() => { if (confirm('تسجيل خروج؟')) window.location.reload(); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="تسجيل خروج">
            <LogOut className="w-4 h-4 text-red-500" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-lg font-bold text-gray-500 mb-2">لا توجد شحنات مستلمة</p>
          <p className="text-sm text-gray-400 text-center max-w-md">
            سيتم عرض المنتجات هنا بعد استلام الشحنات في الموقع
            <br />
            <span className="text-xs text-gray-300 mt-1 block">الخطوة السابقة: استلام الشحنات ←</span>
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
            {totalBoxesCount - installedBoxesCount} قيد التركيب
          </span>
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            {installedBoxesCount} مُركب
          </span>
          <button onClick={() => { if (confirm('تسجيل خروج؟')) window.location.reload(); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="تسجيل خروج">
            <LogOut className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <Package className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{deliveredBatches.length}</p>
            <p className="text-[9px] text-gray-400">دفعة مستلمة</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <Wrench className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-700">{totalBoxesCount - installedBoxesCount}</p>
            <p className="text-[9px] text-gray-400">صندوق قيد التركيب</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-700">{installedBoxesCount}</p>
            <p className="text-[9px] text-gray-400">صندوق مُركب</p>
          </div>
        </div>

        {/* Batch Groups */}
        {deliveredBatches.map(({ batch, project, boxes: batchBoxes }) => (
          <div key={batch.id} className="space-y-2">
            {/* Batch Header */}
            <div className="flex items-center gap-2 px-1">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-gray-700">{project.name}</span>
              <Layers className="w-3 h-3 text-gray-300" />
              <span className="text-xs text-gray-600">{batch.name}</span>
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[10px] text-gray-400">{batchBoxes.length} صندوق</span>
            </div>

            {/* Boxes */}
            {batchBoxes.map(box => {
              const isOpen = expandedBox === box.id;
              const items = getBoxItems(box);
              const isInstalled = !!box.installed;

              return (
                <div key={box.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isInstalled ? 'border-green-200' : 'border-gray-100'}`}>
                  {/* Box Header */}
                  <button
                    onClick={() => setExpandedBox(isOpen ? null : box.id)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-gray-50/50 transition-colors text-right"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isInstalled ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <Package className={`w-5 h-5 ${isInstalled ? 'text-green-600' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-800">صندوق {box.num}</p>
                        {isInstalled && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{box.type}</span>
                        <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{items.length} منتج</span>
                        {box.bldg && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{box.bldg} {box.flr && `• ${box.flr}`}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {/* Items */}
                  {isOpen && (
                    <div className="border-t border-gray-100 p-3 space-y-2">
                      {items.length === 0 ? (
                        <p className="text-[11px] text-gray-400 text-center py-4">لا توجد منتجات في هذا الصندوق</p>
                      ) : (
                        items.map(item => {
                          const cc = CAT_COLORS[item.category] || CAT_COLORS.part;
                          const CatIcon = cc.icon;
                          return (
                            <div key={item.id} className={`rounded-xl border p-3 flex items-center gap-3 ${isInstalled ? 'bg-green-50/50 border-green-200 opacity-70' : 'bg-gray-50/50 border-gray-100'}`}>
                              <div className="w-12 h-12 rounded-lg bg-white border flex-shrink-0 overflow-hidden">
                                {item.img ? (
                                  <img src={item.img} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <CatIcon className="w-5 h-5 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                                  {isInstalled && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[10px] text-gray-500 font-mono">{item.code}</p>
                                  <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full ${cc.bg} ${cc.text}`}>
                                    <CatIcon className="w-2.5 h-2.5" /> {item.categoryLabel}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  الكمية: <span className="font-bold text-gray-700">{item.qty}</span>
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Confirm Button */}
                      {!isInstalled && (
                        <div className="pt-2 border-t border-gray-100">
                          <Button
                            onClick={() => handleConfirmBox(box.id)}
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-sm active:scale-[0.98] transition-all"
                          >
                            <CheckCircle className="w-5 h-5 ml-1" />
                            تأكيد تركيب كل محتويات الصندوق
                          </Button>
                        </div>
                      )}
                      {isInstalled && (
                        <div className="pt-2 border-t border-green-100 text-center">
                          <p className="text-xs text-green-600 font-bold flex items-center justify-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            تم التركيب — {box.installedBy} ({box.installedAt ? new Date(box.installedAt).toLocaleDateString('ar-SA') : ''})
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
