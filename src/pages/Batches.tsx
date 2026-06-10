// ============================================================
// Batches — الدفعات الإنتاجية (مختلطة: محلي + مستورد)
// 1. تعريف الدفعة: مشروع + اسم + تاريخ (بدون مصدر)
// 2. اختيار المنتجات → النظام تلقائياً يفرّز القطع حسب المصدر
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '@/store/dataStore';
import { usePermissionStore } from '@/store/permissionStore';
import { useAuthStore } from '@/store/authStore';
import { useBatchNoteStore } from '@/store/batchNoteStore';
import BatchNotes from '@/components/BatchNotes';
import type { Batch, BatchExtraItem, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Minus, X, Layers, Package, ChevronLeft, ImageIcon, CalendarDays, Edit3, Boxes, ListChecks, ClipboardList, Save, Globe, Factory, Send, MessageSquare, CheckCircle, MapPin } from 'lucide-react';

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function today() { return new Date().toISOString().split('T')[0]; }

// ─── Generate pick list from products and split by source ───
function generateBatchPickList(
  prods: any[], allProducts: any[], allParts: any[], allAccessories: any[], allTops: any[]
) {
  const localItems: { name: string; code: string; type: string; qty: number }[] = [];
  const importItems: { name: string; code: string; type: string; qty: number }[] = [];

  const addItem = (name: string, code: string, type: string, source: 'local' | 'import', qty: number) => {
    const target = source === 'local' ? localItems : importItems;
    const existing = target.find(i => i.code === code && i.type === type);
    if (existing) existing.qty += qty;
    else target.push({ name, code, type, qty });
  };

  for (const bp of prods) {
    const prod = allProducts.find((p: any) => p.id === bp.id);
    if (!prod) continue;
    for (const c of prod.components || []) {
      const qty = c.qty * bp.qty;
      if (c.compType === 'part' || c.compType === 'part-set') {
        const p = allParts.find((x: any) => x.revit === c.code || x.id === c.id);
        if (p) addItem(p.name, p.revit, 'قطعة', p.source, qty);
      } else if (c.compType === 'accessory' || c.compType === 'acc-set') {
        addItem(c.name, c.code, 'اكسسوار', 'import', qty);
      } else if (c.compType === 'top') {
        const t = allTops.find((x: any) => x.code === c.code || x.id === c.id);
        if (t) addItem(t.name, t.code, 'توب', t.product, qty);
      }
    }
  }
  return { localItems, importItems };
}

