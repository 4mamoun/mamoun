// ============================================================
// Containers — الكونتينرات (مشروع → دفعة → كونتينرات → صناديق)
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, X, Trash2, GripVertical, Truck, Weight, Ruler, AlertTriangle, Package, ChevronLeft, BoxSelect, Settings, Save, Lock, Archive, ArchiveRestore, CheckCircle, Send, LayoutTemplate, Hash, Ship } from 'lucide-react';
import { DEFAULT_CONTAINER_TEMPLATES, getNextContainerNumber } from '@/lib/templates';
import type { ContainerTemplate } from '@/types';
import type { Container, Box } from '@/types';
import { toast } from 'sonner';

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function today() { return new Date().toISOString().split('T')[0]; }

function calcBoxWeight(box: Box): number {
  return (Number(box.wgt) || 0) + (box.pickItems || []).reduce((sum: number, item: any) => sum + ((item.weight || 0) * (item.assignedQty || 1)), 0);
}

function calcContainerWeight(cont: Container, allBoxes: Box[]): number {
  const emptyWeight = cont.emptyWeight || 0;
  const boxesWeight = cont.boxes.reduce((sum, boxId) => {
    const box = allBoxes.find(b => b.id === boxId);
    return sum + (box ? calcBoxWeight(box) : 0);
  }, 0);
  return emptyWeight + boxesWeight;
}

// 3D: check if box fits in container
function validateBoxInContainer(box: Box, cont: Container): { fits: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!cont.contLength || !cont.contWidth || !cont.contHeight) return { fits: true, issues };
  const bl = Number(box.boxLength) || 0, bw = Number(box.boxWidth) || 0, bh = Number(box.boxHeight) || 0;
  if (bl === 0 && bw === 0 && bh === 0) return { fits: true, issues };
  const cl = cont.contLength, cw = cont.contWidth, ch = cont.contHeight;
  const orientations = [[bl,bw,bh],[bl,bh,bw],[bw,bl,bh],[bw,bh,bl],[bh,bl,bw],[bh,bw,bl]];
  const fitsAny = orientations.some(([l, w, h]) => l <= cl && w <= cw && h <= ch);
  if (!fitsAny) issues.push(`الصندوق ${bl}×${bw}×${bh} سم لا يتسع في ${cl}×${cw}×${ch} سم`);
  return { fits: fitsAny, issues };
}

