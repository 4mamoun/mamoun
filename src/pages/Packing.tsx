// ============================================================
// Packing — تعبئة الصناديق (Drag & Drop + 3D Validation + Weight)
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { usePermissionStore } from '@/store/permissionStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Boxes, Package, Plus, Minus, X, Trash2, GripVertical, ArrowRight, Weight, Ruler, AlertTriangle, ImageIcon, BoxSelect, LayoutTemplate, Hash, CheckCircle } from 'lucide-react';
import type { PickListItem, Box, Batch, BoxTemplate } from '@/types';
import { uploadImage, deleteImage } from '@/utils/storageUpload';
import BoxVisualizer from '@/components/BoxVisualizer';
import { DEFAULT_BOX_TEMPLATES, getNextBoxNumber } from '@/lib/templates';

// ─── 3D Toggle wrapper ───
function Box3DToggle({ boxLength, boxWidth, boxHeight, boxNum, items }: {
  boxLength: number; boxWidth: number; boxHeight: number; boxNum: string;
  items: { name: string; code: string; type: string; assignedQty: number; length?: number; width?: number; height?: number; weight?: number }[];
}) {
  const [show3D, setShow3D] = useState(false);
  return (
    <div>
      <button
        onClick={() => setShow3D(!show3D)}
        className={`w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg transition-all ${
          show3D ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600 hover:bg-cyan-50 hover:text-cyan-600'
        }`}
      >
        <BoxSelect className="w-4 h-4" />
        {show3D ? 'إخفاء الرسم 3D' : 'عرض توزيع القطع 3D'}
        <span className="text-[9px] bg-white/60 px-1.5 py-0.5 rounded-full">{items.reduce((s, i) => s + i.assignedQty, 0)} قطعة</span>
      </button>
      {show3D && (
        <div className="mt-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
          <BoxVisualizer boxLength={boxLength} boxWidth={boxWidth} boxHeight={boxHeight} boxNum={boxNum} items={items} />
        </div>
      )}
    </div>
  );
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function today() { return new Date().toISOString().split('T')[0]; }

type TrackedItem = PickListItem & { totalQty: number; remainingQty: number };
type BoxAssignedItem = PickListItem & { assignedQty: number };

// Generate pick list with weight & dimensions
function generatePickList(batch: Batch, products: any[], parts: any[], accessories: any[], tops: any[]) {
  const itemMap = new Map<string, PickListItem & { totalQty: number }>();
  const add = (code: string, name: string, type: 'part' | 'accessory' | 'top', source: 'local' | 'import', qty: number, unit: string, from: string, weight?: number, length?: number, width?: number, height?: number) => {
    const key = `${code}_${source}`;
    const ex = itemMap.get(key);
    if (ex) ex.qty += qty;
    else itemMap.set(key, { id: key, code, name, type, source, qty, unit, fromProduct: from, totalQty: qty, weight, length, width, height });
  };
  for (const bp of batch.prods || []) {
    const prod = products.find((p: any) => p.id === bp.id);
    if (!prod) continue;
    for (const c of prod.components || []) {
      const q = c.qty * bp.qty;
      if (c.compType === 'part' || c.compType === 'part-set') { const p = parts.find((x: any) => x.revit === c.code || x.id === c.id); if (p) add(p.revit, p.name, 'part', p.source, q, p.unit, prod.name, p.weight, Number(p.length)||0, Number(p.width)||0, Number(p.height)||0); }
      else if (c.compType === 'accessory' || c.compType === 'acc-set') { const a = accessories.find((x: any) => x.code === c.code || x.id === c.id); if (a) add(a.code, a.name, 'accessory', a.source || batch.source, q, a.unit, prod.name, a.weight); }
      else if (c.compType === 'top') { const t = tops.find((x: any) => x.code === c.code || x.id === c.id); if (t) add(t.code, t.name, 'top', t.product, q, 'pcs', prod.name, t.weight, t.length, t.width, t.thickness || 0); }
    }
  }
  for (const ep of batch.extraParts || []) { const p = parts.find((x: any) => x.id === ep.itemId); if (p) add(p.revit, p.name, 'part', p.source, ep.qty, p.unit, 'قطع متفرقة', p.weight, Number(p.length)||0, Number(p.width)||0, Number(p.height)||0); }
  for (const ea of batch.extraAccessories || []) { const a = accessories.find((x: any) => x.id === ea.itemId); add(ea.code, ea.name, 'accessory', a?.source || batch.source, ea.qty, 'pcs', 'اكسسوارات إضافية', a?.weight); }
  for (const et of batch.extraTops || []) { const t = tops.find((x: any) => x.id === et.itemId); if (t) add(t.code, t.name, 'top', t.product, et.qty, 'pcs', 'توبات إضافية', t.weight, t.length, t.width, t.thickness || 0); }
  // Return ALL items — both local and import. UI will auto-split by source.
  return Array.from(itemMap.values());
}

// 3D Validation
function validate3D(item: PickListItem, box: Box): { fits: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!box.boxLength || !box.boxWidth || !box.boxHeight) return { fits: true, issues };
  const il = item.length || 0, iw = item.width || 0, ih = item.height || 0;
  if (il === 0 && iw === 0 && ih === 0) return { fits: true, issues };
  const bl = box.boxLength, bw = box.boxWidth, bh = box.boxHeight;
  const orientations = [[il,iw,ih],[il,ih,iw],[iw,il,ih],[iw,ih,il],[ih,il,iw],[ih,iw,il]];
  const fitsAny = orientations.some(([l,w,h]) => l <= bl && w <= bw && h <= bh);
  if (!fitsAny) issues.push(`القطعة ${il}×${iw}×${ih} سم لا تتسع في ${bl}×${bw}×${bh} سم`);
  return { fits: fitsAny, issues };
}

