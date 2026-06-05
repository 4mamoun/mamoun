import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { usePermissionStore } from '@/store/permissionStore';
import { useAuthStore } from '@/store/authStore';
import type { Accessory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Pencil, Trash2, X, Layers, Barcode, Upload, FileSpreadsheet, ImageIcon, LayoutGrid, Rows3, LayoutList, RefreshCw, History } from 'lucide-react';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import ImportDialog from '@/components/ImportDialog';
import ImageUpload from '@/components/ImageUpload';
import ImagePreviewDialog from '@/components/ImagePreviewDialog';
import StockCard from '@/components/StockCard';
import { generateBarcode, extractBarcodes } from '@/utils/barcode';
import { generateShortId } from '@/utils/shortLink';
type ViewMode = 'table' | 'grid' | 'thumbnails';

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function today() { return new Date().toISOString().split('T')[0]; }

export default function Accessories() {
  const { user } = useAuthStore();
  const { accessories, addAccessory: addAccStore, updateAccessory, deleteAccessory } = useDataStore();
  const { canEdit, canDelete } = usePermissionStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Accessory | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [barcode, setBarcode] = useState('');
  const [img, setImg] = useState('');
  const [bcOpen, setBcOpen] = useState(false);
  const [bcCode, setBcCode] = useState('');
  const [bcName, setBcName] = useState('');
  const [bcShortId, setBcShortId] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  // Stock Card
  const [stockCardOpen, setStockCardOpen] = useState(false);
  const [stockCardAcc, setStockCardAcc] = useState<Accessory | null>(null);

  const [previewImage, setPreviewImage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  let searchTimer: ReturnType<typeof setTimeout>;
  const handleSearch = (val: string) => { setSearch(val); clearTimeout(searchTimer); searchTimer = setTimeout(() => setDebouncedSearch(val.trim().toLowerCase()), 300); };

  const filtered = useMemo(() => {
    if (!debouncedSearch) return accessories;
    return accessories.filter(a => a.name.toLowerCase().includes(debouncedSearch) || a.code.toLowerCase().includes(debouncedSearch));
  }, [accessories, debouncedSearch]);

  const openAdd = () => { setEditing(null); setCode(''); setName(''); setUnit(''); setBarcode(''); setImg(''); setIsOpen(true); };
  const openEdit = (a: Accessory) => { setEditing(a); setCode(a.code); setName(a.name); setUnit(a.unit); setBarcode(a.barcode || ''); setImg(a.img || ''); setIsOpen(true); };

  const handleSave = () => { if (!code.trim() || !name.trim()) return; const autoBarcode = barcode.trim() || generateBarcode('accessory', extractBarcodes(accessories), code); const data: Accessory = { id: editing?.id || uid(), code: code.trim(), name: name.trim(), type: 'accessory', unit: unit.trim() || 'pcs', barcode: autoBarcode, img: img || undefined, shortId: editing?.shortId || generateShortId(), publicQR: editing?.publicQR || false, createdAt: editing?.createdAt || today(), updatedAt: today() }; if (editing) updateAccessory(editing.id, data); else addAccStore(data); setIsOpen(false); };
  const handleDelete = (id: string) => { if (confirm('هل أنت متأكد؟')) deleteAccessory(id); };
  const handleImport = (rows: Record<string, string>[]) => { let count = 0; rows.forEach(r => { const c = r['الكود'] || r['code'] || ''; const n = r['الاسم'] || r['name'] || ''; if (!c.trim() || !n.trim()) return; addAccStore({ id: uid(), code: c.trim(), name: n.trim(), type: 'accessory', unit: (r['الوحدة'] || r['unit'] || 'pcs'), createdAt: today(), updatedAt: today() }); count++; }); alert(`تم استيراد ${count} اكسسوار بنجاح!`); };
  const exportAcc = () => { const rows = accessories.map(a => ({ الكود: a.code, الاسم: a.name, الوحدة: a.unit })); const csv = ['\uFEFF' + Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `accessories_${today()}.csv`; a.click(); URL.revokeObjectURL(url); };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]"><Search className="w-4 h-4 text-gray-400 flex-shrink-0" /><Input placeholder="البحث..." value={search} onChange={e => handleSearch(e.target.value)} className="flex-1 text-sm" />{search && <button onClick={() => handleSearch('')} className="p-1 hover:bg-gray-100 rounded flex-shrink-0"><X className="w-4 h-4 text-gray-400" /></button>}</div>
        <div className="flex gap-2 flex-shrink-0 items-center">
          <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`} title="جدول"><Rows3 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`} title="شبكة"><LayoutGrid className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode('thumbnails')} className={`p-1.5 rounded-md ${viewMode === 'thumbnails' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`} title="مصغرات"><LayoutList className="w-3.5 h-3.5" /></button>
          </div>
          <Button variant="outline" size="sm" onClick={exportAcc} className="text-xs hidden sm:flex gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> تصدير</Button>
          {canEdit(user?.role || '', 'accessories') && <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="text-xs gap-1"><Upload className="w-3.5 h-3.5" /> استيراد</Button>}
          {canEdit(user?.role || '', 'accessories') && <Button size="sm" onClick={openAdd} className="gap-1 bg-gradient-to-r from-purple-600 to-purple-700"><Plus className="w-4 h-4" /><span className="hidden sm:inline">إضافة</span></Button>}
        </div>
      </div>

      {/* ═══ TABLE VIEW ═══ */}
      {viewMode === 'table' && (
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr className="bg-gray-50/50"><th className="text-right text-xs font-bold p-3">#</th><th className="text-right text-xs font-bold p-3">الصورة</th><th className="text-right text-xs font-bold p-3">الكود</th><th className="text-right text-xs font-bold p-3">الاسم</th><th className="text-right text-xs font-bold p-3">الQR</th><th className="text-right text-xs font-bold p-3">الوحدة</th><th className="text-right text-xs font-bold p-3 w-28">إجراءات</th></tr></thead>
          <tbody>{filtered.length === 0 ? (<tr><td colSpan={7} className="text-center py-12 text-gray-400"><Layers className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm">لا توجد اكسسوارات</p></td></tr>) : (filtered.map((a, i) => (<tr key={a.id} className="border-t hover:bg-purple-50/30 transition-colors"><td className="p-3 text-xs text-gray-500">{i + 1}</td><td className="p-3">{a.img ? <img src={a.img} alt="" className="w-10 h-10 rounded-lg object-cover border cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all" onClick={e => { e.stopPropagation(); setPreviewImage(a.img!); setPreviewOpen(true); }} /> : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>}</td><td className="p-3 text-xs font-semibold font-mono text-purple-700">{a.code}</td><td className="p-3 text-xs font-medium">{a.name}</td><td className="p-3"><span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded">{a.barcode || '—'}</span></td><td className="p-3 text-xs">{a.unit}</td><td className="p-3"><div className="flex gap-1">{canEdit(user?.role || '', 'accessories') && <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-purple-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-purple-600" /></button>}<button onClick={() => { setBcCode(a.barcode || a.code); setBcName(a.name); setBcShortId(a.shortId || ''); setBcOpen(true); }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1" title="طباعة QR"><Barcode className="w-3.5 h-3.5 text-gray-600" /><span className="text-[10px] text-gray-600">QR</span></button><button onClick={() => { setStockCardAcc(a); setStockCardOpen(true); }} className="p-1.5 hover:bg-blue-100 rounded-lg" title="بطاقة مادة"><History className="w-3.5 h-3.5 text-blue-500" /></button>{canDelete('accessories') && <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}</div></td></tr>)))}</tbody>
        </table></div>
        <div className="p-3 border-t border-gray-100 text-[10px] text-gray-400 text-center">إجمالي: {filtered.length} اكسسوار</div>
      </div>
      )}

      {/* ═══ GRID VIEW ═══ */}
      {viewMode === 'grid' && (
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400"><Layers className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm">لا توجد اكسسوارات</p></div>
        ) : filtered.map(a => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-50 border flex-shrink-0 overflow-hidden">
                {a.img ? <img src={a.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-300" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{a.name}</p>
                <p className="text-xs font-mono text-purple-700">{a.code}</p>
                {a.barcode && <p className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded w-fit mt-0.5">{a.barcode}</p>}
                <p className="text-[10px] text-gray-400 mt-1">{a.unit}</p>
              </div>
            </div>
            <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-gray-50">
              {canEdit(user?.role || '', 'accessories') && <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-purple-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-purple-600" /></button>}
              <button onClick={() => { setBcCode(a.barcode || a.code); setBcName(a.name); setBcShortId(a.shortId || ''); setBcOpen(true); }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1"><Barcode className="w-3 h-3 text-gray-600" /><span className="text-[10px] text-gray-600">QR</span></button>
              {canDelete('accessories') && <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* ═══ THUMBNAILS VIEW ═══ */}
      {viewMode === 'thumbnails' && (
      <div className="hidden md:grid grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400"><Layers className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm">لا توجد اكسسوارات</p></div>
        ) : filtered.map(a => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
            <div className="aspect-square bg-gray-50 relative overflow-hidden">
              {a.img ? <img src={a.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-200" /></div>}
            </div>
            <div className="p-2.5">
              <p className="text-[11px] font-bold text-gray-800 truncate">{a.name}</p>
              <p className="text-[10px] font-mono text-purple-600">{a.code}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-400">{a.unit}</span>
                <div className="flex gap-0.5">
                  {canEdit(user?.role || '', 'accessories') && <button onClick={() => openEdit(a)} className="p-1 hover:bg-purple-100 rounded"><Pencil className="w-3 h-3 text-purple-600" /></button>}
                  {canDelete('accessories') && <button onClick={() => handleDelete(a.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400"><Layers className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm">لا توجد اكسسوارات</p></div>
        ) : filtered.map((a, i) => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-50 border flex-shrink-0 overflow-hidden">{a.img ? <img src={a.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-gray-300" /></div>}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{a.name}</p>
              <p className="text-xs font-mono text-purple-600 mt-0.5">{a.code}</p>
              {a.barcode && <p className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded w-fit mt-1">{a.barcode}</p>}
              <p className="text-xs text-gray-400 mt-1">{a.unit}</p>
              <div className="flex gap-1 mt-2">
                {canEdit(user?.role || '', 'accessories') && <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-purple-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-purple-600" /></button>}
                <button onClick={() => { setBcCode(a.barcode || a.code); setBcName(a.name); setBcShortId(a.shortId || ''); setBcOpen(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Barcode className="w-3.5 h-3.5 text-gray-500" /></button>
                {canDelete('accessories') && <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl"><DialogHeader><DialogTitle>{editing ? 'تعديل اكسسوار' : 'اكسسوار جديد'}</DialogTitle></DialogHeader><form className="space-y-3" onSubmit={e => { e.preventDefault(); handleSave(); }}>
        <div><label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">الكود *</label><Input value={code} onChange={e => setCode(e.target.value)} className="text-sm font-mono" required /></div>
        <div><label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">الاسم *</label><Input value={name} onChange={e => setName(e.target.value)} className="text-sm" required /></div>
        <div><label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">الوحدة</label><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="pcs / box / set" className="text-sm" /></div>
        <div className="flex items-center justify-between mb-1"><label className="text-xs font-semibold text-purple-700 flex items-center gap-1"><Barcode className="w-3 h-3" /> الQR</label><button type="button" onClick={() => setBarcode(generateBarcode('accessory', extractBarcodes(accessories), code))} className="text-[10px] text-purple-600 hover:text-purple-700 font-medium bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors" title="توليد QR جديد"><RefreshCw className="w-2.5 h-2.5" /> توليد QR</button></div>
        <Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder={editing ? 'لا يوجد QR مسجل' : 'AC2025000001 — أو توليد تلقائي'} className="text-sm font-mono bg-white" />
        {barcode && (<p className="text-[10px] text-purple-400 mt-1">QR قابل للتعديل — اضغط "توليد QR" لإعادة التوليد</p>)}
        {!barcode && (<p className="text-[10px] text-amber-500 mt-1">لم يُسجل QR — اضغط "توليد QR" لإنشاء واحد</p>)}
        <ImageUpload value={img} onChange={setImg} label="صورة الاكسسوار" folder="accessories" />
        <div className="flex justify-end gap-2 pt-2 border-t"><Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>إلغاء</Button><Button type="submit" size="sm" disabled={!code.trim() || !name.trim()} className="bg-gradient-to-r from-purple-600 to-purple-700">حفظ</Button></div>
      </form></DialogContent></Dialog>

      <QRCodeGenerator code={bcCode} name={bcName} open={bcOpen} onClose={() => setBcOpen(false)} shortId={bcShortId} />
      <ImagePreviewDialog src={previewImage} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} title="استيراد اكسسوارات" expectedColumns={['الكود','الاسم','الوحدة']} columnMapping={{ 'الكود': 'code', 'الاسم': 'name', 'الوحدة': 'unit' }} />

      {/* Stock Card */}
      {stockCardAcc && (
        <StockCard
          open={stockCardOpen}
          onClose={() => { setStockCardOpen(false); setStockCardAcc(null); }}
          itemId={stockCardAcc.id}
          itemType="accessory"
          itemName={stockCardAcc.name}
          itemCode={stockCardAcc.code}
        />
      )}
    </div>
  );
}
