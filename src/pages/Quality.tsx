import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { usePermissionStore } from '@/store/permissionStore';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { RejectedItem, Inspection, InspectionItem } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Trash2, X, XCircle, FileBarChart, ShieldAlert, CheckCircle, ImageIcon, BarChart3, TrendingUp, AlertTriangle, Warehouse, Boxes, Send, RotateCcw, ZoomIn } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function today() { return new Date().toISOString().split('T')[0]; }

export default function Quality() {
  const { t: _t, i18n } = useTranslation();
  const { parts, tops, accessories, products, batches, projects, rejected, inspections, addRejected, updateRejected, deleteRejected, addInspection, deleteInspection } = useDataStore();
  const { user } = useAuthStore();
  const { canEdit } = usePermissionStore();
  const notifStore = useNotificationStore();
  const [tab, setTab] = useState('rejected');
  const [search, setSearch] = useState('');
  const [deb, setDeb] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  // ─── Rejected form state ───
  const [rejPart, setRejPart] = useState('');
  const [rejQty, setRejQty] = useState('');
  const [rejDate, setRejDate] = useState(today());
  const [rejReason, setRejReason] = useState('');
  const [rejNotes, setRejNotes] = useState('');
  const [rejImg, setRejImg] = useState('');
  // Source fields
  const [rejSourceType, setRejSourceType] = useState<'warehouse' | 'batch'>('warehouse');
  const [rejShipmentNo, setRejShipmentNo] = useState('');
  const [rejProjectId, setRejProjectId] = useState('');
  const [rejBatchId, setRejBatchId] = useState('');

  const [inspTitle, setInspTitle] = useState('');
  const [inspDate, setInspDate] = useState(today());
  const [inspItems, setInspItems] = useState<InspectionItem[]>([]);

  let timer: ReturnType<typeof setTimeout>;
  const handleSearch = (v: string) => { setSearch(v); clearTimeout(timer); timer = setTimeout(() => setDeb(v.trim().toLowerCase()), 300); };
  const filteredRej = useMemo(() => { if (!deb) return rejected; return rejected.filter(r => r.partName.toLowerCase().includes(deb) || r.reason.toLowerCase().includes(deb) || (r.shipmentNo || '').includes(deb) || (r.batchName || '').includes(deb)); }, [rejected, deb]);
  const filteredInsp = useMemo(() => { if (!deb) return inspections; return inspections.filter(i => i.title.toLowerCase().includes(deb)); }, [inspections, deb]);

  const saveRejected = () => {
    if (!rejPart || !rejReason) return;
    // Find item in parts, tops, or accessories
    const p = parts.find(x => x.id === rejPart)
           || tops.find(x => x.id === rejPart)
           || accessories.find(x => x.id === rejPart);
    if (!p) return;
    const selectedProject = projects.find(pr => pr.id === rejProjectId);
    const selectedBatch = batches.find(b => b.id === rejBatchId);
    const data: RejectedItem = {
      id: uid(),
      partId: p.id,
      partCode: (p as any).revit || (p as any).code || '',
      partName: p.name,
      qty: Number(rejQty) || 1,
      date: rejDate,
      reason: rejReason,
      img: rejImg || null,
      notes: rejNotes.trim() || undefined,
      userName: user?.name || 'مستخدم',
      status: 'rejected',
      sourceType: rejSourceType,
      shipmentNo: rejSourceType === 'warehouse' ? rejShipmentNo.trim() || undefined : undefined,
      projectName: rejSourceType === 'warehouse' ? (selectedProject?.name || undefined) : undefined,
      batchId: rejSourceType === 'batch' ? rejBatchId || undefined : undefined,
      batchName: rejSourceType === 'batch' ? (selectedBatch?.name || undefined) : undefined,
      replacementStatus: rejSourceType === 'batch' ? 'pending' : 'none',
      createdAt: today(),
    };
    addRejected(data);
    // Send notification for batch-source rejections
    if (rejSourceType === 'batch' && selectedBatch) {
      notifStore.sendDesktop(
        '⚠️ قطعة مرفوضة من دفعة',
        `${p.name} (${(p as any).revit || (p as any).code || ''}) — الدفعة: ${selectedBatch.name} — يتطلب استبدال`,
        '/batches'
      );
    }
    setIsOpen(false);
    resetRejectedForm();
  };

  const resetRejectedForm = () => {
    setRejPart(''); setRejQty(''); setRejReason(''); setRejNotes(''); setRejImg('');
    setRejShipmentNo(''); setRejProjectId(''); setRejBatchId(''); setRejSourceType('warehouse');
  };

  const requestReplacement = (item: RejectedItem) => {
    updateRejected(item.id, { replacementStatus: 'requested' });
    notifStore.sendDesktop(
      '🔄 طلب استبدال قطعة',
      `قطعة مرفوضة: ${item.partName} — الدفعة: ${item.batchName} — يتطلب استبدال`,
      '/batches'
    );
  };

  const addInspItem = () => setInspItems([...inspItems, { name: '', result: 'pass' }]);
  const updateInspItem = (i: number, f: string, v: string) => { const u = [...inspItems]; u[i] = { ...u[i], [f]: v }; setInspItems(u); };
  const delInspItem = (i: number) => setInspItems(inspItems.filter((_, idx) => idx !== i));
  const saveInspection = () => { if (!inspTitle || inspItems.length === 0) return; const hasFails = inspItems.some(it => it.result === 'fail'); const data: Inspection = { id: uid(), title: inspTitle, date: inspDate, inspector: user?.name, items: inspItems, status: hasFails ? 'fail' : 'pass', createdAt: today() }; addInspection(data); setIsOpen(false); setInspTitle(''); setInspItems([]); };

  const resolveRejected = (id: string) => { updateRejected(id, { status: 'resolved', resolution: 'تم الحل', resolvedAt: today() }); };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]"><Search className="w-4 h-4 text-gray-400" /><Input placeholder="البحث..." value={search} onChange={e => handleSearch(e.target.value)} className="flex-1 text-sm" />{search && <button onClick={() => handleSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>}</div>
        {canEdit(user?.role || '', 'rejected') && <Button size="sm" onClick={() => { if (tab === 'rejected') { setRejPart(''); setRejQty(''); setRejReason(''); setRejNotes(''); setRejDate(today()); } else { setInspTitle(''); setInspDate(today()); setInspItems([]); } setIsOpen(true); }} className="gap-1 bg-gradient-to-r from-red-500 to-red-600"><Plus className="w-4 h-4" /> {tab === 'rejected' ? 'قطعة مرفوضة' : 'فحص جديد'}</Button>}
      </div>
      <Tabs value={tab} onValueChange={setTab} dir="rtl"><TabsList className="bg-white border"><TabsTrigger value="rejected" className="text-xs gap-1"><XCircle className="w-3.5 h-3.5" /> القطع المرفوضة</TabsTrigger><TabsTrigger value="inspections" className="text-xs gap-1"><FileBarChart className="w-3.5 h-3.5" /> فحوصات الجودة</TabsTrigger><TabsTrigger value="reports" className="text-xs gap-1"><BarChart3 className="w-3.5 h-3.5" /> تقارير الجودة</TabsTrigger></TabsList>
        <TabsContent value="rejected" className="mt-4">
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-gray-50/50"><th className="text-right text-xs font-bold p-3">#</th><th className="text-right text-xs font-bold p-3">الصورة</th><th className="text-right text-xs font-bold p-3">القطعة</th><th className="text-right text-xs font-bold p-3">الكود</th><th className="text-right text-xs font-bold p-3">المصدر</th><th className="text-right text-xs font-bold p-3">الكمية</th><th className="text-right text-xs font-bold p-3">التاريخ</th><th className="text-right text-xs font-bold p-3">السبب</th><th className="text-right text-xs font-bold p-3">الحالة</th><th className="text-right text-xs font-bold p-3 w-28">إجراءات</th></tr></thead>
              <tbody>{filteredRej.length === 0 ? (<tr><td colSpan={10} className="text-center py-12 text-gray-400 text-sm">لا توجد قطع مرفوضة</td></tr>) : (filteredRej.map((r, i) => (<tr key={r.id} className="border-t hover:bg-red-50/10"><td className="p-3 text-xs text-gray-500">{i + 1}</td><td className="p-3">{r.img ? (<button onClick={() => setZoomImg(r.img || '')} className="relative group"><img src={r.img} alt="" className="w-10 h-10 rounded-lg object-cover border" /><div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ZoomIn className="w-3 h-3 text-white" /></div></button>) : (<span className="text-gray-300 text-xs">—</span>)}</td><td className="p-3 text-xs font-medium">{r.partName}</td><td className="p-3 text-xs font-mono text-red-600">{r.partCode}</td><td className="p-3 text-xs">
                {r.sourceType === 'warehouse' ? (
                  <span className="flex items-center gap-1 text-amber-600"><Warehouse className="w-3 h-3" /> {r.shipmentNo || 'مستودع'}</span>
                ) : (
                  <span className="flex items-center gap-1 text-blue-600"><Boxes className="w-3 h-3" /> {r.batchName || 'دفعة'}</span>
                )}
              </td><td className="p-3 text-xs font-bold">{r.qty}</td><td className="p-3 text-xs">{r.date}</td><td className="p-3 text-xs">{r.reason}</td><td className="p-3">
                {r.status === 'rejected' ? (
                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">مرفوض</span>
                ) : (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">محلول</span>
                )}
              </td><td className="p-3"><div className="flex gap-1">
                {r.sourceType === 'batch' && r.status === 'rejected' && r.replacementStatus !== 'requested' && (
                  <button onClick={() => requestReplacement(r)} className="text-[10px] text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded bg-blue-50 flex items-center gap-1"><Send className="w-3 h-3" /> طلب استبدال</button>
                )}
                {r.replacementStatus === 'requested' && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full">تم الطلب</span>
                )}
                {r.status === 'rejected' && <button onClick={() => resolveRejected(r.id)} className="text-[10px] text-green-600 hover:text-green-800 font-bold px-2 py-1 rounded bg-green-50">حل</button>}
                <button onClick={() => { if (confirm('هل أنت متأكد؟')) deleteRejected(r.id); }} className="p-1.5 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
              </div></td></tr>)))}</tbody>
            </table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredRej.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
                <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p className="text-sm">لا توجد قطع مرفوضة</p>
              </div>
            ) : (
              filteredRej.map(r => (
                <div key={r.id} className={`bg-white rounded-xl shadow-sm border p-4 space-y-3 ${r.sourceType === 'batch' ? 'border-blue-100' : 'border-gray-100'}`}>
                  {r.img && (
                    <div className="relative group cursor-pointer" onClick={() => setZoomImg(r.img || '')}>
                      <img src={r.img} alt="" className="w-full h-32 rounded-lg object-cover border" />
                      <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-800">{r.partName}</p>
                        {r.sourceType === 'batch' ? (
                          <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Boxes className="w-2.5 h-2.5" /> دفعة</span>
                        ) : (
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Warehouse className="w-2.5 h-2.5" /> مستودع</span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-red-600">{r.partCode}</p>
                      <p className="text-xs text-gray-500 mt-1">{r.date} | الكمية: {r.qty}</p>
                      {r.sourceType === 'warehouse' && r.shipmentNo && (
                        <p className="text-[10px] text-amber-600">شحنة: {r.shipmentNo} {r.projectName ? `• ${r.projectName}` : ''}</p>
                      )}
                      {r.sourceType === 'batch' && r.batchName && (
                        <p className="text-[10px] text-blue-600">دفعة: {r.batchName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {r.status === 'rejected' && <button onClick={() => resolveRejected(r.id)} className="text-[10px] text-green-600 hover:text-green-800 font-bold px-2 py-1 rounded bg-green-50">حل</button>}
                      <button onClick={() => { if (confirm('هل أنت متأكد؟')) deleteRejected(r.id); }} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">السبب:</span>
                      <span className="text-xs">{r.reason}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">الحالة:</span>
                      {r.status === 'rejected' ? <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">مرفوض</span> : <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">محلول</span>}
                    </div>
                    {r.sourceType === 'batch' && r.status === 'rejected' && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-gray-400">الاستبدال:</span>
                        {r.replacementStatus === 'pending' && (
                          <button onClick={() => requestReplacement(r)} className="text-[10px] text-blue-600 hover:text-blue-800 font-bold px-2 py-1 rounded bg-blue-50 flex items-center gap-1"><Send className="w-3 h-3" /> إرسال طلب</button>
                        )}
                        {r.replacementStatus === 'requested' && <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full">تم إرسال الطلب</span>}
                        {r.replacementStatus === 'replaced' && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded-full">تم الاستبدال</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="inspections" className="mt-4 space-y-3">{filteredInsp.length === 0 ? (<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 text-sm"><CheckCircle className="w-10 h-10 mx-auto mb-3 text-gray-200" />لا توجد فحوصات</div>) : (filteredInsp.map(insp => (<div key={insp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><p className="text-sm font-bold">{insp.title}</p><span className={`text-[10px] px-2 py-0.5 rounded-full ${insp.status === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{insp.status === 'pass' ? '✅ ناجح' : '❌ راسب'}</span></div><div className="flex gap-1"><button onClick={() => { if (confirm('هل أنت متأكد؟')) deleteInspection(insp.id); }} className="p-1.5 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button></div></div><p className="text-[10px] text-gray-400 mb-2">{insp.date} | {insp.inspector || '—'}</p><div className="flex flex-wrap gap-2">{insp.items.map((it, idx) => (<span key={idx} className={`text-[10px] px-2 py-0.5 rounded-full ${it.result === 'pass' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{it.name}: {it.result === 'pass' ? '✓' : '✗'}</span>))}</div></div>)))}</TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4 space-y-3">
          <QualityReports rejected={rejected} inspections={inspections} />
        </TabsContent>
      </Tabs>
      <Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto pb-8" dir="rtl"><DialogHeader><DialogTitle className="text-base">{tab === 'rejected' ? 'تسجيل قطعة مرفوضة' : tab === 'inspections' ? 'فحص جودة جديد' : 'تقرير جديد'}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-4">
          {tab === 'rejected' ? (<>
            {/* Source Type Selection */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">مصدر القطعة *</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRejSourceType('warehouse')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${rejSourceType === 'warehouse' ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Warehouse className="w-4 h-4" /> المستودع
                </button>
                <button
                  onClick={() => setRejSourceType('batch')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${rejSourceType === 'batch' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Boxes className="w-4 h-4" /> دفعة (تصنيع)
                </button>
              </div>
            </div>
            {/* Warehouse fields */}
            {rejSourceType === 'warehouse' && (
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 space-y-3">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1"><Warehouse className="w-3.5 h-3.5" /> بيانات المستودع</p>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">رقم الشحنة الواردة</label>
                  <Input value={rejShipmentNo} onChange={e => setRejShipmentNo(e.target.value)} placeholder="مثلاً: SH-2026-001" className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">المشروع</label>
                  <select value={rejProjectId} onChange={e => setRejProjectId(e.target.value)} className="w-full h-9 text-sm rounded-md border border-input bg-background px-2">
                    <option value="">اختر المشروع...</option>
                    {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
              </div>
            )}
            {/* Batch fields */}
            {rejSourceType === 'batch' && (
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 space-y-3">
                <p className="text-xs font-bold text-blue-700 flex items-center gap-1"><Boxes className="w-3.5 h-3.5" /> بيانات الدفعة</p>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">الدفعة *</label>
                  <select value={rejBatchId} onChange={e => setRejBatchId(e.target.value)} className="w-full h-9 text-sm rounded-md border border-input bg-background px-2">
                    <option value="">اختر الدفعة...</option>
                    {batches.map(b => (<option key={b.id} value={b.id}>{b.name} — {projects.find(p => p.id === b.projectId)?.name || 'مشروع'}</option>))}
                  </select>
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">القطعة *</label>
              <select value={rejPart} onChange={e => setRejPart(e.target.value)} className="w-full h-9 text-sm rounded-md border border-input bg-background px-2">
                <option value="">اختر...</option>
                {rejSourceType === 'batch' && rejBatchId
                  ? (() => {
                      const batch = batches.find(b => b.id === rejBatchId);
                      if (!batch) return null;
                      // Collect ALL item IDs from batch (parts + tops + accessories)
                      const batchItemIds = new Set<string>();
                      // From batch products: all components
                      batch.prods.forEach(pr => {
                        const prod = products.find(p => p.id === pr.id);
                        prod?.components?.forEach(c => { batchItemIds.add(c.id); });
                      });
                      // From extra items
                      batch.extraParts?.forEach(ep => batchItemIds.add(ep.itemId));
                      batch.extraTops?.forEach(et => batchItemIds.add(et.itemId));
                      batch.extraAccessories?.forEach(ea => batchItemIds.add(ea.itemId));
                      // Build unified list: parts + tops + accessories
                      const allItems = [
                        ...parts.filter(p => batchItemIds.has(p.id)).map(p => ({ id: p.id, name: p.name, code: p.revit, type: 'قطعة' as const })),
                        ...tops.filter(t => batchItemIds.has(t.id)).map(t => ({ id: t.id, name: t.name, code: t.code, type: 'توب' as const })),
                        ...accessories.filter(a => batchItemIds.has(a.id)).map(a => ({ id: a.id, name: a.name, code: a.code, type: 'اكسسوار' as const })),
                      ];
                      return allItems.length > 0
                        ? allItems.map(it => (<option key={it.id} value={it.id}>{it.name} ({it.code}) — {it.type}</option>))
                        : <option value="" disabled>لا توجد عناصر في هذه الدفعة</option>;
                    })()
                  : [
                      ...parts.map(p => ({ id: p.id, name: p.name, code: p.revit, type: 'قطعة' })),
                      ...tops.map(t => ({ id: t.id, name: t.name, code: t.code, type: 'توب' })),
                      ...accessories.map(a => ({ id: a.id, name: a.name, code: a.code, type: 'اكسسوار' })),
                    ].map(it => (<option key={it.id} value={it.id}>{it.name} ({it.code}) — {it.type}</option>))
                }
              </select>
              {rejSourceType === 'batch' && rejBatchId && (
                <p className="text-[10px] text-blue-500 mt-1">تظهر قطع الدفعة فقط</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-600 block mb-1">الكمية</label><Input type="number" value={rejQty} onChange={e => setRejQty(e.target.value)} className="text-sm" /></div><div><label className="text-xs font-semibold text-gray-600 block mb-1">التاريخ</label><Input type="date" value={rejDate} onChange={e => setRejDate(e.target.value)} className="text-sm" /></div></div>
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">سبب الرفض *</label><Input value={rejReason} onChange={e => setRejReason(e.target.value)} className="text-sm" placeholder="وصف سبب الرفض" /></div>
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">ملاحظات</label><Input value={rejNotes} onChange={e => setRejNotes(e.target.value)} className="text-sm" /></div>
            <ImageUpload value={rejImg} onChange={setRejImg} label="صورة القطعة المرفوضة" />
          </>) : (<>
            <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-600 block mb-1">العنوان *</label><Input value={inspTitle} onChange={e => setInspTitle(e.target.value)} className="text-sm" placeholder="فحص دفعة رقم..." /></div><div><label className="text-xs font-semibold text-gray-600 block mb-1">التاريخ</label><Input type="date" value={inspDate} onChange={e => setInspDate(e.target.value)} className="text-sm" /></div></div>
            <div className="border border-red-200 rounded-xl p-3 bg-red-50/20"><div className="flex justify-between mb-2"><p className="text-xs font-bold text-red-700">عناصر الفحص</p><Button size="sm" variant="outline" onClick={addInspItem} className="text-xs h-7"><Plus className="w-3 h-3" /> إضافة</Button></div>
            {inspItems.map((it, i) => (<div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center"><div className="col-span-7"><Input value={it.name} onChange={e => updateInspItem(i, 'name', e.target.value)} className="text-xs h-8" placeholder="عنصر الفحص" /></div><div className="col-span-3"><select value={it.result} onChange={e => updateInspItem(i, 'result', e.target.value)} className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"><option value="pass">✓ ناجح</option><option value="fail">✗ راسب</option></select></div><div className="col-span-2"><button onClick={() => delInspItem(i)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button></div></div>))}
            {inspItems.length === 0 && <p className="text-[10px] text-gray-400 text-center py-2">لا توجد عناصر</p>}</div>
          </>)}
          <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" size="sm" onClick={() => { setIsOpen(false); setRejImg(''); }}>إلغاء</Button><Button size="sm" onClick={tab === 'rejected' ? saveRejected : saveInspection} className="bg-gradient-to-r from-red-500 to-red-600">حفظ</Button></div>
        </div>
      </DialogContent></Dialog>

      {/* Zoom Image Dialog */}
      <Dialog open={!!zoomImg} onOpenChange={() => setZoomImg(null)}>
        <DialogContent className="max-w-3xl max-h-[95dvh] p-2" dir="rtl">
          {zoomImg && (
            <div className="relative">
              <img src={zoomImg} alt="" className="w-full h-auto max-h-[80dvh] object-contain rounded-lg" />
              <button onClick={() => setZoomImg(null)} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Quality Reports Summary Component ───
function QualityReports({ rejected, inspections }: { rejected: RejectedItem[]; inspections: Inspection[] }) {
  const totalRejected = rejected.length;
  const resolvedRejected = rejected.filter(r => r.status === 'resolved').length;
  const pendingRejected = totalRejected - resolvedRejected;
  const totalInspections = inspections.length;
  const passInspections = inspections.filter(i => i.status === 'pass').length;
  const failInspections = inspections.filter(i => i.status === 'fail').length;

  // Monthly stats
  const thisMonth = new Date().toISOString().split('T')[0].slice(0, 7);
  const monthRejected = rejected.filter(r => r.createdAt?.startsWith(thisMonth)).length;
  const monthInspections = inspections.filter(i => i.createdAt?.startsWith(thisMonth)).length;

  return (
    <div className="space-y-3">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-800">{totalRejected}</p>
          <p className="text-[10px] text-gray-400">القطع المرفوضة</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-600">{resolvedRejected}</p>
          <p className="text-[10px] text-gray-400">المحلولة</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
          <FileBarChart className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-800">{totalInspections}</p>
          <p className="text-[10px] text-gray-400">الفحوصات</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
          <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-amber-600">{passInspections}</p>
          <p className="text-[10px] text-gray-400">الفحوصات الناجحة</p>
        </div>
      </div>

      {/* This Month Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
        <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          ملخص هذا الشهر ({thisMonth})
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/70 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{monthRejected}</p>
            <p className="text-[10px] text-gray-500">قطع مرفوضة</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{monthInspections}</p>
            <p className="text-[10px] text-gray-500">فحوصات</p>
          </div>
        </div>
      </div>

      {/* Inspection Pass Rate */}
      {totalInspections > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">نسبة نجاح الفحوصات</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all" style={{ width: `${(passInspections / totalInspections) * 100}%` }} />
            </div>
            <span className="text-sm font-bold text-emerald-600">{Math.round((passInspections / totalInspections) * 100)}%</span>
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>ناجح: {passInspections}</span>
            <span>راسب: {failInspections}</span>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-3">آخر النشاطات</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {[...rejected.map(r => ({ type: 'rejected' as const, date: r.createdAt, label: `قطعة مرفوضة: ${r.partName}`, status: r.status })), ...inspections.map(i => ({ type: 'inspection' as const, date: i.createdAt, label: `فحص: ${i.title}`, status: i.status }))]
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .slice(0, 10)
            .map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 py-2 border-b last:border-0">
                <div className={`w-2 h-2 rounded-full ${item.type === 'rejected' ? (item.status === 'resolved' ? 'bg-emerald-400' : 'bg-red-400') : item.status === 'pass' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-700 truncate">{item.label}</p>
                  <p className="text-[10px] text-gray-400">{item.date}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.type === 'rejected' ? (item.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700') : item.status === 'pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {item.type === 'rejected' ? (item.status === 'resolved' ? 'محلول' : 'مرفوض') : item.status === 'pass' ? 'ناجح' : 'راسب'}
                </span>
              </div>
            ))}
          {rejected.length === 0 && inspections.length === 0 && (
            <p className="text-[11px] text-gray-400 text-center py-4">لا توجد نشاطات</p>
          )}
        </div>
      </div>
    </div>
  );
}
