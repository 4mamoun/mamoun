// ============================================================
// Pick List — كشف القطع التلقائي
// يحلل مكونات المنتجات في الدفعة ويقسمها (محلي/مستورد)
// ============================================================

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataStore } from '@/store/dataStore';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Package, Boxes, ArrowRight } from 'lucide-react';
import type { PickListItem } from '@/types';

export default function PickList() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { batches, products, parts, accessories, tops } = useDataStore();

  const batch = batches.find(b => b.id === batchId);

  // ─── Auto-generate pick list from product components ───
  const pickList = useMemo(() => {
    if (!batch) return { local: [] as PickListItem[], import: [] as PickListItem[], totalQty: 0 };

    const itemMap = new Map<string, PickListItem>();

    // Helper to add item
    const addItem = (code: string, name: string, type: 'part' | 'accessory' | 'top', source: 'local' | 'import', qty: number, unit: string, fromProduct: string) => {
      const key = `${code}_${source}`;
      const existing = itemMap.get(key);
      if (existing) {
        existing.qty += qty;
      } else {
        itemMap.set(key, { id: key, code, name, type, source, qty, unit, fromProduct });
      }
    };

    // Process each product in batch
    for (const bp of batch.prods || []) {
      const product = products.find(p => p.id === bp.id);
      if (!product) continue;

      // Process components
      for (const comp of product.components || []) {
        const qty = comp.qty * bp.qty;

        if (comp.compType === 'part' || comp.compType === 'part-set') {
          const part = parts.find(p => p.revit === comp.code || p.id === comp.id);
          if (part) {
            addItem(part.revit, part.name, 'part', part.source, qty, part.unit, product.name);
          }
        } else if (comp.compType === 'accessory' || comp.compType === 'acc-set') {
          const acc = accessories.find(a => a.code === comp.code || a.id === comp.id);
          if (acc) {
            // Accessories don't have source — use batch source
            addItem(acc.code, acc.name, 'accessory', batch.source, qty, acc.unit, product.name);
          }
        } else if (comp.compType === 'top') {
          const top = tops.find(t => t.code === comp.code || t.id === comp.id);
          if (top) {
            addItem(top.code, top.name, 'top', top.product, qty, 'pcs', product.name);
          }
        }
      }
    }

    // Process extra items
    for (const ep of batch.extraParts || []) {
      const part = parts.find(p => p.id === ep.itemId);
      if (part) {
        addItem(part.revit, part.name, 'part', part.source, ep.qty, part.unit, 'قطع متفرقة');
      }
    }
    for (const ea of batch.extraAccessories || []) {
      addItem(ea.code, ea.name, 'accessory', batch.source, ea.qty, 'pcs', 'اكسسوارات إضافية');
    }
    for (const et of batch.extraTops || []) {
      const top = tops.find(t => t.id === et.itemId);
      if (top) {
        addItem(top.code, top.name, 'top', top.product, et.qty, 'pcs', 'توبات إضافية');
      }
    }

    const allItems = Array.from(itemMap.values());
    const local = allItems.filter(i => i.source === 'local');
    const importItems = allItems.filter(i => i.source === 'import');
    const totalQty = allItems.reduce((s, i) => s + i.qty, 0);

    return { local, import: importItems, totalQty };
  }, [batch, products, parts, accessories, tops]);

  if (!batch) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>الدفعة غير موجودة</p>
      </div>
    );
  }

  const getProjectName = (id: string) => {
    const { projects } = useDataStore.getState();
    return projects.find(p => p.id === id)?.name || '—';
  };

  return (
    <div className="animate-fade-in space-y-4" dir="rtl">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/batches')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-bold">كشف القطع — {batch.name}</h2>
            <p className="text-xs text-gray-500">{getProjectName(batch.projectId)} • {batch.source === 'local' ? 'محلي' : 'مستورد'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-600">{pickList.totalQty}</p>
            <p className="text-[10px] text-gray-400">إجمالي القطع</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Boxes className="w-5 h-5 text-green-600" />
              <p className="text-sm font-bold text-green-800">كشف المحلي</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{pickList.local.length}</p>
            <p className="text-[10px] text-green-600">صنف • {pickList.local.reduce((s, i) => s + i.qty, 0)} قطعة</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Boxes className="w-5 h-5 text-purple-600" />
              <p className="text-sm font-bold text-purple-800">كشف المستورد</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">{pickList.import.length}</p>
            <p className="text-[10px] text-purple-600">صنف • {pickList.import.reduce((s, i) => s + i.qty, 0)} قطعة</p>
          </div>
        </div>
      </div>

      {/* Local Items */}
      {pickList.local.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-green-100 bg-green-50/50">
            <h3 className="text-sm font-bold text-green-800 flex items-center gap-2">
              <Boxes className="w-4 h-4" /> كشف القطع المحلية ({pickList.local.length} صنف)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/50 text-right"><th className="text-xs font-bold p-3">#</th><th className="text-xs font-bold p-3">الكود</th><th className="text-xs font-bold p-3">الاسم</th><th className="text-xs font-bold p-3">النوع</th><th className="text-xs font-bold p-3">الكمية</th><th className="text-xs font-bold p-3">الوحدة</th><th className="text-xs font-bold p-3">من منتج</th></tr></thead>
              <tbody>
                {pickList.local.map((item, i) => (
                  <tr key={item.id} className="border-t hover:bg-green-50/20">
                    <td className="p-3 text-xs text-gray-500">{i + 1}</td>
                    <td className="p-3 text-xs font-mono font-semibold text-green-700">{item.code}</td>
                    <td className="p-3 text-xs font-medium">{item.name}</td>
                    <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100">{item.type === 'part' ? 'قطعة' : item.type === 'accessory' ? 'اكسسوار' : 'توب'}</span></td>
                    <td className="p-3 text-sm font-bold text-green-700">{item.qty}</td>
                    <td className="p-3 text-xs text-gray-500">{item.unit}</td>
                    <td className="p-3 text-[10px] text-gray-400">{item.fromProduct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Items */}
      {pickList.import.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-purple-100 bg-purple-50/50">
            <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2">
              <Boxes className="w-4 h-4" /> كشف القطع المستوردة ({pickList.import.length} صنف)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/50 text-right"><th className="text-xs font-bold p-3">#</th><th className="text-xs font-bold p-3">الكود</th><th className="text-xs font-bold p-3">الاسم</th><th className="text-xs font-bold p-3">النوع</th><th className="text-xs font-bold p-3">الكمية</th><th className="text-xs font-bold p-3">الوحدة</th><th className="text-xs font-bold p-3">من منتج</th></tr></thead>
              <tbody>
                {pickList.import.map((item, i) => (
                  <tr key={item.id} className="border-t hover:bg-purple-50/20">
                    <td className="p-3 text-xs text-gray-500">{i + 1}</td>
                    <td className="p-3 text-xs font-mono font-semibold text-purple-700">{item.code}</td>
                    <td className="p-3 text-xs font-medium">{item.name}</td>
                    <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100">{item.type === 'part' ? 'قطعة' : item.type === 'accessory' ? 'اكسسوار' : 'توب'}</span></td>
                    <td className="p-3 text-sm font-bold text-purple-700">{item.qty}</td>
                    <td className="p-3 text-xs text-gray-500">{item.unit}</td>
                    <td className="p-3 text-[10px] text-gray-400">{item.fromProduct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action: Go to Boxes */}
      <div className="flex justify-center gap-3">
        <Button onClick={() => navigate(`/boxes?batch=${batchId}`)} className="bg-gradient-to-r from-cyan-500 to-cyan-600 gap-1">
          <ArrowRight className="w-4 h-4" /> الانتقال لتعبئة الصناديق
        </Button>
      </div>
    </div>
  );
}
