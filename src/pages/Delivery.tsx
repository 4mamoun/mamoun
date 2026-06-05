// ============================================================
// Delivery Screen — شاشة استلام الشحنات في الموقع
// تعرض فقط الكونتينرات المرسلة (shipmentStatus === 'shipped')
// ============================================================

import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarcodeScanner } from '@/components/barcode';
import {
  Truck, CheckCircle, Package, Search, X, LogOut, ScanLine,
  Building2, Boxes, ChevronDown, ChevronUp, Send,
} from 'lucide-react';

export default function Delivery() {
  const { boxes, containers, projects, batches, updateContainer } = useDataStore();
  const user = useAuthStore(s => s.user);
  const [search, setSearch] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [receivedBoxes, setReceivedBoxes] = useState<Set<string>>(() => {
    // Load from localStorage for persistence
    try { return new Set(JSON.parse(localStorage.getItem('delivered_boxes') || '[]') as string[]); } catch { return new Set<string>(); }
  });

  const toggleContainer = (id: string) => {
    const s = new Set(expandedContainers);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedContainers(s);
  };

  // Save received boxes to localStorage
  const saveReceived = (newSet: Set<string>) => {
    setReceivedBoxes(newSet);
    localStorage.setItem('delivered_boxes', JSON.stringify([...newSet]));
  };

  // Only shipped containers (not yet fully delivered)
  const shippedContainers = useMemo(() => {
    return containers.filter(c => c.shipmentStatus === 'shipped');
  }, [containers]);

  // Filter containers by search
  const filteredContainers = useMemo(() => {
    if (!search.trim()) return shippedContainers;
    const q = search.trim().toLowerCase();
    return shippedContainers.filter(c =>
      c.number.toLowerCase().includes(q) ||
      c.driverName?.toLowerCase().includes(q) ||
      c.plateNumber?.toLowerCase().includes(q)
    );
  }, [shippedContainers, search]);

  // Get boxes for a container
  const getContainerBoxes = (cont: any) => {
    return cont.boxes.map((id: string) => boxes.find(b => b.id === id)).filter(Boolean);
  };

  // Stats
  const totalBoxes = filteredContainers.reduce((sum, c) => sum + c.boxes.length, 0);
  const receivedCount = [...receivedBoxes].length;
  const pendingCount = totalBoxes - receivedCount;

  // Confirm receipt of a box
  const handleConfirmBox = (boxId: string) => {
    const newSet = new Set(receivedBoxes);
    newSet.add(boxId);
    saveReceived(newSet);
  };

  // Confirm receipt of entire container
  const handleConfirmContainer = (contId: string) => {
    if (!confirm('تأكيد استلام كل محتويات الكونتينر؟')) return;
    const cont = containers.find(c => c.id === contId);
    if (!cont) return;
    const newSet = new Set(receivedBoxes);
    cont.boxes.forEach(boxId => newSet.add(boxId));
    saveReceived(newSet);
    // Mark container as delivered
    updateContainer(contId, {
      shipmentStatus: 'delivered',
      deliveredAt: new Date().toISOString(),
      deliveredBy: user?.name || user?.email,
    } as any);
  };

  const handleScan = (code: string) => {
    setSearch(code);
  };

  // Get project name for container
  const getProjectName = (cont: any) => {
    // Find batch that has boxes in this container
    const box = boxes.find(b => cont.boxes.includes(b.id));
    if (box?.batchId) {
      const batch = batches.find(b => b.id === box.batchId);
      if (batch?.projectId) {
        const project = projects.find(p => p.id === batch.projectId);
        return project?.name || '—';
      }
    }
    return cont.project || '—';
  };

  if (shippedContainers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800">استلام الشحنات</h1>
              <p className="text-[9px] text-gray-400">{user?.name || 'موظف استلام'}</p>
            </div>
          </div>
          <button onClick={() => { if (confirm('هل تريد تسجيل الخروج؟')) window.location.reload(); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="تسجيل خروج">
            <LogOut className="w-4 h-4 text-red-500" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400">
          <Send className="w-16 h-16 text-gray-200 mb-4" />
          <p className="text-lg font-bold text-gray-500 mb-2">لا توجد شحنات مرسلة</p>
          <p className="text-sm text-gray-400 text-center max-w-md">سيتم عرض الشحنات هنا بعد إرسالها من شاشة الشحنات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleScan} />

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-800">استلام الشحنات</h1>
            <p className="text-[9px] text-gray-400">{user?.name || 'موظف استلام'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {shippedContainers.length} شحنة
          </span>
          <button onClick={() => { if (confirm('هل تريد تسجيل الخروج؟')) window.location.reload(); }} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="تسجيل خروج">
            <LogOut className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <Truck className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-800">{filteredContainers.length}</p>
            <p className="text-[9px] text-gray-400">شحنة مرسلة</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <Package className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-amber-700">{pendingCount}</p>
            <p className="text-[9px] text-gray-400">قيد الانتظار</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-700">{receivedCount}</p>
            <p className="text-[9px] text-gray-400">تم الاستلام</p>
          </div>
        </div>

        {/* Search + Barcode */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex-1">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <Input placeholder="ابحث برقم الكونتينر أو السائق أو اللوحة..." value={search} onChange={e => setSearch(e.target.value)} className="text-sm border-0 shadow-none" />
            {search && <button onClick={() => setSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>}
          </div>
          <Button size="icon" onClick={() => setScanOpen(true)} className="bg-gradient-to-r from-blue-500 to-cyan-500 h-11 w-11 rounded-xl shadow-sm flex-shrink-0">
            <ScanLine className="w-5 h-5" />
          </Button>
        </div>

        {/* Container Cards */}
        <div className="space-y-3">
          {filteredContainers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Search className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">لا توجد نتائج مطابقة</p>
            </div>
          ) : (
            filteredContainers.map(cont => {
              const contBoxes = getContainerBoxes(cont);
              const isOpen = expandedContainers.has(cont.id);
              const allReceived = contBoxes.length > 0 && contBoxes.every((b: any) => receivedBoxes.has(b.id));
              const projectName = getProjectName(cont);
              return (
                <div key={cont.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${allReceived ? 'border-green-200' : 'border-gray-100'}`}>
                  {/* Container Header */}
                  <button onClick={() => toggleContainer(cont.id)} className="w-full p-4 flex items-center gap-3 hover:bg-gray-50/50 transition-colors text-right">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cont.source === 'local' ? 'bg-green-100' : 'bg-purple-100'}`}>
                      <Truck className={`w-5 h-5 ${cont.source === 'local' ? 'text-green-600' : 'text-purple-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-800">{cont.number}</p>
                        {allReceived && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> {projectName}</p>
                      {cont.driverName && <p className="text-[10px] text-gray-400">السائق: {cont.driverName} {cont.plateNumber && `• اللوحة: ${cont.plateNumber}`}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{contBoxes.length} صندوق</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {/* Boxes List */}
                  {isOpen && (
                    <div className="border-t border-gray-100 p-3 space-y-2">
                      {contBoxes.length === 0 && <p className="text-[10px] text-gray-400 text-center py-3">لا توجد صناديق</p>}
                      {contBoxes.map((box: any) => {
                        const isReceived = receivedBoxes.has(box.id);
                        const itemCount = box.pickItems?.length || 0;
                        const boxW = (Number(box.wgt) || 0) + (box.pickItems || []).reduce((sum: number, item: any) => sum + ((item.weight || 0) * (item.assignedQty || 1)), 0);
                        return (
                          <div key={box.id} className={`rounded-xl border p-3 flex items-center gap-3 ${isReceived ? 'bg-green-50/50 border-green-200 opacity-70' : 'bg-gray-50/50 border-gray-100'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${box.source === 'local' ? 'bg-green-100' : 'bg-purple-100'}`}>
                              <Boxes className={`w-4 h-4 ${box.source === 'local' ? 'text-green-600' : 'text-purple-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold">{box.num}</p>
                                {isReceived && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                              </div>
                              <p className="text-[9px] text-gray-400">{box.type} • {itemCount} عنصر • {boxW.toFixed(0)} كجم</p>
                              {box.bldg && <p className="text-[9px] text-blue-500">{box.bldg} {box.flr && `• ${box.flr}`}</p>}
                            </div>
                            {!isReceived ? (
                              <Button size="sm" onClick={() => handleConfirmBox(box.id)}
                                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold px-4 py-2 text-xs rounded-xl shadow-sm active:scale-95 transition-all flex-shrink-0"
                              >
                                <CheckCircle className="w-3.5 h-3.5 ml-1" />
                                استلام
                              </Button>
                            ) : (
                              <span className="text-[10px] text-green-600 font-bold flex-shrink-0">✓ تم الاستلام</span>
                            )}
                          </div>
                        );
                      })}

                      {/* Confirm All Button */}
                      {!allReceived && contBoxes.length > 0 && (
                        <div className="pt-2 border-t border-gray-100">
                          <Button
                            onClick={() => handleConfirmContainer(cont.id)}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 rounded-xl shadow-sm active:scale-[0.98] transition-all"
                          >
                            <CheckCircle className="w-5 h-5 ml-1" />
                            تأكيد استلام كل محتويات الكونتينر
                          </Button>
                        </div>
                      )}
                      {allReceived && (
                        <div className="pt-2 border-t border-green-100 text-center">
                          <p className="text-xs text-green-600 font-bold">✓ تم استلام كل محتويات الكونتينر</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