export default function Containers() {
  const { containers, boxes, batches, projects, addContainer, updateContainer, deleteContainer, archiveContainer, updateBox } = useDataStore();
  const { user } = useAuthStore();

  // Selection
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Filter
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'import'>('all');

  // Modes
  const [mode, setMode] = useState<'list' | 'detail'>('list');
  const [activeContainer, setActiveContainer] = useState<Container | null>(null);

  // Create container dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createProjectId, setCreateProjectId] = useState('');
  const [createBatchId, setCreateBatchId] = useState('');
  const [cNumber, setCNumber] = useState('');
  const [cDriverName, setCDriverName] = useState('');
  const [cDriverPhone, setCDriverPhone] = useState('');
  const [cPlate, setCPlate] = useState('');
  const [cLength, setCLength] = useState('');
  const [cWidth, setCWidth] = useState('');
  const [cHeight, setCHeight] = useState('');
  const [cEmptyWeight, setCEmptyWeight] = useState('');
  const [cMaxWeight, setCMaxWeight] = useState('');
  const [cSource, setCSource] = useState<'local' | 'import'>('local');
  // Template
  const [selectedContTemplate, setSelectedContTemplate] = useState<ContainerTemplate | null>(null);

  // Edit container dialog
  const [showEdit, setShowEdit] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editPlate, setEditPlate] = useState('');
  const [editLength, setEditLength] = useState('');
  const [editWidth, setEditWidth] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editEmptyWeight, setEditEmptyWeight] = useState('');
  const [editMaxWeight, setEditMaxWeight] = useState('');

  const openEditDialog = (cont: Container) => {
    setEditingContainer(cont);
    setEditNumber(cont.number || '');
    setEditDriverName(cont.driverName || '');
    setEditDriverPhone(cont.driverPhone || '');
    setEditPlate(cont.plateNumber || '');
    setEditLength(cont.contLength ? String(cont.contLength) : '');
    setEditWidth(cont.contWidth ? String(cont.contWidth) : '');
    setEditHeight(cont.contHeight ? String(cont.contHeight) : '');
    setEditEmptyWeight(cont.emptyWeight ? String(cont.emptyWeight) : '');
    setEditMaxWeight(cont.maxWeight ? String(cont.maxWeight) : '');
    setShowEdit(true);
  };

  const handleEditSave = () => {
    if (!editingContainer || !editNumber.trim()) return;
    updateContainer(editingContainer.id, {
      number: editNumber.trim(),
      driverName: editDriverName.trim() || undefined,
      driverPhone: editDriverPhone.trim() || undefined,
      plateNumber: editPlate.trim() || undefined,
      contLength: Number(editLength) || undefined,
      contWidth: Number(editWidth) || undefined,
      contHeight: Number(editHeight) || undefined,
      emptyWeight: Number(editEmptyWeight) || undefined,
      maxWeight: Number(editMaxWeight) || undefined,
    });
    setShowEdit(false);
    setEditingContainer(null);
  };

  // Drag
  const [dragOverCont, setDragOverCont] = useState<string | null>(null);

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const projectBatches = batches.filter(b => b.projectId === selectedProjectId);
  const batchBoxes = boxes.filter(b => b.batchId === selectedBatchId && !b.containerId);

  // ─── Filter logic: show ALL containers by default, filter by selections ───
  // Show active (not shipped) by default
  const [showShipped, setShowShipped] = useState(false);
  // Show archived toggle
  const [showArchived, setShowArchived] = useState(false);

  const filteredContainers = useMemo(() => {
    let result = [...containers];

    // Filter: archived (hide archived by default unless showArchived is true)
    if (!showArchived) {
      result = result.filter(c => !c.archived);
    } else {
      result = result.filter(c => c.archived);
    }

    // Filter: active vs shipped
    // Active = containers still being packed (not ready, not shipped)
    // Shipped = containers that have been sent
    if (!showShipped) {
      result = result.filter(c => !c.shipped && c.shipmentStatus !== 'shipped' && c.shipmentStatus !== 'pending');
    } else {
      result = result.filter(c => c.shipped || c.shipmentStatus === 'shipped');
    }

    // Filter by project
    if (selectedProjectId) {
      result = result.filter(c => c.project === selectedProjectId);
    }

    // Filter by batch: find containers that have boxes from this batch
    if (selectedBatchId) {
      const batchBoxIds = new Set(boxes.filter(b => b.batchId === selectedBatchId).map(b => b.id));
      result = result.filter(c => c.boxes.some(boxId => batchBoxIds.has(boxId)));
    }

    // Filter by source
    if (sourceFilter !== 'all') {
      result = result.filter(c => c.source === sourceFilter);
    }

    // Search
    if (search.trim()) {
      const deb = search.toLowerCase();
      result = result.filter(c =>
        c.number.toLowerCase().includes(deb) ||
        c.driverName?.toLowerCase().includes(deb) ||
        c.plateNumber?.toLowerCase().includes(deb) ||
        c.desc?.toLowerCase().includes(deb)
      );
    }

    return result.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [containers, boxes, selectedProjectId, selectedBatchId, sourceFilter, search, showArchived]);

  const getProjectName = (id?: string) => projects.find(p => p.id === id)?.name || '—';

  const createBatch = batches.find(b => b.id === createBatchId);
  const createProjectBatches = batches.filter(b => b.projectId === createProjectId);

  // ─── Create container ───
  const handleCreate = () => {
    if (!cNumber.trim() || !createBatch) return;
    const newCont: Container = {
      id: uid(),
      number: cNumber.trim(),
      source: cSource,
      project: createProjectId,
      driverName: cDriverName || undefined,
      driverPhone: cDriverPhone || undefined,
      plateNumber: cPlate || undefined,
      contLength: Number(cLength) || undefined,
      contWidth: Number(cWidth) || undefined,
      contHeight: Number(cHeight) || undefined,
      emptyWeight: Number(cEmptyWeight) || undefined,
      maxWeight: Number(cMaxWeight) || undefined,
      boxes: [],
      createdAt: today(),
    };
    addContainer(newCont);
    // Sync filter to the new container's project/batch
    setSelectedProjectId(createProjectId);
    setSelectedBatchId(createBatchId);
    setShowCreate(false);
    resetForm();
    setActiveContainer(newCont);
    setMode('detail');
  };

  const resetForm = () => {
    setCreateProjectId(''); setCreateBatchId('');
    setCNumber(''); setCDriverName(''); setCDriverPhone(''); setCPlate('');
    setCLength(''); setCWidth(''); setCHeight(''); setCEmptyWeight(''); setCMaxWeight(''); setCSource('local');
    setSelectedContTemplate(null);
  };

  const applyContTemplate = (tpl: ContainerTemplate) => {
    setSelectedContTemplate(tpl);
    setCLength(tpl.contLength ? String(tpl.contLength) : '');
    setCWidth(tpl.contWidth ? String(tpl.contWidth) : '');
    setCHeight(tpl.contHeight ? String(tpl.contHeight) : '');
    setCEmptyWeight(tpl.emptyWeight ? String(tpl.emptyWeight) : '');
    setCMaxWeight(tpl.maxWeight ? String(tpl.maxWeight) : '');
  };

  const generateContSequentialNum = () => {
    const nextNum = getNextContainerNumber(containers);
    setCNumber(nextNum);
  };

  // ─── Assign/remove box ───
  const assignBox = (contId: string, boxId: string) => {
    const cont = containers.find(c => c.id === contId);
    const box = boxes.find(b => b.id === boxId);
    if (!cont || !box) return;
    if (cont.source !== box.source) { alert(`لا يمكن وضع صندوق ${box.source==='local'?'محلي':'مستورد'} في كونتينر ${cont.source==='local'?'محلي':'مستورد'}!`); return; }

    const currentWeight = calcContainerWeight(cont, boxes);
    const boxW = calcBoxWeight(box);
    if (cont.maxWeight && currentWeight + boxW > cont.maxWeight) {
      if (!confirm(`⚠️ سيتجاوز الحد!\n${currentWeight.toFixed(1)} + ${boxW.toFixed(1)} = ${(currentWeight+boxW).toFixed(1)} كغ\nالحد: ${cont.maxWeight} كغ\nإضافة رغم ذلك؟`)) return;
    }
    updateContainer(contId, { boxes: [...cont.boxes, boxId] });
    updateBox(boxId, { containerId: contId });
  };

  const removeBox = (contId: string, boxId: string) => {
    const cont = containers.find(c => c.id === contId);
    if (!cont) return;
    updateContainer(contId, { boxes: cont.boxes.filter(b => b !== boxId) });
    updateBox(boxId, { containerId: null });
  };

  // ─── Drag & Drop ───
  const handleDragOver = useCallback((e: React.DragEvent, contId: string) => { e.preventDefault(); setDragOverCont(contId); }, []);
  const handleDragLeave = useCallback(() => setDragOverCont(null), []);
  const handleDrop = useCallback((e: React.DragEvent, contId: string) => {
    e.preventDefault(); setDragOverCont(null);
    const boxId = e.dataTransfer.getData('boxId');
    if (boxId) assignBox(contId, boxId);
  }, [containers, boxes]);

  // ─── Ready to Ship handler ───
  const handleReadyToShip = (contId: string) => {
    const cont = containers.find(c => c.id === contId);
    if (!cont) return;
    if (cont.boxes.length === 0) { alert('لا يمكن إرسال كونتينر فارغ! أضف صناديق أولاً.'); return; }
    if (!confirm(`تأكيد انتهاء تعبئة الكونتينر ${cont.number}؟\n\nسيتم إرساله لشاشة الشحنات لإتمام عملية الإرسال.`)) return;
    updateContainer(contId, {
      shipmentStatus: 'pending',
      readyAt: new Date().toISOString(),
      readyBy: user?.name || user?.email || 'مستخدم',
    } as any);
    setMode('list');
  };

  // ═══════════════════════════════════════════
  // DETAIL MODE
  // ═══════════════════════════════════════════
  if (mode === 'detail' && activeContainer) {
    const cont = containers.find(c => c.id === activeContainer.id) || activeContainer;
    const contBoxes = cont.boxes.map(id => boxes.find(b => b.id === id)).filter(Boolean) as Box[];
    const totalWeight = calcContainerWeight(cont, boxes);
    const isOverWeight = cont.maxWeight ? totalWeight > cont.maxWeight : false;
    const weightPercent = cont.maxWeight ? Math.min(100, (totalWeight / cont.maxWeight) * 100) : 50;
    const isReady = cont.shipmentStatus === 'pending';
    const isShipped = cont.shipped || cont.shipmentStatus === 'shipped';

    // Derive batch from container's boxes (auto-detect)
    const detailBatchId = selectedBatchId || contBoxes[0]?.batchId || '';
    const detailBatch = batches.find(b => b.id === detailBatchId);

    // Available boxes: from this batch, not in any container
    const availableBoxes = boxes.filter(b => b.batchId === detailBatchId && !b.containerId);

    return (
      <div className="animate-fade-in h-[calc(100vh-4rem)] flex flex-col" dir="rtl">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-100 p-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setMode('list')} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold truncate">{cont.number}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${cont.source === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>({cont.source === 'local' ? 'محلي' : 'مستورد'})</span>
              {isReady && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> جاهز للشحن</span>}
              {isShipped && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Send className="w-3 h-3" /> مُرسل</span>}
            </div>
            <p className="text-[10px] text-gray-500">{getProjectName(cont.project)} {detailBatch?.name ? `• ${detailBatch.name}` : ''}</p>
          </div>
          {cont.driverName && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Truck className="w-3 h-3" /> {cont.driverName}</span>}
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${isOverWeight ? 'bg-red-500' : weightPercent > 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${weightPercent}%` }} />
            </div>
            <span className={`text-[10px] font-bold ${isOverWeight ? 'text-red-600' : 'text-gray-600'}`}><Weight className="w-3 h-3 inline" /> {totalWeight.toFixed(0)}{cont.maxWeight ? `/${cont.maxWeight}` : ''} كجم</span>
          </div>
          {/* Ready to Ship button */}
          {!isReady && !isShipped && contBoxes.length > 0 && (
            <button
              onClick={() => handleReadyToShip(cont.id)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-[11px] font-bold px-4 py-2 rounded-xl shadow-sm active:scale-[0.98] transition-all flex-shrink-0"
            >
              <CheckCircle className="w-4 h-4" />
              تم الانتهاء من التعبئة
            </button>
          )}
          {isReady && (
            <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl font-medium flex-shrink-0">
              بانتظار الإرسال من شاشة الشحنات
            </span>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Available boxes from this batch */}
          <div className="w-80 bg-gray-50 border-l border-gray-100 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-white">
              <p className="text-xs font-bold flex items-center gap-2"><Package className="w-4 h-4 text-cyan-600" /> صناديق الدفعة المتاحة</p>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{availableBoxes.filter(b => b.source === 'local').length} محلي</span>
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{availableBoxes.filter(b => b.source === 'import').length} مستورد</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {availableBoxes.length === 0 && <p className="text-[11px] text-gray-400 text-center py-8">لا توجد صناديق متاحة<br/>تأكد من تعبئة الصناديق أولاً</p>}
              {availableBoxes.map(box => {
                const boxW = calcBoxWeight(box);
                const validation = cont.contLength ? validateBoxInContainer(box, cont) : { fits: true, issues: [] };
                return (
                  <div
                    key={box.id}
                    draggable
                    onDragStart={e => e.dataTransfer.setData('boxId', box.id)}
                    className={`rounded-lg p-3 border-2 transition-all cursor-grab hover:shadow-md ${!validation.fits ? 'border-amber-300 bg-amber-50/30' : box.source === 'local' ? 'border-green-300 bg-green-50/20 hover:border-green-500' : 'border-purple-300 bg-purple-50/20 hover:border-purple-500'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${box.source === 'local' ? 'bg-green-100' : 'bg-purple-100'}`}>
                        <Package className={`w-4 h-4 ${box.source === 'local' ? 'text-green-600' : 'text-purple-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-bold truncate">{box.num}</p>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${box.source === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{box.source === 'local' ? 'محلي' : 'مستورد'}</span>
                        </div>
                        <p className="text-[9px] text-gray-400">{box.type} • {boxW.toFixed(1)} كجم</p>
                        {box.boxLength ? <p className="text-[9px] text-gray-400 font-mono">{box.boxLength}×{box.boxWidth}×{box.boxHeight} سم</p> : null}
                      </div>
                      {!validation.fits && (
                        <div className="relative group flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <span className="absolute right-full mr-2 top-0 bg-amber-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">{validation.issues[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Container */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Info */}
            <div className={`rounded-xl border-[2.5px] p-4 mb-4 ${cont.source === 'local' ? 'bg-emerald-50/60 border-emerald-400' : cont.source === 'import' ? 'bg-purple-50/60 border-purple-400' : 'bg-white border-gray-200'}`}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cont.driverName && <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-blue-500" /><div><p className="text-[10px] text-gray-400">السائق</p><p className="text-xs font-bold">{cont.driverName}</p></div></div>}
                {cont.plateNumber && <div className="flex items-center gap-2"><BoxSelect className="w-4 h-4 text-gray-500" /><div><p className="text-[10px] text-gray-400">رقم اللوحة</p><p className="text-xs font-bold">{cont.plateNumber}</p></div></div>}
                {cont.contLength && <div className="flex items-center gap-2"><Ruler className="w-4 h-4 text-gray-500" /><div><p className="text-[10px] text-gray-400">أبعاد الكونتينر</p><p className="text-xs font-bold">{cont.contLength}×{cont.contWidth}×{cont.contHeight} سم</p></div></div>}
                <div className="flex items-center gap-2"><Weight className="w-4 h-4 text-gray-500" /><div><p className="text-[10px] text-gray-400">الوزن</p><p className={`text-xs font-bold ${isOverWeight ? 'text-red-600' : ''}`}>{totalWeight.toFixed(1)}{cont.maxWeight ? ` / ${cont.maxWeight}` : ''} كجم</p></div></div>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={e => handleDragOver(e, cont.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, cont.id)}
              className={`rounded-xl border-2 border-dashed p-4 transition-all min-h-[300px] ${dragOverCont === cont.id ? 'border-cyan-400 bg-cyan-50/50' : cont.source === 'local' ? 'border-emerald-300 bg-emerald-50/30' : cont.source === 'import' ? 'border-purple-300 bg-purple-50/30' : 'border-gray-300 bg-white'}`}
            >
              {dragOverCont === cont.id && <div className="text-center mb-2"><p className="text-sm font-bold text-cyan-600">أفلت الصندوق هنا</p></div>}

              {contBoxes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Package className="w-12 h-12 mb-2 text-gray-200" />
                  <p className="text-sm">اسحب الصناديق من اليسار</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {contBoxes.map(box => {
                    const boxW = calcBoxWeight(box);
                    const validation = cont.contLength ? validateBoxInContainer(box, cont) : { fits: true, issues: [] };
                    return (
                      <div key={box.id} className={`bg-white rounded-xl border p-3 ${!validation.fits ? 'border-amber-300' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${box.source === 'local' ? 'bg-green-100' : 'bg-purple-100'}`}>
                              <Package className={`w-4 h-4 ${box.source === 'local' ? 'text-green-600' : 'text-purple-600'}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold">{box.num}</p>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${box.source === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{box.source === 'local' ? 'محلي' : 'مستورد'}</span>
                              </div>
                              <p className="text-[9px] text-gray-400">{box.type}</p>
                            </div>
                          </div>
                          <button onClick={() => removeBox(cont.id, box.id)} className="p-1.5 hover:bg-red-100 rounded"><X className="w-3.5 h-3.5 text-red-500" /></button>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500">
                          <span className="flex items-center gap-1"><Weight className="w-3 h-3" /> {boxW.toFixed(1)} كجم</span>
                          {box.boxLength && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" /> {box.boxLength}×{box.boxWidth}×{box.boxHeight} سم</span>}
                        </div>
                        {!validation.fits && <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2"><p className="text-[9px] text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {validation.issues[0]}</p></div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // LIST MODE
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 p-3 flex flex-wrap items-center gap-3">
        <Truck className="w-5 h-5 text-cyan-600" />
        <h2 className="text-sm font-bold">الكونتينرات</h2>
        <div className="w-px h-6 bg-gray-200" />
        {/* Project filter */}
        <select value={selectedProjectId} onChange={e => { setSelectedProjectId(e.target.value); setSelectedBatchId(''); }} className="h-8 text-xs rounded-md border border-input bg-background px-2 min-w-[150px]">
          <option value="">كل المشاريع</option>
          {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
        {/* Batch filter */}
        <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} className="h-8 text-xs rounded-md border border-input bg-background px-2 min-w-[180px]" disabled={!selectedProjectId}>
          <option value="">كل الدفعات</option>
          {projectBatches.map(b => (<option key={b.id} value={b.id}>{b.name || 'دفعة'}</option>))}
        </select>
        {/* Source filter */}
        <div className="flex gap-1">
          <button onClick={() => setSourceFilter('all')} className={`text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors ${sourceFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>الكل</button>
          <button onClick={() => setSourceFilter('local')} className={`text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors ${sourceFilter === 'local' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>محلي</button>
          <button onClick={() => setSourceFilter('import')} className={`text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors ${sourceFilter === 'import' ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>مستورد</button>
        </div>
        {/* Active / Shipped toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setShowShipped(false)} className={`text-[10px] px-3 py-1.5 rounded-md font-medium transition-all ${!showShipped ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            قيد التعبئة ({containers.filter(c => !c.shipped && c.shipmentStatus !== 'shipped' && c.shipmentStatus !== 'pending' && !c.archived).length})
          </button>
          <button onClick={() => setShowShipped(true)} className={`text-[10px] px-3 py-1.5 rounded-md font-medium transition-all ${showShipped ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            مُرسل ({containers.filter(c => (c.shipped || c.shipmentStatus === 'shipped') && !c.archived).length})
          </button>
        </div>
        {/* Archived toggle */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg font-medium transition-all ${showArchived ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
          title={showArchived ? 'إخفاء المؤرشف' : 'عرض المؤرشف'}
        >
          {showArchived ? <ArchiveRestore className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
          {showArchived ? 'المؤرشف' : 'مؤرشف'}
          <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{containers.filter(c => c.archived).length}</span>
        </button>
        <Button size="sm" onClick={() => { resetForm(); generateContSequentialNum(); setShowCreate(true); }} className="gap-1 bg-gradient-to-r from-cyan-500 to-cyan-600">
          <Plus className="w-3.5 h-3.5" /> كونتينر جديد
        </Button>
        <div className="flex-1" />
        {/* Search */}
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-40" />
          {search && <button onClick={() => setSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
        {(selectedProjectId || selectedBatchId || search || sourceFilter !== 'all') && (
          <button onClick={() => { setSelectedProjectId(''); setSelectedBatchId(''); setSearch(''); setSourceFilter('all'); }} className="text-[10px] text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 pt-4 flex items-center gap-2 text-[10px] text-gray-400">
        <span className="font-bold text-gray-600">{filteredContainers.length}</span> كونتينر
        {selectedProjectId && <span>• {getProjectName(selectedProjectId)}</span>}
        {selectedBatchId && selectedBatch && <span>• {selectedBatch.name}</span>}
      </div>

      {/* Containers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
        {filteredContainers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
            <Truck className="w-16 h-16 mb-4 text-gray-200" />
            <p className="text-sm">لا توجد كونتينرات مطابقة</p>
            <p className="text-xs mt-1">عدل الفلاتر أو أنشئ كونتينراً جديداً</p>
          </div>
        ) : filteredContainers.map(cont => {
            const totalWeight = calcContainerWeight(cont, boxes);
            const isOverWeight = cont.maxWeight ? totalWeight > cont.maxWeight : false;
            const contBoxCount = cont.boxes.length;
            return (
              <div key={cont.id} className={`rounded-xl shadow-sm border-[2.5px] p-4 transition-shadow relative group ${cont.shipped || cont.shipmentStatus === 'shipped' ? 'bg-gray-50 border-gray-300 opacity-75' : cont.source === 'local' ? 'bg-emerald-50/60 border-emerald-400 hover:shadow-md' : cont.source === 'import' ? 'bg-purple-50/60 border-purple-400 hover:shadow-md' : 'bg-white border-gray-200 hover:shadow-md'}`}>
                {/* Edit button - hidden for shipped */}
                {!(cont.shipped || cont.shipmentStatus === 'shipped') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditDialog(cont); }}
                    className="absolute top-2 left-2 p-1.5 bg-gray-50 hover:bg-blue-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="تعديل الكونتينر"
                  >
                    <Settings className="w-3.5 h-3.5 text-gray-500 hover:text-blue-600" />
                  </button>
                )}
                {/* Shipped badge */}
                {(cont.shipped || cont.shipmentStatus === 'shipped') && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    <Lock className="w-3 h-3" /> مُرسل
                  </div>
                )}
                {/* Archive/Delete buttons */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  {!cont.archived && (
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`أرشفة الكونتينر ${cont.number}؟\nلن يظهر في القائمة الرئيسية.`)) archiveContainer(cont.id, user?.name || user?.email || 'مستخدم'); }}
                      className="p-1.5 bg-gray-50 hover:bg-amber-100 rounded-lg"
                      title="أرشفة"
                    >
                      <Archive className="w-3.5 h-3.5 text-gray-400 hover:text-amber-600" />
                    </button>
                  )}
                  {cont.archived && (
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`حذف الكونتينر ${cont.number} نهائياً؟`)) deleteContainer(cont.id); }}
                      className="p-1.5 bg-gray-50 hover:bg-red-100 rounded-lg"
                      title="حذف نهائي"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-600" />
                    </button>
                  )}
                </div>
                <div className="flex items-start justify-between mb-3 cursor-pointer" onClick={() => { if (!cont.shipped && cont.shipmentStatus !== 'shipped' && !cont.archived) { setActiveContainer(cont); setMode('detail'); } }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cont.archived ? 'bg-amber-100' : cont.shipped || cont.shipmentStatus === 'shipped' ? 'bg-gray-200' : cont.source === 'local' ? 'bg-emerald-200' : 'bg-purple-200'}`}>
                      <Truck className={`w-6 h-6 ${cont.archived ? 'text-amber-600' : cont.shipped || cont.shipmentStatus === 'shipped' ? 'text-gray-500' : cont.source === 'local' ? 'text-emerald-700' : 'text-purple-700'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{cont.number}</p>
                      {cont.driverName && <p className="text-[10px] text-gray-400 flex items-center gap-1"><Truck className="w-3 h-3" /> {cont.driverName} {cont.plateNumber ? `• ${cont.plateNumber}` : ''}</p>}
                      {cont.archivedAt && <p className="text-[9px] text-amber-500 mt-0.5">مؤرشف: {new Date(cont.archivedAt).toLocaleDateString('ar-SA')}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {cont.archived && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">📦 مؤرشف</span>}
                    {(cont.shipped || cont.shipmentStatus === 'shipped') && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">🔒 مُغلق</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cont.source === 'local' ? 'bg-emerald-300 text-emerald-900' : 'bg-purple-300 text-purple-900'}`}>{cont.source === 'local' ? 'محلي' : 'مستورد'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {contBoxCount} صندوق</span>
                  <span className="flex items-center gap-1"><Weight className="w-3 h-3" /> {totalWeight.toFixed(0)} كجم</span>
                </div>
                {cont.maxWeight && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isOverWeight ? 'bg-red-500' : totalWeight > cont.maxWeight * 0.8 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (totalWeight / cont.maxWeight) * 100)}%` }} />
                    </div>
                    <span className={`text-[9px] font-bold ${isOverWeight ? 'text-red-600' : ''}`}>{totalWeight.toFixed(0)}/{cont.maxWeight}</span>
                  </div>
                )}
                {isOverWeight && <p className="text-[9px] text-red-500 mt-1">⚠️ تجاوز الحد الأقصى!</p>}
                {/* Ready to Ship Button */}
                {!cont.readyToShip && !cont.shipped && cont.boxes.length > 0 && (
                  <button
                    onClick={() => {
                      const now = new Date().toISOString();
                      updateContainer(cont.id, {
                        readyToShip: true,
                        readyToShipAt: now,
                        readyToShipBy: user?.name || '',
                        workflowStage: 'shipment_ready',
                      });
                      toast.success('تم تحديد الكونتينر جاهز للشحن');
                    }}
                    className="w-full mt-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Ship className="w-3.5 h-3.5" />
                    جاهز للشحن
                  </button>
                )}
                {cont.readyToShip && !cont.shipped && (
                  <div className="mt-2 py-1.5 bg-green-50 text-green-700 text-xs rounded-lg font-medium flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    جاهز للشحن — {cont.readyToShipBy}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto pb-8" dir="rtl">
          <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><Truck className="w-5 h-5 text-cyan-600" /> تعريف كونتينر جديد</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            {/* Template Selection */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5 flex items-center gap-1"><LayoutTemplate className="w-3 h-3" /> قالب قياسي</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSelectedContTemplate(null)} className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${!selectedContTemplate ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 hover:border-gray-300'}`}>مخصص</button>
                {DEFAULT_CONTAINER_TEMPLATES.map(tpl => (
                  <button key={tpl.id} onClick={() => applyContTemplate(tpl)} className={`p-2 rounded-lg border text-[10px] font-bold text-center transition-all ${selectedContTemplate?.id === tpl.id ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 hover:border-gray-300'}`} title={`${tpl.contLength}×${tpl.contWidth}×${tpl.contHeight} سم`}>
                    {tpl.name}
                    <span className="block text-[9px] font-normal text-gray-400 mt-0.5">{tpl.contLength}×{tpl.contWidth}×{tpl.contHeight} سم</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Sequential Number */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <label className="text-xs font-semibold text-amber-700 block mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> الرقم التسلسلي</label>
              <div className="flex items-center gap-2">
                <Input value={cNumber} onChange={e => setCNumber(e.target.value)} className="text-sm font-bold text-center" placeholder="CNT-001" />
                <button onClick={generateContSequentialNum} className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-2 rounded-lg font-bold transition-colors flex-shrink-0">توليد تلقائي</button>
              </div>
            </div>
            {/* Project & Batch Selection */}
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-2">اختر المشروع والدفعة *</p>
              <div className="space-y-2">
                <select value={createProjectId} onChange={e => { setCreateProjectId(e.target.value); setCreateBatchId(''); }} className="w-full h-9 text-sm rounded-md border border-blue-200 bg-white px-2">
                  <option value="">اختر المشروع...</option>
                  {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
                <select value={createBatchId} onChange={e => setCreateBatchId(e.target.value)} disabled={!createProjectId} className="w-full h-9 text-sm rounded-md border border-blue-200 bg-white px-2 disabled:opacity-40">
                  <option value="">اختر الدفعة...</option>
                  {createProjectBatches.map(b => (<option key={b.id} value={b.id}>{b.name || 'دفعة'}</option>))}
                </select>
                {/* Source selector — independent from batch */}
                <div>
                  <label className="text-[10px] font-semibold text-gray-600 block mb-1">نوع الكونتينر *</label>
                  <div className="flex gap-2">
                    <button onClick={() => setCSource('local')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${cSource==='local'?'bg-green-600 text-white':'bg-green-50 text-green-700 hover:bg-green-100'}`}>محلي</button>
                    <button onClick={() => setCSource('import')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${cSource==='import'?'bg-purple-600 text-white':'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>مستورد</button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">تحدد نوع الصناديق التي يمكن وضعها في هذا الكونتينر</p>
                </div>
              </div>
            </div>
            {/* Driver */}
            <div className="border-t border-gray-100 pt-3"><p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> بيانات السائق</p><div className="grid grid-cols-3 gap-3"><Input value={cDriverName} onChange={e => setCDriverName(e.target.value)} placeholder="اسم السائق" className="text-sm" /><Input value={cDriverPhone} onChange={e => setCDriverPhone(e.target.value)} placeholder="هاتف" className="text-sm" /><Input value={cPlate} onChange={e => setCPlate(e.target.value)} placeholder="رقم اللوحة" className="text-sm" /></div></div>
            {/* Dimensions */}
            <div className="border-t border-gray-100 pt-3"><p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> أبعاد الكونتينر (سم)</p><div className="grid grid-cols-3 gap-3"><Input value={cLength} onChange={e => setCLength(e.target.value)} placeholder="طول" className="text-sm text-center" type="number" /><Input value={cWidth} onChange={e => setCWidth(e.target.value)} placeholder="عرض" className="text-sm text-center" type="number" /><Input value={cHeight} onChange={e => setCHeight(e.target.value)} placeholder="ارتفاع" className="text-sm text-center" type="number" /></div></div>
            {/* Weight */}
            <div className="border-t border-gray-100 pt-3"><p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><Weight className="w-3.5 h-3.5" /> الوزن (كجم)</p><div className="grid grid-cols-2 gap-3"><Input value={cEmptyWeight} onChange={e => setCEmptyWeight(e.target.value)} placeholder="وزن فارغ" className="text-sm" type="number" /><Input value={cMaxWeight} onChange={e => setCMaxWeight(e.target.value)} placeholder="حد أقصى" className="text-sm" type="number" /></div></div>
            {selectedContTemplate && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-[10px] text-cyan-700">
                <p className="font-bold">{selectedContTemplate.name}</p>
                <p>{selectedContTemplate.contLength}×{selectedContTemplate.contWidth}×{selectedContTemplate.contHeight} سم • فارغ: {selectedContTemplate.emptyWeight}كغ • max: {selectedContTemplate.maxWeight}كغ</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>إلغاء</Button><Button size="sm" onClick={handleCreate} disabled={!cNumber.trim() || !createProjectId || !createBatchId} className="bg-gradient-to-r from-cyan-500 to-cyan-600">إنشاء</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto pb-8" dir="rtl">
          <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" /> تعديل الكونتينر</DialogTitle></DialogHeader>
          {editingContainer && (
            <div className="space-y-3 mt-4">
              <div className="bg-gray-50 rounded-xl p-3 text-[11px] text-gray-500">
                <div className="flex justify-between"><span>المشروع:</span><span className="font-medium text-gray-700">{getProjectName(editingContainer.project)}</span></div>
                <div className="flex justify-between"><span>المصدر:</span><span className={`font-medium px-2 py-0.5 rounded-full text-[10px] ${editingContainer.source === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{editingContainer.source === 'local' ? 'محلي' : 'مستورد'}</span></div>
                <div className="flex justify-between"><span>الصناديق:</span><span className="font-medium">{editingContainer.boxes.length} صندوق</span></div>
              </div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">رقم الكونتينر *</label><Input value={editNumber} onChange={e => setEditNumber(e.target.value)} className="text-sm" /></div>
              {/* Driver */}
              <div className="border-t border-gray-100 pt-3"><p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> بيانات السائق</p><div className="grid grid-cols-3 gap-3"><Input value={editDriverName} onChange={e => setEditDriverName(e.target.value)} placeholder="اسم السائق" className="text-sm" /><Input value={editDriverPhone} onChange={e => setEditDriverPhone(e.target.value)} placeholder="هاتف" className="text-sm" /><Input value={editPlate} onChange={e => setEditPlate(e.target.value)} placeholder="رقم اللوحة" className="text-sm" /></div></div>
              {/* Dimensions */}
              <div className="border-t border-gray-100 pt-3"><p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> أبعاد الكونتينر (سم)</p><div className="grid grid-cols-3 gap-3"><Input value={editLength} onChange={e => setEditLength(e.target.value)} placeholder="طول" className="text-sm text-center" type="number" /><Input value={editWidth} onChange={e => setEditWidth(e.target.value)} placeholder="عرض" className="text-sm text-center" type="number" /><Input value={editHeight} onChange={e => setEditHeight(e.target.value)} placeholder="ارتفاع" className="text-sm text-center" type="number" /></div></div>
              {/* Weight */}
              <div className="border-t border-gray-100 pt-3"><p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><Weight className="w-3.5 h-3.5" /> الوزن (كجم)</p><div className="grid grid-cols-2 gap-3"><Input value={editEmptyWeight} onChange={e => setEditEmptyWeight(e.target.value)} placeholder="وزن فارغ" className="text-sm" type="number" /><Input value={editMaxWeight} onChange={e => setEditMaxWeight(e.target.value)} placeholder="حد أقصى" className="text-sm" type="number" /></div></div>
              <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" size="sm" onClick={() => setShowEdit(false)}>إلغاء</Button><Button size="sm" onClick={handleEditSave} disabled={!editNumber.trim()} className="bg-gradient-to-r from-blue-500 to-blue-600 gap-1"><Save className="w-3.5 h-3.5" /> حفظ</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
