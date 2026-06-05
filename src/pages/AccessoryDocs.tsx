// ============================================================
// توثيق الاكسسوارات — Accessory Documentation
// مسؤول الجودة يضيف صور للصناديق لتوثيق الاكسسوارات
// صلاحية فقط: إضافة صور (بدون تعديل على بيانات الصناديق)
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import type { Box } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, X, Camera, Package, ImageIcon, ChevronLeft, Trash2, ZoomIn, Building2, Layers } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

export default function AccessoryDocs() {
  const { boxes, batches, containers, projects, updateBox } = useDataStore();
  const user = useAuthStore(s => s.user);
  const [search, setSearch] = useState('');

  // Upload images to Firebase Storage (high quality)
  const img = useImageUpload({ folder: 'accessories', autoClear: true });
  const [deb, setDeb] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'import'>('all');
  const [projectFilter, setProjectFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [imgOpen, setImgOpen] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  let timer: ReturnType<typeof setTimeout>;
  const handleSearch = (v: string) => { setSearch(v); clearTimeout(timer); timer = setTimeout(() => setDeb(v.trim().toLowerCase()), 300); };

  // Derived lists for dropdowns
  const projectList = useMemo(() => [...projects].sort((a, b) => (a.name || '').localeCompare(b.name || '')), [projects]);
  const batchListForProject = useMemo(() => {
    const list = !projectFilter ? [...batches] : batches.filter(b => b.projectId === projectFilter);
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [batches, projectFilter]);

  // Filter boxes that have accessories (pickItems with type 'accessory')
  const filteredBoxes = useMemo(() => {
    let result = boxes.filter(b => {
      const hasAccessories = b.pickItems?.some(it => it.type === 'accessory');
      return hasAccessories;
    });

    // Filter by project (find boxes whose batch belongs to this project)
    if (projectFilter) {
      const projectBatchIds = batches.filter(b => b.projectId === projectFilter).map(b => b.id);
      result = result.filter(b => projectBatchIds.includes(b.batchId || ''));
    }

    // Filter by batch
    if (batchFilter) {
      result = result.filter(b => b.batchId === batchFilter);
    }

    if (sourceFilter !== 'all') {
      result = result.filter(b => b.source === sourceFilter);
    }

    if (deb) {
      result = result.filter(b =>
        b.num.toLowerCase().includes(deb) ||
        b.type?.toLowerCase().includes(deb) ||
        b.notes?.toLowerCase().includes(deb)
      );
    }

    return result.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [boxes, batches, deb, sourceFilter, projectFilter, batchFilter]);

  // Stats
  const totalBoxCount = filteredBoxes.length;
  const documentedCount = filteredBoxes.filter(b => (b.images?.length || 0) > 0).length;
  const pendingCount = totalBoxCount - documentedCount;

  // Add image to box
  const addImage = (boxId: string, imgUrl: string) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;
    const images = [...(box.images || []), imgUrl];
    updateBox(boxId, { images });
  };

  // Remove image from box
  const removeImage = (boxId: string, imgIdx: number) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;
    const images = (box.images || []).filter((_, i) => i !== imgIdx);
    updateBox(boxId, { images });
  };

  // Handle drag & drop UI state
  const [dragOver, setDragOver] = useState(false);

  // Watch for compressed image and add to selected box
  useEffect(() => {
    if (img.image && selectedBox) {
      addImage(selectedBox.id, img.image);
      img.clearImage();
    }
  }, [img.image, selectedBox]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
          <p className="text-[10px] text-gray-400 font-medium">الصناديق</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{totalBoxCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
          <p className="text-[10px] text-gray-400 font-medium">موثق</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{documentedCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
          <p className="text-[10px] text-gray-400 font-medium">معلق</p>
          <p className="text-xl font-bold text-amber-500 mt-1">{pendingCount}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400" />
          <Input placeholder="البحث في الصناديق..." value={search} onChange={e => handleSearch(e.target.value)} className="flex-1 text-sm" />
          {search && <button onClick={() => handleSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setSourceFilter('all')} className={`text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors ${sourceFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>الكل</button>
          <button onClick={() => setSourceFilter('local')} className={`text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors ${sourceFilter === 'local' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>محلي</button>
          <button onClick={() => setSourceFilter('import')} className={`text-[10px] px-3 py-1.5 rounded-lg font-medium transition-colors ${sourceFilter === 'import' ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>استيراد</button>
        </div>
      </div>

      {/* Project & Batch Filters */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={projectFilter}
            onChange={e => { setProjectFilter(e.target.value); setBatchFilter(''); }}
            className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
          >
            <option value="">كل المشاريع</option>
            {projectList.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Layers className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={batchFilter}
            onChange={e => setBatchFilter(e.target.value)}
            disabled={!projectFilter}
            className="flex-1 min-w-0 text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">كل الدفعات</option>
            {batchListForProject.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        {(projectFilter || batchFilter) && (
          <button
            onClick={() => { setProjectFilter(''); setBatchFilter(''); }}
            className="text-[10px] text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Box Cards */}
      {filteredBoxes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">لا توجد صناديق تحتوي اكسسوارات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredBoxes.map(box => {
            const batch = batches.find(b => b.id === box.batchId);
            const container = containers.find(c => c.id === box.containerId);
            const accessoryCount = box.pickItems?.filter(it => it.type === 'accessory').reduce((sum, it) => sum + it.qty, 0) || 0;
            const imgCount = box.images?.length || 0;

            return (
              <div key={box.id} className={`bg-white rounded-xl shadow-sm border ${imgCount > 0 ? 'border-emerald-200' : 'border-gray-100'} overflow-hidden transition-all hover:shadow-md`}>
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-bold text-gray-800">{box.num}</span>
                      {box.source && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${box.source === 'local' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                          {box.source === 'local' ? 'محلي' : 'مستورد'}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${imgCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {imgCount > 0 ? `✓ موثق (${imgCount})` : 'غير موثق'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="space-y-1 text-[11px] text-gray-500 mb-3">
                    {batch && <p>الدفعة: <span className="font-medium text-gray-700">{batch.name}</span></p>}
                    {container && <p>الكونتينر: <span className="font-medium text-gray-700">{container.number}</span></p>}
                    <p>نوع الصندوق: <span className="font-medium text-gray-700">{box.type || '—'}</span></p>
                    <p>عدد الاكسسوارات: <span className="font-medium text-amber-600">{accessoryCount}</span></p>
                  </div>

                  {/* Items list */}
                  {box.pickItems && box.pickItems.filter(it => it.type === 'accessory').length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-2 mb-3">
                      <p className="text-[10px] text-gray-400 mb-1.5 font-medium">الاكسسوارات داخل الصندوق:</p>
                      <div className="space-y-1">
                        {box.pickItems.filter(it => it.type === 'accessory').map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-700">{it.name}</span>
                            <span className="text-gray-500 font-mono">{it.qty}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thumbnail gallery */}
                  {(box.images?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {box.images!.slice(0, 4).map((img, idx) => (
                        <button key={idx} onClick={() => { setSelectedBox(box); setZoomImg(img); }} className="relative group">
                          <img src={img} alt="" className="w-14 h-14 rounded-lg object-cover border" />
                          <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-3 h-3 text-white" />
                          </div>
                        </button>
                      ))}
                      {(box.images!.length || 0) > 4 && (
                        <button onClick={() => { setSelectedBox(box); setImgOpen(true); }} className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors">
                          +{(box.images!.length || 0) - 4}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <Button size="sm" variant="outline" onClick={() => { setSelectedBox(box); setImgOpen(true); }} className="gap-1 text-xs w-full">
                    <Camera className="w-3.5 h-3.5" />
                    {imgCount > 0 ? 'إدارة الصور' : 'إضافة صور توثيق'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Manager Dialog */}
      <Dialog open={imgOpen} onOpenChange={setImgOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              توثيق اكسسوارات — {selectedBox?.num}
            </DialogTitle>
          </DialogHeader>

          {selectedBox && (
            <div className="space-y-4 mt-2">
              {/* Box info (read-only) */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-gray-400">الرقم:</span><span className="font-medium">{selectedBox.num}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">النوع:</span><span className="font-medium">{selectedBox.type || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">المصدر:</span><span className="font-medium">{selectedBox.source === 'local' ? 'محلي' : selectedBox.source === 'import' ? 'استيراد' : '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">الاكسسوارات:</span><span className="font-medium text-amber-600">{selectedBox.pickItems?.filter(it => it.type === 'accessory').reduce((s, it) => s + it.qty, 0) || 0} قطعة</span></div>
              </div>

              {/* Upload area */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
                onDrop={(e) => { setDragOver(false); img.handleDrop(e); }}
                onClick={() => document.getElementById('acc-doc-upload')?.click()}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${dragOver || img.isDragOver ? 'border-blue-500 bg-blue-50/60 scale-[1.02]' : 'border-gray-300 bg-gray-50/60 hover:border-gray-400'}`}
              >
                <input id="acc-doc-upload" type="file" accept="image/*" className="hidden" onChange={img.handleUpload} />
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${dragOver || img.isDragOver ? 'bg-blue-100' : img.isCompressing ? 'bg-blue-50' : 'bg-gray-100'}`}>
                    {img.isCompressing ? (
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className={`w-5 h-5 ${dragOver || img.isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                    )}
                  </div>
                  <p className={`text-xs ${dragOver || img.isDragOver ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    {img.isCompressing ? 'جاري ضغط الصورة...' : dragOver || img.isDragOver ? 'أفلت الصورة هنا' : 'اسحب صورة أو انقر للرفع'}
                  </p>
                  {img.sizeInfo && <p className="text-[10px] text-emerald-600 font-medium">{img.sizeInfo}</p>}
                  {!img.sizeInfo && <p className="text-[10px] text-gray-400">PNG, JPG — يتم الضغط تلقائياً</p>}
                </div>
              </div>

              {/* Images Gallery */}
              {(selectedBox.images?.length || 0) > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">الصور المرفقة ({selectedBox.images?.length}):</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedBox.images?.map((img, idx) => (
                      <div key={idx} className="relative group aspect-square">
                        <img src={img} alt="" className="w-full h-full rounded-lg object-cover border cursor-pointer" onClick={() => setZoomImg(img)} />
                        <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setZoomImg(img)} className="p-1 bg-black/50 rounded text-white hover:bg-black/70"><ZoomIn className="w-3 h-3" /></button>
                          <button onClick={() => removeImage(selectedBox.id, idx)} className="p-1 bg-red-500/80 rounded text-white hover:bg-red-600"><Trash2 className="w-3 h-3" /></button>
                        </div>
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/50 text-white px-1.5 rounded">{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-xs">لا توجد صور مرفقة</p>
                  <p className="text-[10px] mt-1">أضف صوراً لتوثيق الاكسسوارات في هذا الصندوق</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => setImgOpen(false)}>إغلاق</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
