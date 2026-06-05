// ============================================================
// Shipments — لوحة معاينة الشحنات + إرسال الشحنة
// ملخص: مشاريع → دفعات → كونتينرات → صناديق
// بعد "تم الإرسال" → ترحيل لشاشة الاستلام
// ============================================================

import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import {
  ChevronDown, ChevronUp, Building2, Boxes, Package, Truck, FolderOpen,
  Weight, CalendarDays, Send, CheckCircle, Clock, MapPin,
} from 'lucide-react';

function calcBoxWeight(box: any): number {
  return (Number(box.wgt) || 0) + (box.pickItems || []).reduce((sum: number, item: any) => sum + ((item.weight || 0) * (item.assignedQty || 1)), 0);
}

function calcContainerWeight(cont: any, allBoxes: any[]): number {
  return (cont.emptyWeight || 0) + cont.boxes.reduce((sum: number, boxId: string) => {
    const box = allBoxes.find(b => b.id === boxId);
    return sum + (box ? calcBoxWeight(box) : 0);
  }, 0);
}

export default function Shipments() {
  const { projects, batches, containers, boxes, updateContainer, updateBox, deductStockForShipment } = useDataStore();
  const user = useAuthStore(s => s.user);

  // Expand/collapse state
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());

  const toggleProject = (id: string) => { const s = new Set(expandedProjects); s.has(id) ? s.delete(id) : s.add(id); setExpandedProjects(s); };
  const toggleBatch = (id: string) => { const s = new Set(expandedBatches); s.has(id) ? s.delete(id) : s.add(id); setExpandedBatches(s); };
  const toggleContainer = (id: string) => { const s = new Set(expandedContainers); s.has(id) ? s.delete(id) : s.add(id); setExpandedContainers(s); };

  // Shipment status helpers
  type ShipmentStatus = 'pending' | 'shipped' | 'delivered';
  const getShipmentStatus = (cont: any): ShipmentStatus => cont.shipmentStatus || 'pending';

  const handleSendShipment = async (contId: string) => {
    if (!confirm('تأكيد إرسال الشحنة؟ سيتم صرف الكميات من المخزون (إلغاء الحجز + الصرف) وترحيلها لشاشة الاستلام في الموقع.')) return;

    const container = containers.find(c => c.id === contId);
    if (!container) return;

    // 1. Lock all boxes inside this container
    const containerBoxIds = new Set(container.boxes);
    const containerBoxes = boxes.filter(b => containerBoxIds.has(b.id));
    for (const box of containerBoxes) {
      updateBox(box.id, { shipped: true });
    }

    // 2. Lock the container itself
    updateContainer(contId, {
      shipmentStatus: 'shipped',
      shipped: true,
      shippedAt: new Date().toISOString(),
      shippedBy: user?.name || user?.email,
    } as any);

    // 3. Deduct stock
    const result = await deductStockForShipment(contId, container.number, user?.name || user?.email || '');
    if (result.success) {
      console.log(`[Shipments] ✅ ${result.message}`);
    } else {
      console.warn(`[Shipments] ⚠️ ${result.message}`);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const shippedConts = containers.filter(c => c.shipmentStatus === 'shipped').length;
    const deliveredConts = containers.filter(c => c.shipmentStatus === 'delivered').length;
    const pendingConts = containers.length - shippedConts - deliveredConts;
    return {
      totalProjects: projects.length,
      totalBatches: batches.length,
      totalContainers: containers.length,
      totalBoxes: boxes.filter(b => b.pickItems && b.pickItems.length > 0).length,
      totalWeight: boxes.reduce((sum, b) => sum + calcBoxWeight(b), 0),
      pendingConts,
      shippedConts,
      deliveredConts,
    };
  }, [projects, batches, containers, boxes]);

  // Status badge renderer
  const StatusBadge = ({ status }: { status: ShipmentStatus }) => {
    const styles = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, label: 'قيد الانتظار' },
      shipped: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Send, label: 'تم الإرسال' },
      delivered: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'تم الاستلام' },
    };
    const s = styles[status];
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full ${s.bg} ${s.text} font-medium`}>
        <Icon className="w-3 h-3" /> {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-blue-600" /></div>
            <p className="text-[10px] text-gray-400">المشاريع</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.totalProjects}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center"><FolderOpen className="w-4 h-4 text-cyan-600" /></div>
            <p className="text-[10px] text-gray-400">الدفعات</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.totalBatches}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><Truck className="w-4 h-4 text-purple-600" /></div>
            <p className="text-[10px] text-gray-400">الكونتينرات</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.totalContainers}</p>
          <div className="flex gap-1 mt-1 flex-wrap">
            <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{stats.pendingConts} قيد الانتظار</span>
            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{stats.shippedConts} مرسلة</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><Package className="w-4 h-4 text-amber-600" /></div>
            <p className="text-[10px] text-gray-400">الصناديق المعبأة</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.totalBoxes}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600" /></div>
            <p className="text-[10px] text-gray-400">تم استلامها</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.deliveredConts}</p>
        </div>
      </div>

      {/* ─── Projects Tree ─── */}
      <div className="space-y-3">
        {projects.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">لا توجد مشاريع مسجلة</div>}
        {projects.map(project => {
          // Match containers by project CODE (not ID) — containers store project code
          const projectCode = project.code || project.id;
          const projectBatches = batches.filter(b => b.projectId === project.id);
          const isProjOpen = expandedProjects.has(project.id);
          return (
            <div key={project.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Project Header */}
              <button onClick={() => toggleProject(project.id)} className="w-full p-4 flex items-center gap-3 hover:bg-gray-50/50 transition-colors text-right">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5 text-blue-700" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{project.name}</p>
                  <p className="text-[10px] text-gray-400">{projectBatches.length} دفعة • {project.buildings?.length || 0} مبنى</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-center"><p className="text-lg font-bold text-gray-700">{containers.filter(c => c.project === projectCode || c.project === project.id).length}</p><p className="text-[9px] text-gray-400">كونتينر</p></div>
                  <div className="w-px h-8 bg-gray-100" />
                  <div className="text-center"><p className="text-lg font-bold text-gray-700">{boxes.filter(b => { const batch = batches.find(batch => batch.id === b.batchId); return batch?.projectId === project.id; }).length}</p><p className="text-[9px] text-gray-400">صندوق</p></div>
                  {isProjOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </button>

              {/* Batches */}
              {isProjOpen && (
                <div className="border-t border-gray-100 mr-4">
                  {projectBatches.length === 0 && <p className="text-[11px] text-gray-400 text-center py-4">لا توجد دفعات لهذا المشروع</p>}
                  {projectBatches.map(batch => {
                    const batchBoxes = boxes.filter(b => b.batchId === batch.id);
                    const batchBoxIds = new Set(batchBoxes.map(b => b.id));
                    // Match containers: either by box assignment OR by project code + source matching batch
                    const projectCode = project.code || project.id;
                    const batchContainerIds = new Set(
                      containers.filter(c =>
                        c.boxes.some(boxId => batchBoxIds.has(boxId)) ||
                        (c.project === projectCode && c.source === batch.source)
                      ).map(c => c.id)
                    );
                    const batchContainers = containers.filter(c => batchContainerIds.has(c.id));
                    const isBatchOpen = expandedBatches.has(batch.id);
                    return (
                      <div key={batch.id} className="border-t border-gray-50">
                        <button onClick={() => toggleBatch(batch.id)} className="w-full p-3 pl-4 flex items-center gap-3 hover:bg-gray-50/30 transition-colors text-right">
                          <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0"><FolderOpen className="w-4 h-4 text-cyan-600" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold">{batch.name}</p>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${batch.source === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{batch.source === 'local' ? 'محلي' : 'مستورد'}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${batch.status === 'جديد' ? 'bg-blue-100 text-blue-700' : batch.status === 'قيد التجهيز' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{batch.status}</span>
                            </div>
                            <p className="text-[10px] text-gray-400">{batch.deliveryDate ? <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {batch.deliveryDate}</span> : ''}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{batch.prods.length} منتج</span>
                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{batchContainers.length} كونتينر</span>
                            {isBatchOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </button>

                        {/* Containers */}
                        {isBatchOpen && (
                          <div className="mr-6 border-t border-gray-50">
                            {batchContainers.length === 0 && <p className="text-[10px] text-gray-400 text-center py-3">لا توجد كونتينرات لهذه الدفعة</p>}
                            {batchContainers.map(cont => {
                              const contBoxes = cont.boxes.map(id => boxes.find(b => b.id === id)).filter(Boolean);
                              const contWeight = calcContainerWeight(cont, boxes);
                              const isContOpen = expandedContainers.has(cont.id);
                              const shipStatus = getShipmentStatus(cont);
                              return (
                                <div key={cont.id} className="border-t border-gray-50">
                                  <button onClick={() => toggleContainer(cont.id)} className="w-full p-3 pl-4 flex items-center gap-3 hover:bg-gray-50/20 transition-colors text-right">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cont.source === 'local' ? 'bg-green-50' : 'bg-purple-50'}`}><Truck className={`w-3.5 h-3.5 ${cont.source === 'local' ? 'text-green-600' : 'text-purple-600'}`} /></div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs font-bold">{cont.number}</p>
                                        <StatusBadge status={shipStatus} />
                                      </div>
                                      {cont.driverName && <p className="text-[9px] text-gray-400 flex items-center gap-1"><Truck className="w-3 h-3" /> {cont.driverName} {cont.plateNumber ? `• ${cont.plateNumber}` : ''}</p>}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{contBoxes.length} صندوق</span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${contWeight > (cont.maxWeight || 99999) ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}><Weight className="w-3 h-3 inline" /> {contWeight.toFixed(0)} كجم</span>
                                      {isContOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </div>
                                  </button>

                                  {/* Container actions + Boxes */}
                                  {isContOpen && (
                                    <div className="mr-6 border-t border-gray-50">
                                      {/* Send Shipment Button */}
                                      {shipStatus === 'pending' && (
                                        <div className="p-3 bg-amber-50/50 border-b border-amber-100">
                                          <button
                                            onClick={() => handleSendShipment(cont.id)}
                                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-bold py-2.5 px-4 rounded-xl shadow-sm active:scale-[0.98] transition-all"
                                          >
                                            <Send className="w-4 h-4" />
                                            تم إرسال الشحنة → ترحيل لشاشة الاستلام
                                          </button>
                                          <p className="text-[10px] text-amber-600 text-center mt-1.5">بالضغط هنا سيتم ترحيل الكونتينر لشاشة استلام الشحنات في الموقع</p>
                                        </div>
                                      )}
                                      {shipStatus === 'shipped' && (
                                        <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2">
                                          <Send className="w-4 h-4 text-blue-600" />
                                          <p className="text-xs text-blue-700 font-medium">تم إرسال الشحنة — بانتظار الاستلام في الموقع</p>
                                          {cont.shippedBy && <span className="text-[9px] text-blue-400 mr-auto">بواسطة: {cont.shippedBy}</span>}
                                        </div>
                                      )}
                                      {shipStatus === 'delivered' && (
                                        <div className="p-3 bg-green-50/50 border-b border-green-100 flex items-center gap-2">
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                          <p className="text-xs text-green-700 font-medium">✓ تم استلام الشحنة في الموقع</p>
                                        </div>
                                      )}

                                      {/* Boxes inside container */}
                                      {contBoxes.length === 0 && <p className="text-[10px] text-gray-400 text-center py-2">لا توجد صناديق</p>}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                                        {contBoxes.map(box => {
                                          const boxW = calcBoxWeight(box as any);
                                          const itemCount = (box as any).pickItems?.length || 0;
                                          return (
                                            <div key={box!.id} className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
                                              <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${(box as any).source === 'local' ? 'bg-green-100' : 'bg-purple-100'}`}><Boxes className={`w-3 h-3 ${(box as any).source === 'local' ? 'text-green-600' : 'text-purple-600'}`} /></div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold">{(box as any).num}</p>
                                                <p className="text-[9px] text-gray-400">{(box as any).type} • {itemCount} عنصر</p>
                                                {(box as any).bldg && <p className="text-[9px] text-blue-500">{(box as any).bldg} {(box as any).flr && `• ${(box as any).flr}`}</p>}
                                              </div>
                                              <span className="text-[10px] font-bold text-gray-600 flex-shrink-0">{boxW.toFixed(0)} كجم</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Unboxed boxes */}
                            {batchBoxes.filter(b => !b.containerId).length > 0 && (
                              <div className="border-t border-dashed border-gray-200 mr-6 p-3">
                                <p className="text-[10px] text-gray-400 mb-2 flex items-center gap-1"><Package className="w-3 h-3" /> صناديق غير مخصصة لكونتينر ({batchBoxes.filter(b => !b.containerId).length})</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {batchBoxes.filter(b => !b.containerId).map(box => {
                                    const boxW = calcBoxWeight(box);
                                    const itemCount = box.pickItems?.length || 0;
                                    return (
                                      <div key={box.id} className="bg-amber-50 rounded-lg p-2.5 flex items-center gap-2 border border-amber-100">
                                        <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center flex-shrink-0"><Package className="w-3 h-3 text-amber-600" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[11px] font-bold">{box.num}</p>
                                          <p className="text-[9px] text-gray-400">{box.type} • {itemCount} عنصر</p>
                                          {box.bldg && <p className="text-[9px] text-blue-500">{box.bldg} {box.flr && `• ${box.flr}`}</p>}
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-600 flex-shrink-0">{boxW.toFixed(0)} كجم</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
