// ============================================================
// المستودع — Warehouse (merged with Stock)
// All materials: parts + tops + accessories
// Stock progress bar, stock card, movements, alerts
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { useDataStore } from '@/store/dataStore';
import type { Movement } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StockCard from '@/components/StockCard';
import {
  WarehouseIcon, Plus, ArrowDownLeft, ArrowUpRight, RefreshCw, AlertTriangle,
  PackageOpen, Search, X, Cog, Square, Layers, History,
  Package, BarChart3, TrendingDown, CircleDollarSign,
} from 'lucide-react';

const TYPE_LABELS: Record<string, { label: string; color: string; badgeBg: string; icon: typeof ArrowDownLeft }> = {
  in: { label: 'وارد', color: 'text-green-700', badgeBg: 'bg-green-100', icon: ArrowDownLeft },
  out: { label: 'صادر', color: 'text-red-700', badgeBg: 'bg-red-100', icon: ArrowUpRight },
  adj: { label: 'تعديل', color: 'text-amber-700', badgeBg: 'bg-amber-100', icon: RefreshCw },
  return: { label: 'إرجاع', color: 'text-blue-700', badgeBg: 'bg-blue-100', icon: RefreshCw },
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

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function nowTS() { return new Date().toISOString(); }

export default function Warehouse() {
  const { parts, tops, accessories, movements, stockTransactions, updatePart, addMovement } = useDataStore();

  // ─── Search & Filter State ───
  const [search, setSearch] = useState('');
  const [deb, setDeb] = useState('');
  const [tab, setTab] = useState<TabType>('materials');
  const [matType, setMatType] = useState<MatType>('all');

  // ─── Movement Dialog ───
  const [isOpen, setIsOpen] = useState(false);
  const [mType, setMType] = useState<'in' | 'out' | 'adj' | 'return'>('in');
  const [partId, setPartId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');

  // ─── Stock Card ───
  const [scOpen, setScOpen] = useState(false);
  const [scItem, setScItem] = useState<UnifiedMaterial | null>(null);

  // Debounced search
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => setDeb(v.trim().toLowerCase()), 300);
    setSearchTimer(t);
  };
  useEffect(() => {
    return () => { if (searchTimer) clearTimeout(searchTimer); };
  }, [searchTimer]);

  const selectedPart = parts.find(p => p.id === partId);

  // ─── Save Movement ───
  const handleSave = () => {
    if (!partId || !qty) return;
    const q = Number(qty);
    if (!q) return;
    const part = parts.find(p => p.id === partId);
    if (!part) return;

    let newQty = part.qty;
    if (mType === 'in') newQty += q;
    else if (mType === 'out') newQty = Math.max(0, newQty - q);
    else if (mType === 'adj') newQty = q;
    else if (mType === 'return') newQty += q;

    const movement: Movement = {
      id: uid(), partId, partName: part.name, partType: part.type,
      type: mType, qty: q, reason: reason.trim() || undefined,
      source: 'manual', afterQty: newQty, date: nowTS(), createdAt: nowTS(),
    };
    updatePart(partId, { qty: newQty });
    addMovement(movement);
    setIsOpen(false);
    setPartId(''); setQty(''); setReason('');
  };

  // ─── Build unified materials ───
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

  // ─── Stats ───
  const lowStock = useMemo(() => allMaterials.filter(m => m.qty <= m.min && m.min > 0), [allMaterials]);
  const zeroStock = useMemo(() => allMaterials.filter(m => m.qty === 0), [allMaterials]);
  const totalIn = movements.filter(m => m.type === 'in' || m.type === 'return').reduce((s, m) => s + m.qty, 0);
  const totalOut = movements.filter(m => m.type === 'out').reduce((s, m) => s + m.qty, 0);

  const openStockCard = (m: UnifiedMaterial) => { setScItem(m); setScOpen(true); };

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">

      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
            <WarehouseIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold">المستودع</p>
            <p className="text-[10px] text-gray-400">{allMaterials.length} مادة | {movements.length} حركة | {stockTransactions.length} عملية</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setIsOpen(true)} className="gap-1 bg-gradient-to-r from-purple-600 to-indigo-600">
          <Plus className="w-4 h-4" /> حركة جديدة
        </Button>
      </div>

      {/* ═══ Stats Cards ═══ */}
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
          <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-purple-500" /><p className="text-xs text-gray-500">عمليات المخزون</p></div>
          <p className="text-2xl font-bold text-purple-700">{stockTransactions.length}</p>
        </div>
      </div>

      {/* ═══ Alerts ═══ */}
      {zeroStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <p className="text-xs font-bold text-red-700">تنبيه: {zeroStock.length} مادة رصيدها صفر</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {zeroStock.slice(0, 8).map(m => (
              <button key={`${m.type}_${m.id}`} onClick={() => openStockCard(m)} className="text-[10px] bg-white border border-red-200 rounded-lg px-2 py-1 hover:bg-red-100 transition-colors">
                {m.name} ({m.code})
              </button>
            ))}
            {zeroStock.length > 8 && <span className="text-[10px] text-red-500">+{zeroStock.length - 8} أخرى</span>}
          </div>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-bold text-amber-700">تنبيه: {lowStock.length} مادة منخفضة المخزون</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.slice(0, 8).map(m => (
              <button key={`${m.type}_${m.id}`} onClick={() => openStockCard(m)} className="text-[10px] bg-white border border-amber-200 rounded-lg px-2 py-1 hover:bg-amber-100 transition-colors">
                {m.name}: {m.qty}/{m.min}
              </button>
            ))}
            {lowStock.length > 8 && <span className="text-[10px] text-amber-500">+{lowStock.length - 8} أخرى</span>}
          </div>
        </div>
      )}

      {/* ═══ Toolbar ═══ */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <Search className="w-4 h-4 text-gray-400" />
          <Input placeholder="البحث في المواد أو الحركات..." value={search} onChange={e => handleSearch(e.target.value)} className="flex-1 text-sm" />
          {search && <button onClick={() => handleSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setTab('materials')} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${tab === 'materials' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            المواد ({filteredMats.length})
          </button>
          <button onClick={() => setTab('movements')} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${tab === 'movements' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            الحركات ({filteredMovements.length})
          </button>
        </div>
      </div>

      {/* ═══ MATERIALS TAB ═══ */}
      {tab === 'materials' && (
        <>
          {/* Type filters */}
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

          {/* Materials Table */}
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
                      <PackageOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p>لا توجد مواد مطابقة</p>
                    </td></tr>
                  ) : filteredMats.map((m, i) => {
                    const typeCfg = {
                      part: { label: 'قطعة', bg: 'bg-blue-50', text: 'text-blue-700', icon: Cog },
                      top: { label: 'توب', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Square },
                      accessory: { label: 'اكسسوار', bg: 'bg-purple-50', text: 'text-purple-700', icon: Layers },
                    }[m.type];
                    const Icon = typeCfg.icon;
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
                          <div className="flex items-center gap-2 w-32">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${progress}%` }} />
                            </div>
                            <span className={`text-[10px] font-bold w-8 text-left ${isZero ? 'text-red-600' : 'text-gray-600'}`}>{m.qty}</span>
                          </div>
                        </td>
                        <td className="p-3 text-xs">{hasMin && <span className="text-[10px] text-gray-400">min: {m.min}</span>}</td>
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

      {/* ═══ MOVEMENTS TAB ═══ */}
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

      {/* ═══ Movement Dialog ═══ */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto pb-8" dir="rtl">
          <DialogHeader><DialogTitle className="text-base">حركة مخزون</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-4 gap-1">
              <button onClick={() => setMType('in')} className={`py-2 rounded-lg text-[10px] font-bold ${mType==='in'?'bg-green-600 text-white':'bg-gray-100 text-gray-600'}`}><ArrowDownLeft className="w-3 h-3 inline ml-1"/>وارد</button>
              <button onClick={() => setMType('out')} className={`py-2 rounded-lg text-[10px] font-bold ${mType==='out'?'bg-red-600 text-white':'bg-gray-100 text-gray-600'}`}><ArrowUpRight className="w-3 h-3 inline ml-1"/>صادر</button>
              <button onClick={() => setMType('adj')} className={`py-2 rounded-lg text-[10px] font-bold ${mType==='adj'?'bg-amber-500 text-white':'bg-gray-100 text-gray-600'}`}><RefreshCw className="w-3 h-3 inline ml-1"/>تعديل</button>
              <button onClick={() => setMType('return')} className={`py-2 rounded-lg text-[10px] font-bold ${mType==='return'?'bg-blue-600 text-white':'bg-gray-100 text-gray-600'}`}>إرجاع</button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">الصنف *</label>
              <select value={partId} onChange={e => setPartId(e.target.value)} className="w-full h-9 text-sm rounded-md border border-input bg-background px-2">
                <option value="">اختر...</option>
                {parts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.revit}) — رصيد: {p.qty}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">الكمية *</label><Input type="number" value={qty} onChange={e => setQty(e.target.value)} className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">السبب</label><Input value={reason} onChange={e => setReason(e.target.value)} className="text-sm" /></div>
            </div>
            {selectedPart && <p className="text-[10px] text-gray-500">الرصيد الحالي: {selectedPart.qty} → بعد العملية: {mType === 'in' ? selectedPart.qty + Number(qty || 0) : mType === 'out' ? Math.max(0, selectedPart.qty - Number(qty || 0)) : Number(qty || selectedPart.qty)}</p>}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>إلغاء</Button>
              <Button size="sm" onClick={handleSave} className="bg-gradient-to-r from-purple-600 to-indigo-600">حفظ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Stock Card Dialog ═══ */}
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