// ═══════════════════════════════════════════
// BATCH DETAIL — reads latest batch from store directly
// ═══════════════════════════════════════════
function BatchDetail({
  batchId, onBack, onShowNotes, canEditFlag, canDeleteFlag, getProjectName, allProducts, parts, accessories, tops, updateBatch, deleteBatch, projects
}: {
  batchId: string; onBack: () => void; onShowNotes: () => void; canEditFlag: boolean; canDeleteFlag: boolean;
  getProjectName: (id: string) => string; allProducts: Product[]; parts: any[]; accessories: any[]; tops: any[];
  updateBatch: (id: string, patch: any) => void; deleteBatch: (id: string) => void; projects: any[];
}) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // Read current batch DIRECTLY from store (live sync)
  const { batches } = useDataStore();
  const current = batches.find(b => b.id === batchId) || { id: batchId, name: '', projectId: '', prods: [], extraParts: [], extraAccessories: [], extraTops: [], source: 'local', status: 'جديد', createdAt: today(), updatedAt: today() } as Batch;

  const [showEdit, setShowEdit] = useState(false);
  const [detailSearch, setDetailSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'prods' | 'parts' | 'acc' | 'tops'>('prods');
  const [targetRoom, setTargetRoom] = useState<string>('');

  const [editName, setEditName] = useState(current.name || '');
  const [editInvoiceNo, setEditInvoiceNo] = useState(current.invoiceNo || '');
  const [editDesc, setEditDesc] = useState(current.desc || '');
  const [editDeliveryDate, setEditDeliveryDate] = useState(current.deliveryDate || '');
  const [editStatus, setEditStatus] = useState<Batch['status']>(current.status);

  const saveCurrent = (patch: Partial<Batch>) => {
    updateBatch(current.id, { ...patch, updatedAt: today() });
  };

  // ─── استخراج الغرف من المشروع ───
  const getProjectRooms = useMemo(() => {
    const project = projects.find(p => p.id === current.projectId);
    if (!project) return [];
    const rooms: {buildingId: string, buildingName: string, floorId: string, floorName: string, roomId: string, roomName: string, fullName: string}[] = [];
    for (const b of project.buildings) {
      for (const f of b.floors) {
        if (f.rooms && f.rooms.length > 0) {
          for (const r of f.rooms) {
            rooms.push({
              buildingId: b.id, buildingName: b.name,
              floorId: f.id || f.name, floorName: f.name,
              roomId: r.id, roomName: r.name,
              fullName: `${b.name} / ${f.name} / ${r.name}`
            });
          }
        } else {
          // fallback: floor itself as a "location"
          rooms.push({
            buildingId: b.id, buildingName: b.name,
            floorId: f.id || f.name, floorName: f.name,
            roomId: `${f.id || f.name}_general`, roomName: 'عام',
            fullName: `${b.name} / ${f.name} / عام`
          });
        }
      }
    }
    return rooms;
  }, [projects, current.projectId]);

  // Auto-split pick list
  const { localItems, importItems } = useMemo(
    () => generateBatchPickList(current.prods, allProducts, parts, accessories, tops),
    [current.prods, allProducts, parts, accessories, tops]
  );

  // Product actions — product-level room
  const addProductToBatch = (prodId: string) => {
    const prod = allProducts.find(p => p.id === prodId);
    if (!prod) return;
    // Use targetRoom if set, otherwise add without room
    const targetRoomData = targetRoom ? getProjectRooms.find(r => r.roomId === targetRoom) : null;
    const roomInfo = targetRoomData ? {
      roomId: targetRoomData.roomId,
      roomName: targetRoomData.roomName,
      buildingId: targetRoomData.buildingId,
      floorId: targetRoomData.floorId
    } : { roomId: '', roomName: '', buildingId: '', floorId: '' };
    // Check if product with same room already exists
    const exists = current.prods.find(p => p.id === prodId && p.roomId === roomInfo.roomId);
    if (exists) {
      saveCurrent({ prods: current.prods.map(p => p.id === prodId && p.roomId === roomInfo.roomId ? { ...p, qty: p.qty + 1 } : p) });
    } else {
      saveCurrent({ prods: [...current.prods, {
        id: prod.id, name: prod.name, code: prod.code, qty: 1,
        roomId: roomInfo.roomId,
        roomName: roomInfo.roomName,
        buildingId: roomInfo.buildingId,
        floorId: roomInfo.floorId
      }] });
    }
  };

  const removeProduct = (prodId: string, roomId?: string) => {
    saveCurrent({ prods: current.prods.filter(p => !(p.id === prodId && p.roomId === (roomId || ''))) });
  };

  const setProdQty = (prodId: string, roomId: string, qty: number) => {
    if (qty <= 0) { removeProduct(prodId, roomId); return; }
    saveCurrent({ prods: current.prods.map(p => p.id === prodId && p.roomId === roomId ? { ...p, qty } : p) });
  };

  const setProdRoom = (prodId: string, roomId: string, newRoomId: string) => {
    const room = getProjectRooms.find(r => r.roomId === newRoomId);
    if (!room) return;
    // Check if product with same new room already exists
    const exists = current.prods.find(p => p.id === prodId && p.roomId === newRoomId);
    if (exists && newRoomId !== roomId) {
      // Merge: add qty to existing and remove the old one
      const oldProd = current.prods.find(p => p.id === prodId && p.roomId === roomId);
      if (!oldProd) return;
      saveCurrent({
        prods: current.prods
          .filter(p => !(p.id === prodId && p.roomId === roomId))
          .map(p => p.id === prodId && p.roomId === newRoomId ? { ...p, qty: p.qty + oldProd.qty } : p)
      });
    } else {
      saveCurrent({
        prods: current.prods.map(p =>
          p.id === prodId && p.roomId === roomId
            ? { ...p, roomId: room.roomId, roomName: room.roomName, buildingId: room.buildingId, floorId: room.floorId }
            : p
        )
      });
    }
  };

  // Extra items
  const addExtra = (type: 'part' | 'accessory' | 'top', itemId: string) => {
    let name = '', code = '';
    if (type === 'part') { const p = parts.find(x => x.id === itemId); if (p) { name = p.name; code = p.revit; } }
    else if (type === 'accessory') { const a = accessories.find(x => x.id === itemId); if (a) { name = a.name; code = a.code; } }
    else { const t = tops.find(x => x.id === itemId); if (t) { name = t.name; code = t.code; } }
    if (!name) return;
    const item: BatchExtraItem = { id: uid(), itemId, name, code, type, qty: 1 };
    const key = type === 'part' ? 'extraParts' : type === 'accessory' ? 'extraAccessories' : 'extraTops';
    saveCurrent({ [key]: [...(current[key as keyof Batch] as BatchExtraItem[] || []), item] });
  };
  const removeExtra = (type: 'part' | 'accessory' | 'top', itemUid: string) => {
    const key = type === 'part' ? 'extraParts' : type === 'accessory' ? 'extraAccessories' : 'extraTops';
    saveCurrent({ [key]: ((current[key as keyof Batch] as BatchExtraItem[] || [])).filter(x => x.id !== itemUid) });
  };
  const setExtraQty = (type: 'part' | 'accessory' | 'top', itemUid: string, qty: number) => {
    if (qty <= 0) { removeExtra(type, itemUid); return; }
    const key = type === 'part' ? 'extraParts' : type === 'accessory' ? 'extraAccessories' : 'extraTops';
    saveCurrent({ [key]: ((current[key as keyof Batch] as BatchExtraItem[] || [])).map(x => x.id === itemUid ? { ...x, qty } : x) });
  };

  const handleEditSave = () => {
    if (!editName.trim()) return;
    updateBatch(current.id, { name: editName.trim(), invoiceNo: editInvoiceNo.trim() || undefined, desc: editDesc.trim() || undefined, deliveryDate: editDeliveryDate || undefined, status: editStatus, updatedAt: today() });
    setShowEdit(false);
  };

  const search = detailSearch.toLowerCase();
  const filteredProds = search ? allProducts.filter(p => p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search)) : allProducts;
  const filteredParts = search ? parts.filter(p => p.name.toLowerCase().includes(search) || p.revit.toLowerCase().includes(search)) : parts;
  const filteredAcc = search ? accessories.filter(a => a.name.toLowerCase().includes(search) || a.code.toLowerCase().includes(search)) : accessories;
  const filteredTops = search ? tops.filter(t => t.name.toLowerCase().includes(search) || t.code.toLowerCase().includes(search)) : tops;

  const totalItems = current.prods.length + (current.extraParts || []).length + (current.extraAccessories || []).length + (current.extraTops || []).length;

  return (
    <div className="animate-fade-in h-[calc(100vh-4rem)] flex flex-col" dir="rtl">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 p-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{current.name}</p>
          <p className="text-[10px] text-gray-500">{getProjectName(current.projectId)} {current.deliveryDate ? `• تسليم: ${current.deliveryDate}` : ''} {current.invoiceNo ? `• فاتورة: ${current.invoiceNo}` : ''}</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${current.status === 'جديد' ? 'bg-blue-100 text-blue-700' : current.status === 'قيد التجهيز' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{current.status}</span>
        <div className="w-px h-6 bg-gray-200" />
        <span className="text-[10px] bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">{totalItems} عنصر</span>
        {/* Notes button */}
        <button
          onClick={onShowNotes}
          className="text-[10px] px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold flex items-center gap-1 transition-colors"
        >
          <MessageSquare className="w-3 h-3" /> ملاحظات
        </button>
        {/* Mark as Complete — change status to 'تم' */}
        {current.status === 'جديد' && current.prods.length > 0 && (
          <button
            onClick={() => {
              if (confirm('تأكيد اكتمال تجهيز الدفعة؟')) {
                saveCurrent({ status: 'تم' });
              }
            }}
            className="text-[10px] px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1 transition-colors"
          >
            <CheckCircle className="w-3 h-3" /> تم التجهيز
          </button>
        )}
        {/* Send to Packing button — only when batch status is 'تم' (completed) */}
        {current.status === 'تم' && (
          <button
            onClick={() => {
              if (confirm('إرسال الدفعة لمسؤول التحجيم؟')) {
                const now = new Date().toISOString();
                updateBatch(current.id, {
                  status: 'قيد التجهيز',
                  updatedAt: today(),
                  workflowStage: 'batch_sent',
                  stageHistory: [
                    ...(current.stageHistory || []),
                    { stage: 'batch_ready', startedAt: current.createdAt, completedAt: now, completedBy: user?.name || '' },
                    { stage: 'batch_sent', startedAt: now, completedAt: now, completedBy: user?.name || '' }
                  ]
                });
                navigate('/packing');
              }
            }}
            className="text-[10px] px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center gap-1 transition-colors"
          >
            <Send className="w-3 h-3" /> إرسال للتحجيم
          </button>
        )}
        {canEditFlag && <button onClick={() => setShowEdit(true)} className="p-2 hover:bg-blue-100 rounded-lg" title="تعديل"><Edit3 className="w-4 h-4 text-blue-600" /></button>}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Summary */}
        <div className="w-80 bg-gray-50 border-l border-gray-100 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-white flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-cyan-600" />
            <p className="text-xs font-bold">محتويات الدفعة</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Products grouped by ROOM */}
            {(() => {
              // Group products by room
              const roomGroups: Record<string, {room: any, prods: typeof current.prods}> = {};
              for (const p of current.prods) {
                const key = p.roomId || 'no-room';
                if (!roomGroups[key]) {
                  roomGroups[key] = {
                    room: p.roomId ? getProjectRooms.find(r => r.roomId === p.roomId) : null,
                    prods: []
                  };
                }
                roomGroups[key].prods.push(p);
              }
              return Object.entries(roomGroups).map(([roomKey, group]) => (
                <div key={roomKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Room Header */}
                  <div className="px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-indigo-500" />
                      <span className="text-[10px] font-bold text-indigo-700">
                        {group.room ? group.room.fullName : '— بدون غرفة —'}
                      </span>
                    </div>
                    <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                      {group.prods.length} منتج
                    </span>
                  </div>
                  {/* Products in this room */}
                  <div className="p-2 space-y-1">
                    {group.prods.map(p => (
                      <div key={`${p.id}-${p.roomId || 'no-room'}`} className="bg-gray-50 rounded-lg p-2 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium truncate">{p.name}</p>
                          <p className="text-[9px] text-gray-400">{p.code}</p>
                          {/* Change room */}
                          {getProjectRooms.length > 0 && (
                            <select
                              className="text-[9px] border rounded-md px-1 py-0.5 mt-0.5 w-full bg-white text-gray-600"
                              value={p.roomId || ''}
                              onChange={(e) => setProdRoom(p.id, p.roomId || '', e.target.value)}
                            >
                              <option value="">— نقل لغرفة —</option>
                              {getProjectRooms.map(r => (
                                <option key={r.roomId} value={r.roomId}>{r.fullName}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setProdQty(p.id, p.roomId || '', p.qty - 1)} className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"><Minus className="w-2.5 h-2.5" /></button>
                          <span className="text-xs font-bold w-4 text-center">{p.qty}</span>
                          <button onClick={() => setProdQty(p.id, p.roomId || '', p.qty + 1)} className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300"><Plus className="w-2.5 h-2.5" /></button>
                        </div>
                        <button onClick={() => removeProduct(p.id, p.roomId || '')} className="p-1 hover:bg-red-100 rounded"><X className="w-3 h-3 text-red-500" /></button>
                      </div>
                    ))}
                    {/* Add product to this room */}
                    <button
                      onClick={() => {
                        // Open the product grid filtered for this room
                        setActiveTab('prods');
                        // Set a "target room" state
                        setTargetRoom(roomKey === 'no-room' ? '' : roomKey);
                      }}
                      className="w-full text-[10px] py-1.5 rounded-lg border border-dashed border-indigo-200 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> إضافة منتج للغرفة
                    </button>
                  </div>
                </div>
              ));
            })()}
            {localItems.length > 0 && (
              <div className="bg-green-50 rounded-xl border border-green-200 p-3">
                <p className="text-[10px] font-bold text-green-700 mb-2 flex items-center gap-1"><Factory className="w-3.5 h-3.5" /> القطع المحلية ({localItems.length} صنف)</p>
                {localItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-1.5 mb-1">
                    <div className="flex-1 min-w-0"><p className="text-[10px] font-medium truncate">{item.name}</p><p className="text-[9px] text-gray-400 font-mono">{item.code}</p></div>
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">{item.qty}</span>
                  </div>
                ))}
              </div>
            )}
            {importItems.length > 0 && (
              <div className="bg-purple-50 rounded-xl border border-purple-200 p-3">
                <p className="text-[10px] font-bold text-purple-700 mb-2 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> القطع المستوردة ({importItems.length} صنف)</p>
                {importItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-1.5 mb-1">
                    <div className="flex-1 min-w-0"><p className="text-[10px] font-medium truncate">{item.name}</p><p className="text-[9px] text-gray-400 font-mono">{item.code}</p></div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">{item.qty}</span>
                  </div>
                ))}
              </div>
            )}
            {(current.extraParts || []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-500 mb-1">قطع متفرقة ({(current.extraParts || []).length})</p>
                {(current.extraParts || []).map(p => (
                  <div key={p.id} className="bg-white rounded-lg p-2 mb-1 flex items-center gap-2">
                    <div className="flex-1 min-w-0"><p className="text-[11px] font-medium truncate">{p.name}</p></div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setExtraQty('part', p.id, p.qty - 1)} className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center"><Minus className="w-2.5 h-2.5" /></button>
                      <span className="text-xs font-bold w-4 text-center">{p.qty}</span>
                      <button onClick={() => setExtraQty('part', p.id, p.qty + 1)} className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center"><Plus className="w-2.5 h-2.5" /></button>
                    </div>
                    <button onClick={() => removeExtra('part', p.id)} className="p-1 hover:bg-red-100 rounded"><X className="w-3 h-3 text-red-500" /></button>
                  </div>
                ))}
              </div>
            )}
            {(current.extraAccessories || []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-500 mb-1">اكسسوارات ({(current.extraAccessories || []).length})</p>
                {(current.extraAccessories || []).map(a => (
                  <div key={a.id} className="bg-white rounded-lg p-2 mb-1 flex items-center gap-2">
                    <div className="flex-1 min-w-0"><p className="text-[11px] font-medium truncate">{a.name}</p></div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setExtraQty('accessory', a.id, a.qty - 1)} className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center"><Minus className="w-2.5 h-2.5" /></button>
                      <span className="text-xs font-bold w-4 text-center">{a.qty}</span>
                      <button onClick={() => setExtraQty('accessory', a.id, a.qty + 1)} className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center"><Plus className="w-2.5 h-2.5" /></button>
                    </div>
                    <button onClick={() => removeExtra('accessory', a.id)} className="p-1 hover:bg-red-100 rounded"><X className="w-3 h-3 text-red-500" /></button>
                  </div>
                ))}
              </div>
            )}
            {(current.extraTops || []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-500 mb-1">توبات ({(current.extraTops || []).length})</p>
                {(current.extraTops || []).map(t => (
                  <div key={t.id} className="bg-white rounded-lg p-2 mb-1 flex items-center gap-2">
                    <div className="flex-1 min-w-0"><p className="text-[11px] font-medium truncate">{t.name}</p></div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setExtraQty('top', t.id, t.qty - 1)} className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center"><Minus className="w-2.5 h-2.5" /></button>
                      <span className="text-xs font-bold w-4 text-center">{t.qty}</span>
                      <button onClick={() => setExtraQty('top', t.id, t.qty + 1)} className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center"><Plus className="w-2.5 h-2.5" /></button>
                    </div>
                    <button onClick={() => removeExtra('top', t.id)} className="p-1 hover:bg-red-100 rounded"><X className="w-3 h-3 text-red-500" /></button>
                  </div>
                ))}
              </div>
            )}
            {totalItems === 0 && localItems.length === 0 && importItems.length === 0 && (
              <p className="text-[11px] text-gray-400 text-center py-8">اختر منتجات من اليمين<br/>سيتم تقسيم القطع تلقائياً</p>
            )}
          </div>
        </div>

        {/* Right: Selection Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-white flex items-center gap-3 flex-shrink-0">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setActiveTab('prods')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${activeTab === 'prods' ? 'bg-white shadow-sm text-cyan-700' : 'text-gray-500'}`}><Package className="w-3 h-3" /> المنتجات</button>
              <button onClick={() => setActiveTab('parts')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${activeTab === 'parts' ? 'bg-white shadow-sm text-cyan-700' : 'text-gray-500'}`}><Boxes className="w-3 h-3" /> قطع</button>
              <button onClick={() => setActiveTab('acc')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${activeTab === 'acc' ? 'bg-white shadow-sm text-cyan-700' : 'text-gray-500'}`}><ListChecks className="w-3 h-3" /> اكسسوارات</button>
              <button onClick={() => setActiveTab('tops')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${activeTab === 'tops' ? 'bg-white shadow-sm text-cyan-700' : 'text-gray-500'}`}><CalendarDays className="w-3 h-3" /> توبات</button>
            </div>
            <div className="flex-1" />
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <Input value={detailSearch} onChange={e => setDetailSearch(e.target.value)} placeholder="بحث..." className="h-8 text-xs pr-8" />
              {detailSearch && <button onClick={() => setDetailSearch('')} className="absolute left-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400" /></button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'prods' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProds.map(prod => {
                  // Count total qty of this product across all rooms
                  const prodEntries = current.prods.filter(p => p.id === prod.id);
                  const totalQty = prodEntries.reduce((sum, p) => sum + p.qty, 0);
                  return (
                    <div key={prod.id} className={`bg-white rounded-xl border-2 transition-all overflow-hidden ${totalQty > 0 ? 'border-cyan-400 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
                      <div className="aspect-square bg-gray-50 relative">
                        {prod.img ? <img src={prod.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-200" /></div>}
                        {totalQty > 0 && <div className="absolute top-2 right-2 bg-cyan-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{totalQty}</div>}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[11px] font-bold text-gray-800 truncate">{prod.name}</p>
                        <p className="text-[9px] text-gray-400 font-mono">{prod.code}</p>
                        <div className="flex items-center gap-1 mt-2">
                          {totalQty > 0 ? (
                            <>
                              <button onClick={() => {
                                // Decrement the first entry (no room priority)
                                const entry = current.prods.find(p => p.id === prod.id);
                                if (entry) setProdQty(prod.id, entry.roomId || '', entry.qty - 1);
                              }} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                              <span className="flex-1 text-center text-sm font-bold">{totalQty}</span>
                              <button onClick={() => {
                                // Increment the first entry (no room priority)
                                const entry = current.prods.find(p => p.id === prod.id);
                                if (entry) setProdQty(prod.id, entry.roomId || '', entry.qty + 1);
                              }} className="w-7 h-7 rounded-lg bg-cyan-100 hover:bg-cyan-200 flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-cyan-700" /></button>
                            </>
                          ) : (
                            <button onClick={() => addProductToBatch(prod.id)} className="flex-1 h-8 rounded-lg bg-gray-100 hover:bg-cyan-50 text-xs font-bold text-gray-600 hover:text-cyan-700 transition-colors">إضافة</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'parts' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredParts.map(part => {
                  const isAdded = (current.extraParts || []).some(c => c.itemId === part.id);
                  return (
                    <div key={part.id} className={`bg-white rounded-xl border-2 transition-all overflow-hidden ${isAdded ? 'border-green-400 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
                      <div className="aspect-square bg-gray-50 relative">
                        {part.img ? <img src={part.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-200" /></div>}
                        <span className={`absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded-full ${part.source === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{part.source === 'local' ? 'محلي' : 'مستورد'}</span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-[11px] font-bold text-gray-800 truncate">{part.name}</p>
                        <p className="text-[9px] text-gray-400 font-mono">{part.revit}</p>
                        <button onClick={() => isAdded ? removeExtra('part', (current.extraParts || []).find(c => c.itemId === part.id)!.id) : addExtra('part', part.id)} className={`w-full h-8 rounded-lg text-xs font-bold mt-2 transition-colors ${isAdded ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-gray-100 hover:bg-green-50 text-gray-600 hover:text-green-700'}`}>{isAdded ? 'تمت الإضافة' : 'إضافة'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'acc' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredAcc.map(acc => {
                  const isAdded = (current.extraAccessories || []).some(c => c.itemId === acc.id);
                  return (
                    <div key={acc.id} className={`bg-white rounded-xl border-2 transition-all overflow-hidden ${isAdded ? 'border-purple-400 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
                      <div className="aspect-square bg-gray-50 relative">
                        {acc.img ? <img src={acc.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-200" /></div>}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[11px] font-bold text-gray-800 truncate">{acc.name}</p>
                        <p className="text-[9px] text-gray-400 font-mono">{acc.code}</p>
                        <button onClick={() => isAdded ? removeExtra('accessory', (current.extraAccessories || []).find(c => c.itemId === acc.id)!.id) : addExtra('accessory', acc.id)} className={`w-full h-8 rounded-lg text-xs font-bold mt-2 transition-colors ${isAdded ? 'bg-purple-100 text-purple-700 hover:bg-red-100 hover:text-red-700' : 'bg-gray-100 hover:bg-purple-50 text-gray-600 hover:text-purple-700'}`}>{isAdded ? 'تمت الإضافة' : 'إضافة'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'tops' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredTops.map(top => {
                  const isAdded = (current.extraTops || []).some(c => c.itemId === top.id);
                  return (
                    <div key={top.id} className={`bg-white rounded-xl border-2 transition-all overflow-hidden ${isAdded ? 'border-teal-400 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
                      <div className="aspect-square bg-gray-50 relative">
                        {top.img ? <img src={top.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-200" /></div>}
                        <span className={`absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded-full ${top.product === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{top.product === 'local' ? 'محلي' : 'مستورد'}</span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-[11px] font-bold text-gray-800 truncate">{top.name}</p>
                        <p className="text-[9px] text-gray-400 font-mono">{top.code}</p>
                        <button onClick={() => isAdded ? removeExtra('top', (current.extraTops || []).find(c => c.itemId === top.id)!.id) : addExtra('top', top.id)} className={`w-full h-8 rounded-lg text-xs font-bold mt-2 transition-colors ${isAdded ? 'bg-teal-100 text-teal-700 hover:bg-red-100 hover:text-red-700' : 'bg-gray-100 hover:bg-teal-50 text-gray-600 hover:text-teal-700'}`}>{isAdded ? 'تمت الإضافة' : 'إضافة'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><Edit3 className="w-4 h-4" /> تعديل معلومات الدفعة</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">اسم الدفعة *</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">رقم الفاتورة</label>
              <Input value={editInvoiceNo} onChange={e => setEditInvoiceNo(e.target.value)} placeholder="مثلاً: Exp/stl/28/26" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">وصف البضاعة</label>
              <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="مثلاً: اثاث خزائن مخزن" className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">تاريخ التسليم</label>
                <Input type="date" value={editDeliveryDate} onChange={e => setEditDeliveryDate(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">الحالة</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value as Batch['status'])} className="w-full h-9 text-sm rounded-md border border-input bg-background px-2">
                  <option value="جديد">جديد</option>
                  <option value="قيد التجهيز">قيد التجهيز</option>
                  <option value="تم">تم</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setShowEdit(false)}>إلغاء</Button>
              <Button size="sm" onClick={handleEditSave} disabled={!editName.trim()} className="bg-gradient-to-r from-blue-500 to-blue-600 gap-1"><Save className="w-3.5 h-3.5" /> حفظ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN BATCHES COMPONENT
// ═══════════════════════════════════════════
export default function Batches() {
  const { user } = useAuthStore();
  const { batches, projects, products, parts, accessories, tops, addBatch, updateBatch, deleteBatch } = useDataStore();
  const { canEdit, canDelete } = usePermissionStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'list' | 'detail'>('list');
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const [projectId, setProjectId] = useState('');
  const [batchName, setBatchName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [batchDesc, setBatchDesc] = useState('');

  const [listSearch, setListSearch] = useState('');
  const listDebounced = useMemo(() => listSearch.trim().toLowerCase(), [listSearch]);

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || '—';

  const filteredList = useMemo(() => {
    if (!listDebounced) return batches;
    return batches.filter(b =>
      getProjectName(b.projectId).toLowerCase().includes(listDebounced) ||
      (b.name || '').toLowerCase().includes(listDebounced)
    );
  }, [batches, listDebounced, projects]);

  const handleCreate = () => {
    if (!projectId || !batchName.trim()) return;
    const newBatch: Batch = {
      id: uid(), projectId,
      projectName: getProjectName(projectId),
      name: batchName.trim(),
      source: 'local', status: 'جديد', // source is kept for backward compat, batch is general/mixed
      deliveryDate: deliveryDate || undefined,
      invoiceNo: invoiceNo.trim() || undefined,
      desc: batchDesc.trim() || undefined,
      prods: [], extraParts: [], extraAccessories: [], extraTops: [],
      createdAt: today(), updatedAt: today(),
    };
    addBatch(newBatch);
    setShowCreate(false);
    setActiveBatch(newBatch);
    setMode('detail');
    setProjectId(''); setBatchName(''); setDeliveryDate(''); setInvoiceNo(''); setBatchDesc('');
  };

  // Detail mode
  if (mode === 'detail' && activeBatch) {
    return <BatchDetail
      batchId={activeBatch.id}
      onBack={() => setMode('list')}
      onShowNotes={() => setShowNotes(true)}
      canEditFlag={canEdit(user?.role || '', 'batches')}
      canDeleteFlag={canDelete(user?.role || '')}
      getProjectName={getProjectName}
      allProducts={products}
      parts={parts}
      accessories={accessories}
      tops={tops}
      updateBatch={updateBatch}
      deleteBatch={deleteBatch}
      projects={projects}
    />;
  }

  // List mode
  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <Search className="w-4 h-4 text-gray-400" />
          <Input placeholder="البحث في الدفعات..." value={listSearch} onChange={e => setListSearch(e.target.value)} className="flex-1 text-sm" />
          {listSearch && <button onClick={() => setListSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
        {canEdit(user?.role || '', 'batches') && <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1 bg-gradient-to-r from-cyan-500 to-cyan-600"><Plus className="w-4 h-4" /> دفعة جديدة</Button>}
      </div>

      <div className="grid gap-3">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
            <Layers className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-sm">لا توجد دفعات مسجلة</p>
          </div>
        ) : filteredList.map(b => (
          <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setActiveBatch(b); setMode('detail'); }}>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center flex-shrink-0"><Package className="w-6 h-6 text-cyan-700" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-gray-800">{b.name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${b.status === 'جديد' ? 'bg-blue-100 text-blue-700' : b.status === 'قيد التجهيز' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{b.status}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{getProjectName(b.projectId)} {b.deliveryDate ? `• تسليم: ${b.deliveryDate}` : ''} {b.invoiceNo ? `• فاتورة: ${b.invoiceNo}` : ''}</p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-center"><p className="text-lg font-bold text-gray-800">{(b.prods || []).length}</p><p className="text-[10px] text-gray-400">منتج</p></div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="text-center"><p className="text-lg font-bold text-gray-800">{(b.extraParts || []).length + (b.extraAccessories || []).length + (b.extraTops || []).length}</p><p className="text-[10px] text-gray-400">قطعة</p></div>
              <div className="w-px h-8 bg-gray-100" />
              <button onClick={e => { e.stopPropagation(); navigate(`/pick-list/${b.id}`); }} className="p-2 hover:bg-cyan-100 rounded-lg transition-colors" title="كشف القطع"><ClipboardList className="w-4 h-4 text-cyan-600" /></button>
              <div className="w-px h-8 bg-gray-100" />
              {canDelete(user?.role || '') && (
                <button onClick={e => { e.stopPropagation(); if (confirm('هل أنت متأكد؟')) deleteBatch(b.id); }} className="p-2 hover:bg-red-100 rounded-lg transition-colors"><X className="w-4 h-4 text-red-500" /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="text-base">دفعة إنتاجية جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">المشروع *</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full h-9 text-sm rounded-md border border-input bg-background px-2">
                <option value="">اختر المشروع...</option>
                {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">اسم الدفعة *</label>
              <Input value={batchName} onChange={e => setBatchName(e.target.value)} placeholder="مثلاً: دفعة 1 — تسليم يونيو" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">رقم الفاتورة</label>
              <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="مثلاً: Exp/stl/28/26" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">وصف البضاعة</label>
              <Input value={batchDesc} onChange={e => setBatchDesc(e.target.value)} placeholder="مثلاً: اثاث خزائن مخزن" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">تاريخ التسليم</label>
              <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>إلغاء</Button>
              <Button size="sm" onClick={handleCreate} disabled={!projectId || !batchName.trim()} className="bg-gradient-to-r from-cyan-500 to-cyan-600">إنشاء الدفعة والمتابعة</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Notes Drawer */}
      <BatchNotes
        batchId={activeBatch?.id || ''}
        batchName={activeBatch?.name || ''}
        open={showNotes}
        onClose={() => setShowNotes(false)}
      />
    </div>
  );
}
