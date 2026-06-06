// ============================================================
// حركة المواد — All warehouse materials with stock card
// Shows: parts + tops + accessories
// Click any item → opens Stock Card with full transaction history
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { useDataStore } from '@/store/dataStore';
import { Input } from '@/components/ui/input';
import {
  Search, X, Cog, Square, Layers, History, Package,
  ArrowDownLeft, ArrowUpRight, RefreshCw, RotateCcw,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import StockCard from '@/components/StockCard';

const TYPE_LABELS: Record<string, { label: string; color: string; badgeBg: string; icon: typeof ArrowDownLeft }> = {
  in: { label: 'وارد', color: 'text-green-700', badgeBg: 'bg-green-100', icon: ArrowDownLeft },
  out: { label: 'صادر', color: 'text-red-700', badgeBg: 'bg-red-100', icon: ArrowUpRight },
  adj: { label: 'تعديل', color: 'text-amber-700', badgeBg: 'bg-amber-100', icon: RefreshCw },
  return: { label: 'إرجاع', color: 'text-blue-700', badgeBg: 'bg-blue-100', icon: RotateCcw },
};

type TabType = 'materials' | 'movements';
type MatType = 'all' | 'part' | 'top' | 'accessory';

interface UnifiedMaterial {
  id: string;
  code: string;
  name: string;
  type: 'part' | 'top' | 'accessory';
  qty: number;
  min: number;
  unit: string;
  source: string;
  img?: string;
}

export default function Stock() {
  const { parts, tops, accessories, movements, stockTransactions } = useDataStore();
  const [search, setSearch] = useState('');
  const [deb, setDeb] = useState('');
  const [tab, setTab] = useState<TabType>('materials');
  const [matType, setMatType] = useState<MatType>('all');
  // Stock Card
  const [scOpen, setScOpen] = useState(false);
  const [scItem, setScItem] = useState<UnifiedMaterial | null>(null);

  let timer: ReturnType<typeof setTimeout>;
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(timer);
    timer = setTimeout(() => setDeb(v.trim().toLowerCase()), 300);
  };

  // Build unified materials list
  const allMaterials = useMemo<UnifiedMaterial[]>(() => {
    const mats: UnifiedMaterial[] = [];
    parts.forEach(p => mats.push({
      id: p.id, code: p.revit || p.barcode || '', name: p.name,
      type: 'part', qty: p.qty || 0, min: p.min || 0, unit: p.unit, source: p.source, img: p.img,
    }));
    tops.forEach(t => mats.push({
      id: t.id, code: t.code, name: t.name,
      type: 'top', qty: 0, min: 0, unit: 'pcs', source: t.product,
    }));
    accessories.forEach(a => mats.push({
      id: a.id, code: a.code, name: a.name,
      type: 'accessory', qty: 0, min: 0, unit: a.unit, source: (a as any).source || 'local',
    }));
    return mats;
  }, [parts, tops, accessories]);

  const filteredMats = useMemo(() => {
    let res = allMaterials;
    if (deb) res = res.filter(m => m.name.toLowerCase().includes(deb) || m.code.toLowerCase().includes(deb));
    if (matType !== 'all') res = res.filter(m => m.type === matType);
    return res;
  }, [allMaterials, deb, matType]);

  const filteredMovements = useMemo(() => {
    if (!deb) return movements;
    return movements.filter(m => m.partName.toLowerCase().includes(deb) || (m.reason && m.reason.toLowerCase().includes(deb)));
  }, [movements, deb]);

  const totalIn = movements.filter(m => m.type === 'in' || m.type === 'return').reduce((s, m) => s + m.qty, 0);
  const totalOut = movements.filter(m => m.type === 'out').reduce((s, m) => s + m.qty, 0);

  const openStockCard = (m: UnifiedMaterial) => { setScItem(m); setScOpen(true); };

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-blue-500" /><p className="text-xs text-gray-500">المواد</p></div>
          <p className="text-2xl font-bold text-blue-700">{allMaterials.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><ArrowDownLeft className="w-4 h-4 text-green-500" /><p className="text-xs text-gray-500">إجمالي الوارد</p></div>
          <p className="text-2xl font-bold text-green-700">{totalIn}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><ArrowUpRight className="w-4 h-4 text-red-500" /><p className="text-xs text-gray-500">إجمالي الصادر</p></div>
          <p className="text-2xl font-bold text-red-700">{totalOut}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1"><RefreshCw className="w-4 h-4 text-purple-500" /><p className="text-xs text-gray-500">حركات المخزون</p></div>
          <p className="text-2xl font-bold text-purple-700">{stockTransactions.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <Search className="w-4 h-4 text-gray-400" />
          <Input placeholder="البحث..." value={search} onChange={e => handleSearch(e.target.value)} className="flex-1 text-sm" />
          {search && <button onClick={() => handleSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setTab('materials')} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${tab === 'materials' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            المواد ({filteredMats.length})
          </button>
          <button onClick={() => setTab('movements')} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${tab === 'movements' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            الحركات ({filteredMovements.length})
          </button>
        </div>
      </div>

      {/* MATERIALS TAB */}
      {tab === 'materials' && (
        <>
          {/* Type filter */}
          <div className="flex gap-2 px-1">
            <button onClick={() => setMatType('all')} className={`text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors ${matType === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              الكل ({allMaterials.length})
            </button>
            <button onClick={() => setMatType('part')} className={`text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${matType === 'part' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
              <Cog className="w-3 h-3" /> قطع ({parts.length})
            </button>
            <button onClick={() => setMatType('top')} className={`text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${matType === 'top' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
              <Square className="w-3 h-3" /> توبات ({tops.length})
            </button>
            <button onClick={() => setMatType('accessory')} className={`text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${matType === 'accessory' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}>
              <Layers className="w-3 h-3" /> اكسسوارات ({accessories.length})
            </button>
          </div>

          {/* Materials Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50/50">
                  <th className="text-right text-xs font-bold p-3">#</th>
                  <th className="text-right text-xs font-bold p-3">النوع</th>
                  <th className="text-right text-xs font-bold p-3">الكود</th>
                  <th className="text-right text-xs font-bold p-3">الاسم</th>
                  <th className="text-right text-xs font-bold p-3">الرصيد</th>
                  <th className="text-right text-xs font-bold p-3">الحد الأدنى</th>
                  <th className="text-right text-xs font-bold p-3">الوحدة</th>
                  <th className="text-right text-xs font-bold p-3">المصدر</th>
                  <th className="text-right text-xs font-bold p-3 w-24">بطاقة</th>
                </tr></thead>
                <tbody>
                  {filteredMats.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">
                      <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p>لا توجد مواد مطابقة</p>
                    </td></tr>
                  ) : filteredMats.map((m, i) => {
                    const typeCfg = {
                      part: { label: 'قطعة', bg: 'bg-blue-50', text: 'text-blue-700', icon: Cog },
                      top: { label: 'توب', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Square },
                      accessory: { label: 'اكسسوار', bg: 'bg-purple-50', text: 'text-purple-700', icon: Layers },
                    }[m.type];
                    const Icon = typeCfg.icon;
                    // Stock progress bar logic
                    const isZero = m.qty === 0;
                    const hasMin = m.min > 0;
                    const progress = hasMin ? Math.min(100, Math.round((m.qty / m.min) * 100)) : (m.qty > 0 ? 100 : 0);
                    const barColor = isZero ? 'bg-red-500' : progress <= 30 ? 'bg-amber-500' : 'bg-emerald-500';
                    const rowBg = isZero ? 'bg-red-50/70' : '';
                    return (
                      <tr key={`${m.type}_${m.id}`} className={`border-t hover:bg-gray-50/30 transition-colors cursor-pointer ${rowBg}`} onClick={() => openStockCard(m)}>
                        <td className="p-3 text-xs text-gray-500">{i + 1}</td>
                        <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${typeCfg.bg} ${typeCfg.text}`}><Icon className="w-3 h-3" />{typeCfg.label}</span></td>
                        <td className="p-3 text-xs font-mono text-gray-600">{m.code}</td>
                        <td className="p-3 text-xs font-medium">{m.name}</td>
                        <td className="p-3 text-xs">
                          {/* Stock progress bar */}
                          <div className="flex items-center gap-2 w-32">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${progress}%` }} />
                            </div>
                            <span className={`text-[10px] font-bold w-8 text-left ${isZero ? 'text-red-600' : 'text-gray-600'}`}>{m.qty}</span>
                          </div>
                        </td>
                        <td className="p-3 text-xs">
                          {hasMin && <span className="text-[10px] text-gray-400">min: {m.min}</span>}
                        </td>
                        <td className="p-3 text-xs text-gray-500">{m.unit}</td>
                        <td className="p-3 text-xs">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${m.source === 'local' || m.source === 'internal' ? 'bg-green-100 text-green-700' : m.source === 'import' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                            {m.source === 'local' || m.source === 'internal' ? 'محلي' : m.source === 'import' ? 'مستورد' : m.source || '—'}
                          </span>
                        </td>
                        <td className="p-3" onClick={e => { e.stopPropagation(); openStockCard(m); }}>
                          <button className="flex items-center gap-1 text-[10px] bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 px-2 py-1 rounded-lg transition-colors">
                            <History className="w-3 h-3" /> عرض
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MOVEMENTS TAB */}
      {tab === 'movements' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/50">
                <th className="text-right text-xs font-bold p-3">#</th>
                <th className="text-right text-xs font-bold p-3">النوع</th>
                <th className="text-right text-xs font-bold p-3">الصنف</th>
                <th className="text-right text-xs font-bold p-3">الكمية</th>
                <th className="text-right text-xs font-bold p-3">الرصيد بعد</th>
                <th className="text-right text-xs font-bold p-3">السبب</th>
                <th className="text-right text-xs font-bold p-3">التاريخ</th>
              </tr></thead>
              <tbody>
                {filteredMovements.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">لا توجد حركات</td></tr>
                ) : filteredMovements.map((m, i) => {
                  const typeInfo = TYPE_LABELS[m.type] || TYPE_LABELS.adj;
                  const Icon = typeInfo.icon;
                  return (
                    <tr key={m.id} className="border-t hover:bg-gray-50/30 transition-colors">
                      <td className="p-3 text-xs text-gray-500">{i + 1}</td>
                      <td className="p-3"><span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${typeInfo.badgeBg} ${typeInfo.color}`}><Icon className="w-3 h-3" />{typeInfo.label}</span></td>
                      <td className="p-3 text-xs font-medium">{m.partName}</td>
                      <td className="p-3 text-xs font-bold">{m.qty}</td>
                      <td className="p-3 text-xs">{m.afterQty ?? '—'}</td>
                      <td className="p-3 text-xs text-gray-500">{m.reason || '—'}</td>
                      <td className="p-3 text-xs text-gray-400">{new Date(m.date).toLocaleDateString('ar-SA')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Card Dialog */}
      {scItem && (
        <StockCard
          open={scOpen}
          onClose={() => { setScOpen(false); setScItem(null); }}
          itemId={scItem.id}
          itemType={scItem.type}
          itemName={scItem.name}
          itemCode={scItem.code}
          currentQty={scItem.qty}
        />
      )}
    </div>
  );
}