// Weight calculation
function calcBoxWeight(box: Box): { itemsWeight: number; totalWeight: number } {
  const itemsWeight = (box.pickItems || []).reduce((sum: number, item: any) => sum + ((item.weight||0) * (item.assignedQty || item.qty || 1)), 0);
  return { itemsWeight, totalWeight: (Number(box.wgt)||0) + itemsWeight };
}

export default function Packing() {
  const { user } = useAuthStore();
  const { batches, projects, products, parts, accessories, tops, boxes, addBox, updateBox, deleteBox, reserveStock, releaseStock, updateBatch } = useDataStore();
  const { canEdit } = usePermissionStore();

  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [showCreateBox, setShowCreateBox] = useState(false);
  const [dragOverBox, setDragOverBox] = useState<string | null>(null);
  const [compressingBoxId, setCompressingBoxId] = useState<string | null>(null);
  const [compressInfo, setCompressInfo] = useState('');
  const [boxNum, setBoxNum] = useState('');
  const [boxType, setBoxType] = useState('Carton');
  const [boxWeight, setBoxWeight] = useState('');
  const [boxLength, setBoxLength] = useState('');
  const [boxWidth, setBoxWidth] = useState('');
  const [boxHeight, setBoxHeight] = useState('');
  const [boxMaxWeight, setBoxMaxWeight] = useState('');
  const [boxStackable, setBoxStackable] = useState(true);
  const [boxSource, setBoxSource] = useState<'local' | 'import'>('local');
  // Template selection
  const [selectedBoxTemplate, setSelectedBoxTemplate] = useState<BoxTemplate | null>(null);
  // Copy box
  const [copyFromBox, setCopyFromBox] = useState<Box | null>(null);

  // Qty dialog
  const [qtyDialog, setQtyDialog] = useState<{ open: boolean; item: PickListItem | null; maxQty: number; boxId: string }>({ open: false, item: null, maxQty: 0, boxId: '' });
  const [qtyInput, setQtyInput] = useState('');

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  // Show ALL batches for the project (both local AND import)
  const projectBatches = batches.filter(b => b.projectId === selectedProjectId);

  const allPickItems = useMemo(() => { if (!selectedBatch) return []; return generatePickList(selectedBatch, products, parts, accessories, tops); }, [selectedBatch, products, parts, accessories, tops]);

  const trackedItems: TrackedItem[] = useMemo(() => {
    return allPickItems.map(item => {
      const assigned = boxes.filter(b => b.batchId === selectedBatchId).flatMap(b => b.pickItems || []).filter((pi: any) => pi.id === item.id).reduce((sum: number, pi: any) => sum + (pi.assignedQty || pi.qty || 0), 0);
      return { ...item, totalQty: item.qty, remainingQty: Math.max(0, item.qty - assigned) };
    });
  }, [allPickItems, boxes, selectedBatchId]);

  const batchBoxes = boxes.filter(b => b.batchId === selectedBatchId);

  // Apply template values
  const applyBoxTemplate = (tpl: BoxTemplate) => {
    setSelectedBoxTemplate(tpl);
    setBoxType(tpl.type);
    setBoxLength(tpl.boxLength ? String(tpl.boxLength) : '');
    setBoxWidth(tpl.boxWidth ? String(tpl.boxWidth) : '');
    setBoxHeight(tpl.boxHeight ? String(tpl.boxHeight) : '');
    setBoxWeight(tpl.wgt || '');
    setBoxMaxWeight(tpl.maxWeight ? String(tpl.maxWeight) : '');
    setBoxStackable(tpl.stackable !== false);
  };

  // Generate sequential box number (per batch, 3 digits starting from 001)
  const generateSequentialNum = (source: 'local' | 'import') => {
    if (!selectedBatchId) return;
    const nextNum = getNextBoxNumber(boxes, selectedBatchId, source);
    setBoxNum(nextNum);
  };

  const handleCreateBox = () => {
    if (!boxNum.trim() || !selectedBatch) return;
    addBox({
      id: uid(), num: boxNum.trim(), name: `${boxType} ${boxNum.trim()}`, type: boxType,
      wgt: boxWeight || undefined,
      boxLength: Number(boxLength) || undefined,
      boxWidth: Number(boxWidth) || undefined,
      boxHeight: Number(boxHeight) || undefined,
      maxWeight: Number(boxMaxWeight) || undefined,
      stackable: boxStackable, batchId: selectedBatchId,
      source: boxSource, pickItems: [], prods: [],
      createdAt: today(),
    });
    setShowCreateBox(false);
    setBoxNum(''); setBoxWeight(''); setBoxLength(''); setBoxWidth(''); setBoxHeight(''); setBoxMaxWeight(''); setBoxStackable(true); setBoxSource('local'); setCopyFromBox(null); setSelectedBoxTemplate(null);
  };
  const handleCopyBox = (box: Box) => {
    setCopyFromBox(box);
    setBoxNum(box.num + '-copy');
    setBoxType(box.type);
    setBoxWeight(box.wgt || '');
    setBoxLength(box.boxLength ? String(box.boxLength) : '');
    setBoxWidth(box.boxWidth ? String(box.boxWidth) : '');
    setBoxHeight(box.boxHeight ? String(box.boxHeight) : '');
    setBoxMaxWeight(box.maxWeight ? String(box.maxWeight) : '');
    setBoxStackable(box.stackable !== false);
    setBoxSource(box.source || 'local');
    setShowCreateBox(true);
  };

  const assignItemToBox = (boxId: string, item: PickListItem, assignQty: number) => {
    const box = boxes.find(b => b.id === boxId); if (!box || !selectedBatch) return;
    if (box.source !== item.source) { alert(`لا يمكن وضع قطعة ${item.source==='local'?'محلية':'مستوردة'} في صندوق ${box.source==='local'?'محلي':'مستورد'}!`); return; }
    const currentItems: BoxAssignedItem[] = (box.pickItems || []) as any;
    const existing = currentItems.find((i: any) => i.id === item.id);
    const qtyDiff = assignQty;
    if (existing) {
      const oldQty = existing.assignedQty || 0;
      const newQty = oldQty + assignQty;
      updateBox(boxId, { pickItems: currentItems.map((i: any) => i.id === item.id ? { ...i, assignedQty: newQty } : i) });
      // Reserve the difference
      reserveStock(item.id, item.type as any, item.name, item.code, qtyDiff, box.num, user?.name || user?.email);
    } else {
      updateBox(boxId, { pickItems: [...currentItems, { ...item, assignedQty: assignQty }] });
      // Reserve new item
      reserveStock(item.id, item.type as any, item.name, item.code, assignQty, box.num, user?.name || user?.email);
    }
  };

  const removeFromBox = (boxId: string, itemId: string) => {
    const box = boxes.find(b => b.id === boxId); if (!box) return;
    // Find item to release stock before removing
    const item = (box.pickItems || []).find((i: any) => i.id === itemId);
    if (item) {
      releaseStock(item.id, item.type || 'part', item.name, item.code, item.assignedQty || 1, box.num, user?.name || user?.email);
    }
    updateBox(boxId, { pickItems: (box.pickItems || []).filter((i: any) => i.id !== itemId) });
  };
  const updateAssignedQty = (boxId: string, itemId: string, newQty: number) => { if (newQty <= 0) { removeFromBox(boxId, itemId); return; } const box = boxes.find(b => b.id === boxId); if (!box) return; updateBox(boxId, { pickItems: (box.pickItems || []).map((i: any) => i.id === itemId ? { ...i, assignedQty: newQty } : i) }); };

  const handleDragOver = useCallback((e: React.DragEvent, boxId: string) => { e.preventDefault(); setDragOverBox(boxId); }, []);
  const handleDragLeave = useCallback(() => { setDragOverBox(null); }, []);
  const handleDrop = useCallback((e: React.DragEvent, boxId: string, itemJson: string) => { e.preventDefault(); setDragOverBox(null); const item = JSON.parse(itemJson) as TrackedItem; if (item.remainingQty <= 0) return; setQtyDialog({ open: true, item, maxQty: item.remainingQty, boxId }); setQtyInput(String(Math.min(item.remainingQty, 10))); }, []);

  const handleBoxImageUpload = async (boxId: string, file: File) => {
    if (!file.type.startsWith('image/')) return;
    setCompressingBoxId(boxId);
    setCompressInfo('جاري الرفع...');
    try {
      // Upload to Firebase Storage (compress + upload)
      const { url, compressionInfo } = await uploadImage(file, 'boxes', boxId);
      const box = boxes.find(b => b.id === boxId);
      if (box) {
        updateBox(boxId, { images: [...(box.images || []), url] });
      }
      setCompressInfo(compressionInfo);
    } catch {
      setCompressInfo('فشل الرفع ❌');
    } finally {
      setTimeout(() => { setCompressingBoxId(null); setCompressInfo(''); }, 2000);
    }
  };

  const confirmQty = () => {
    const qty = Number(qtyInput); if (!qtyDialog.item || qty <= 0 || qty > qtyDialog.maxQty) return;
    assignItemToBox(qtyDialog.boxId, qtyDialog.item, qty); setQtyDialog({ open: false, item: null, maxQty: 0, boxId: '' }); setQtyInput('');
  };

  const handleItemClick = (item: TrackedItem) => {
    if (item.remainingQty <= 0) return; const matchingBox = batchBoxes.find(b => b.source === item.source);
    if (!matchingBox) { alert(`أنشئ صندوقاً ${item.source==='local'?'محلياً':'مستورداً'} أولاً`); return; }
    setQtyDialog({ open: true, item, maxQty: item.remainingQty, boxId: matchingBox.id }); setQtyInput(String(Math.min(item.remainingQty, 10)));
  };

  // Render a single pick list item card
  const renderPickItem = (item: TrackedItem) => {
    let itemImg = '';
    if (item.type === 'part') { const p = parts.find(x => x.revit === item.code || x.id === (item as any).itemId); if (p) itemImg = p.img || ''; }
    else if (item.type === 'accessory') { const a = accessories.find(x => x.code === item.code || x.id === (item as any).itemId); if (a) itemImg = a.img || ''; }
    else { const t = tops.find(x => x.code === item.code || x.id === (item as any).itemId); if (t) itemImg = t.img || ''; }
    const typeColors = {
      part: { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:border-blue-400', badge: 'bg-blue-100 text-blue-700', label: 'قطعة' },
      accessory: { bg: 'bg-pink-50', border: 'border-pink-200', hover: 'hover:border-pink-400', badge: 'bg-pink-100 text-pink-700', label: 'اكسسوار' },
      top: { bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', label: 'توب' },
    };
    const c = typeColors[item.type];
    const sourceColor = item.source === 'local'
      ? { border: 'border-green-300', bg: 'bg-green-50', dot: 'bg-green-400' }
      : { border: 'border-purple-300', bg: 'bg-purple-50', dot: 'bg-purple-400' };
    return (
      <div key={item.id} draggable={item.remainingQty > 0} onDragStart={e => item.remainingQty > 0 && e.dataTransfer.setData('text/plain', JSON.stringify(item))} onClick={() => handleItemClick(item)} className={`${item.remainingQty === 0 ? 'bg-gray-50 border-gray-200 opacity-40 cursor-not-allowed' : `${sourceColor.bg} ${sourceColor.border} ${c.hover} cursor-pointer hover:shadow-sm`} rounded-lg p-2.5 border transition-all mb-1`}>
        <div className="flex items-center gap-2">
          {item.remainingQty > 0 && <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0" />}
          <div className="w-10 h-10 rounded-lg bg-white border flex-shrink-0 overflow-hidden">
            {itemImg ? <img src={itemImg} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium truncate">{item.name}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-[9px] text-gray-400 font-mono">{item.code}</p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${c.badge}`}>{c.label}</span>
              <span className={`text-[8px] px-1 py-0.5 rounded-full ${item.source==='local'?'bg-green-100 text-green-600':'bg-purple-100 text-purple-600'}`}>{item.source==='local'?'محلي':'مستورد'}</span>
            </div>
            {item.length ? <p className="text-[9px] text-gray-400">{item.length}×{item.width}×{item.height} سم</p> : null}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1"><span className="text-[10px] text-gray-400">{item.remainingQty}</span><span className="text-[9px] text-gray-300">/</span><span className="text-sm font-bold text-cyan-700">{item.totalQty}</span></div>
            <p className="text-[9px] text-gray-400">{item.unit} {item.weight ? `• ${item.weight}كغ` : ''}</p>
          </div>
        </div>
        {item.remainingQty < item.totalQty && <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${((item.totalQty - item.remainingQty) / item.totalQty) * 100}%` }} /></div>}
      </div>
    );
  };

  return (
    <div className="animate-fade-in h-[calc(100vh-4rem)] flex flex-col" dir="rtl">
      <div className="bg-white border-b border-gray-100 p-3 flex flex-wrap items-center gap-3 flex-shrink-0">
        <Boxes className="w-5 h-5 text-cyan-600" />
        <h2 className="text-sm font-bold">تعبئة الصناديق</h2>
        <div className="w-px h-6 bg-gray-200" />
        <select value={selectedProjectId} onChange={e => { setSelectedProjectId(e.target.value); setSelectedBatchId(''); }} className="h-8 text-xs rounded-md border border-input bg-background px-2"><option value="">اختر المشروع...</option>{projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select>
        <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} className="h-8 text-xs rounded-md border border-input bg-background px-2 min-w-[180px]" disabled={!selectedProjectId}><option value="">اختر الدفعة...</option>{projectBatches.map(b => (<option key={b.id} value={b.id}>{b.name || 'دفعة بدون اسم'}</option>))}</select>
        {selectedBatch && (<><div className="flex-1" /><span className="text-xs font-bold text-gray-700">{selectedBatch.name || 'دفعة'}</span><span className="text-[10px] text-gray-400">— القطع تنقسم تلقائياً حسب المصدر</span>
        {/* Done packing button — only when all boxes have items */}
        {batchBoxes.length > 0 && batchBoxes.every(b => (b.pickItems || []).length > 0) && selectedBatch.status !== 'تم' && (
          <Button
            size="sm"
            onClick={() => {
              if (confirm('تأكيد انتهاء التحجيم؟\n\nسيتم ترحيل الدفعة لشاشة الكونتينرات.')) {
                const now = new Date().toISOString();
                updateBatch(selectedBatch.id, {
                  status: 'تم',
                  updatedAt: today(),
                  workflowStage: 'packing_done',
                  stageHistory: [
                    ...(selectedBatch.stageHistory || []),
                    { stage: 'packing', startedAt: now, completedAt: now, completedBy: user?.name || '' }
                  ]
                });
              }
            }}
            className="gap-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
          >
            <CheckCircle className="w-3.5 h-3.5" /> تم الانتهاء من التحجيم
          </Button>
        )}
        <Button size="sm" onClick={() => { generateSequentialNum(boxSource); setShowCreateBox(true); }} className="gap-1 bg-gradient-to-r from-cyan-500 to-cyan-600"><Plus className="w-3.5 h-3.5" /> صندوق جديد</Button></>)}
      </div>

      {selectedBatch ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 bg-gray-50 border-l border-gray-100 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-white">
              <p className="text-xs font-bold flex items-center gap-2"><Package className="w-4 h-4 text-cyan-600" /> كشف القطع</p>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{trackedItems.filter(i => i.source === 'local').length} محلي</span>
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{trackedItems.filter(i => i.source === 'import').length} مستورد</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* ─── LOCAL ITEMS ─── */}
              {trackedItems.some(i => i.source === 'local') && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="text-[10px] font-bold text-green-700">قطع محلية</p>
                    <div className="flex-1 h-px bg-green-200" />
                  </div>
                  {trackedItems.filter(i => i.source === 'local').map(item => renderPickItem(item))}
                </div>
              )}
              {/* ─── IMPORT ITEMS ─── */}
              {trackedItems.some(i => i.source === 'import') && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <p className="text-[10px] font-bold text-purple-700">قطع مستوردة</p>
                    <div className="flex-1 h-px bg-purple-200" />
                  </div>
                  {trackedItems.filter(i => i.source === 'import').map(item => renderPickItem(item))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {batchBoxes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400"><Boxes className="w-16 h-16 mb-4 text-gray-200" /><p className="text-sm">أنشئ صندوقاً واسحب القطع إليه</p></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {batchBoxes.map(box => {
                  const isDragOver = dragOverBox === box.id;
                  const boxItems: BoxAssignedItem[] = (box.pickItems || []) as any;
                  const { totalWeight } = calcBoxWeight(box);
                  const isOverWeight = box.maxWeight ? totalWeight > box.maxWeight : false;
                  return (
                    <div key={box.id} onDragOver={e => handleDragOver(e, box.id)} onDragLeave={handleDragLeave} onDrop={e => { const itemJson = e.dataTransfer.getData('text/plain'); if (itemJson) handleDrop(e, box.id, itemJson); }} className={`rounded-xl border-[2.5px] transition-all ${isDragOver ? 'border-cyan-400 shadow-lg ring-2 ring-cyan-100' : isOverWeight ? 'border-red-400 bg-red-50/50' : box.source === 'local' ? 'border-emerald-400 bg-emerald-50/50' : box.source === 'import' ? 'border-purple-400 bg-purple-50/50' : 'border-gray-200 bg-white'}`}>
                      <div className={`p-3 border-b ${box.source === 'local' ? 'border-emerald-200' : box.source === 'import' ? 'border-purple-200' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${box.source === 'local' ? 'bg-emerald-200' : 'bg-purple-200'}`}><Package className={`w-4 h-4 ${box.source === 'local' ? 'text-emerald-700' : 'text-purple-700'}`} /></div>
                            <div><p className="text-sm font-bold">{box.num}</p><p className="text-[9px] text-gray-400">{box.type} {box.boxLength ? `• ${box.boxLength}×${box.boxWidth}×${box.boxHeight}سم` : ''}</p></div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${box.source === 'local' ? 'bg-emerald-200 text-emerald-800' : 'bg-purple-200 text-purple-800'}`}>{box.source === 'local' ? 'محلي' : 'مستورد'}</span>
                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{boxItems.length} عنصر</span>
                            {box.stackable === false && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full" title="لا يحمل فوقه">🚫</span>}
                            {canEdit(user?.role || '', 'warehouse') && (
                              <>
                                <button onClick={() => handleCopyBox(box)} className="p-1.5 hover:bg-blue-100 rounded" title="نسخ إعدادات الصندوق"><BoxSelect className="w-3.5 h-3.5 text-blue-500" /></button>
                                <button onClick={() => { if (confirm('حذف الصندوق؟')) deleteBox(box.id); }} className="p-1.5 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${isOverWeight ? 'bg-red-500' : totalWeight > (box.maxWeight||9999)*0.8 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, box.maxWeight ? (totalWeight/box.maxWeight)*100 : 50)}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold ${isOverWeight ? 'text-red-600' : 'text-gray-600'}`}><Weight className="w-3 h-3 inline" /> {totalWeight.toFixed(1)}{box.maxWeight ? `/${box.maxWeight}` : ''}كغ</span>
                        </div>
                        {isOverWeight && <p className="text-[9px] text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> تجاوز الحد الأقصى!</p>}
                      </div>
                      <div className="p-2 min-h-[100px]">
                        {boxItems.length === 0 ? (
                          <div className={`h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center ${isDragOver ? 'border-cyan-400 bg-cyan-50' : 'border-gray-200'}`}><p className="text-[10px] text-gray-400">اسحب القطع هنا</p></div>
                        ) : (
                          <div className="space-y-1">
                            {boxItems.map((item: any) => {
                              const validation = box.boxLength ? validate3D(item, box) : { fits: true, issues: [] };
                              return (
                                <div key={item.id} className={`rounded-lg p-2 flex items-center gap-2 ${validation.fits ? 'bg-gray-50' : 'bg-red-50 border border-red-200'}`}>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-medium truncate">{item.name}</p>
                                    <div className="flex items-center gap-1">
                                      <p className="text-[9px] text-gray-400 font-mono">{item.code}</p>
                                      {item.weight && <span className="text-[9px] text-gray-500">{((item.weight||0)*(item.assignedQty||1)).toFixed(1)}كغ</span>}
                                    </div>
                                    {!validation.fits && validation.issues.map((issue: string, i: number) => (<p key={i} className="text-[9px] text-red-500 flex items-center gap-1"><Ruler className="w-3 h-3" /> {issue}</p>))}
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => updateAssignedQty(box.id, item.id, (item.assignedQty || item.qty) - 1)} className="w-5 h-5 rounded bg-white border flex items-center justify-center"><Minus className="w-2.5 h-2.5" /></button>
                                    <span className="text-xs font-bold w-6 text-center">{item.assignedQty || item.qty}</span>
                                    <button onClick={() => { const tracked = trackedItems.find(t => t.id === item.id); const ca = item.assignedQty || item.qty; const rem = (tracked?.remainingQty || 0) + ca; if (rem > ca) updateAssignedQty(box.id, item.id, ca + 1); }} className="w-5 h-5 rounded bg-white border flex items-center justify-center"><Plus className="w-2.5 h-2.5" /></button>
                                  </div>
                                  <button onClick={() => removeFromBox(box.id, item.id)} className="p-1 hover:bg-red-100 rounded flex-shrink-0"><X className="w-3 h-3 text-red-500" /></button>
                                </div>
                              );
                            })}
                            {isDragOver && <div className="h-8 rounded-lg border-2 border-dashed border-cyan-400 bg-cyan-50 flex items-center justify-center"><p className="text-[10px] text-cyan-600">أفلت هنا</p></div>}
                            {/* ─── 3D Visualizer Toggle ─── */}
                            {boxItems.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <Box3DToggle
                                  boxLength={box.boxLength || 60}
                                  boxWidth={box.boxWidth || 40}
                                  boxHeight={box.boxHeight || 30}
                                  boxNum={box.num}
                                  items={boxItems.map((item: any) => ({
                                    name: item.name,
                                    code: item.code,
                                    type: item.type,
                                    assignedQty: item.assignedQty || 1,
                                    length: item.length,
                                    width: item.width,
                                    height: item.height,
                                    weight: item.weight,
                                  }))}
                                />
                              </div>
                            )}

                            {/* ─── Box Documentation Photos ─── */}
                            {boxItems.some((i: any) => i.type === 'accessory') && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-[10px] font-bold text-gray-500 mb-1.5 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> توثيق الاكسسوارات ({(box.images || []).length} صورة)</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {(box.images || []).map((img: string, idx: number) => (
                                    <div key={idx} className="relative group w-12 h-12 rounded-lg overflow-hidden border">
                                      <img src={img} alt="" className="w-full h-full object-cover" />
                                      <button onClick={() => updateBox(box.id, { images: (box.images || []).filter((_, i) => i !== idx) })} className="absolute top-0.5 left-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5 text-white" /></button>
                                    </div>
                                  ))}
                                  <label className={`w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${compressingBoxId === box.id ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-cyan-400 hover:bg-cyan-50'}`}>
                                    {compressingBoxId === box.id ? (
                                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Plus className="w-4 h-4 text-gray-400" />
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) handleBoxImageUpload(box.id, file);
                                      e.target.value = '';
                                    }} />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400"><Boxes className="w-16 h-16 mb-4 text-gray-200" /><p className="text-sm">اختر مشروعاً ثم دفعة لبدء التعبئة</p></div>
      )}

      {/* Create Box Dialog */}
      {showCreateBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateBox(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()} dir="rtl">
            <h3 className="text-base font-bold flex items-center gap-2"><Package className="w-5 h-5 text-cyan-600" /> صندوق جديد</h3>

            {/* ─── Template Selection ─── */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5 flex items-center gap-1"><LayoutTemplate className="w-3 h-3" /> قالب قياسي</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                <button
                  onClick={() => { setSelectedBoxTemplate(null); }}
                  className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${!selectedBoxTemplate ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  مخصص
                </button>
                {DEFAULT_BOX_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => applyBoxTemplate(tpl)}
                    className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${selectedBoxTemplate?.id === tpl.id ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 hover:border-gray-300'}`}
                    title={`${tpl.boxLength}×${tpl.boxWidth}×${tpl.boxHeight} سم • max ${tpl.maxWeight}كغ`}
                  >
                    {tpl.name}
                    <span className="block text-[9px] font-normal text-gray-400 mt-0.5">{tpl.boxLength}×{tpl.boxWidth}×{tpl.boxHeight} سم</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Sequential Number ─── */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <label className="text-xs font-semibold text-amber-700 block mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> الرقم التسلسلي</label>
              <div className="flex items-center gap-2">
                <Input value={boxNum} onChange={e => setBoxNum(e.target.value)} className="text-sm font-bold text-center" placeholder="01" />
                <button
                  onClick={() => generateSequentialNum(boxSource)}
                  className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-2 rounded-lg font-bold transition-colors flex-shrink-0"
                >
                  توليد تلقائي
                </button>
              </div>
              <p className="text-[9px] text-amber-500 mt-1">التسلسل على مستوى المشروع (محلي/مستورد منفصل)</p>
            </div>

            {/* ─── Source ─── */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">المصدر *</label>
              <div className="flex gap-2">
                <button onClick={() => { setBoxSource('local'); generateSequentialNum('local'); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${boxSource==='local'?'bg-green-600 text-white':'bg-green-50 text-green-700 hover:bg-green-100'}`}>محلي</button>
                <button onClick={() => { setBoxSource('import'); generateSequentialNum('import'); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${boxSource==='import'?'bg-purple-600 text-white':'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>مستورد</button>
              </div>
            </div>

            {/* ─── Type ─── */}
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">النوع</label><div className="flex gap-2">{['Carton','Wooden','شحن','عربة'].map(t => (<button key={t} onClick={() => setBoxType(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold ${boxType===t ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{t}</button>))}</div></div>

            {/* ─── Dimensions ─── */}
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">أبعاد الصندوق (سم) — للتحقق 3D</label><div className="grid grid-cols-3 gap-2"><Input value={boxLength} onChange={e => setBoxLength(e.target.value)} placeholder="طول" className="text-sm text-center" type="number" min={0} /><Input value={boxWidth} onChange={e => setBoxWidth(e.target.value)} placeholder="عرض" className="text-sm text-center" type="number" min={0} /><Input value={boxHeight} onChange={e => setBoxHeight(e.target.value)} placeholder="ارتفاع" className="text-sm text-center" type="number" min={0} /></div></div>

            {/* ─── Weight ─── */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">وزن الصندوق الفارغ (كغ)</label><Input value={boxWeight} onChange={e => setBoxWeight(e.target.value)} placeholder="5" className="text-sm" type="number" min={0} /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">الحد الأقصى للوزن (كغ)</label><Input value={boxMaxWeight} onChange={e => setBoxMaxWeight(e.target.value)} placeholder="500" className="text-sm" type="number" min={0} /></div>
            </div>

            {/* Stackable */}
            <div className="flex items-center gap-3 pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={boxStackable} onChange={e => setBoxStackable(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                <span className="text-xs font-medium">يسمح بوضع صندوق فوقه (قابل للتكديس)</span>
              </label>
            </div>

            {/* ─── Template info ─── */}
            {selectedBoxTemplate && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-[10px] text-cyan-700">
                <p className="font-bold">{selectedBoxTemplate.name}</p>
                <p>{selectedBoxTemplate.boxLength}×{selectedBoxTemplate.boxWidth}×{selectedBoxTemplate.boxHeight} سم • فارغ: {selectedBoxTemplate.wgt}كغ • max: {selectedBoxTemplate.maxWeight}كغ • {selectedBoxTemplate.stackable ? 'قابل للتكديس' : 'غير قابل للتكديس'}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => { setShowCreateBox(false); setCopyFromBox(null); setSelectedBoxTemplate(null); }}>إلغاء</Button>
              <Button size="sm" onClick={handleCreateBox} disabled={!boxNum.trim()} className="bg-gradient-to-r from-cyan-500 to-cyan-600">
                {copyFromBox ? 'نسخ الإعدادات' : 'إنشاء'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Qty Dialog */}
      {qtyDialog.open && qtyDialog.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setQtyDialog({ open: false, item: null, maxQty: 0, boxId: '' })}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()} dir="rtl">
            <h3 className="text-base font-bold">توزيع الكمية</h3>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-bold">{qtyDialog.item.name}</p>
              <p className="text-xs text-gray-400 font-mono">{qtyDialog.item.code}</p>
              {qtyDialog.item.weight && <p className="text-[10px] text-gray-500">الوزن: {qtyDialog.item.weight}كغ/وحدة × {Number(qtyInput || 0)} = {(qtyDialog.item.weight * Number(qtyInput || 0)).toFixed(1)}كغ</p>}
              {qtyDialog.item.length ? <p className="text-[10px] text-gray-500">الأبعاد: {qtyDialog.item.length}×{qtyDialog.item.width}×{qtyDialog.item.height} سم</p> : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1"><label className="text-xs font-semibold text-gray-600 block mb-1">الكمية للصندوق</label><div className="flex items-center gap-2"><button onClick={() => setQtyInput(String(Math.max(1, Number(qtyInput)-1)))} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Minus className="w-4 h-4" /></button><Input value={qtyInput} onChange={e => setQtyInput(e.target.value)} type="number" min={1} max={qtyDialog.maxQty} className="text-center text-lg font-bold" /><button onClick={() => setQtyInput(String(Math.min(qtyDialog.maxQty, Number(qtyInput)+1)))} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Plus className="w-4 h-4" /></button></div></div>
              <div className="text-center pt-5"><p className="text-[10px] text-gray-400">متبقي</p><p className="text-lg font-bold text-cyan-600">{qtyDialog.maxQty}</p></div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" size="sm" onClick={() => setQtyDialog({ open: false, item: null, maxQty: 0, boxId: '' })}>إلغاء</Button><Button size="sm" onClick={confirmQty} disabled={!qtyInput || Number(qtyInput)<=0 || Number(qtyInput)>qtyDialog.maxQty} className="bg-gradient-to-r from-cyan-500 to-cyan-600 gap-1"><ArrowRight className="w-3.5 h-3.5" /> توزيع</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
