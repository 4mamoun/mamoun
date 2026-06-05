import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore } from '@/store/dataStore';
import { usePermissionStore } from '@/store/permissionStore';
import { useAuthStore } from '@/store/authStore';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { Part, PartComponent } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Pencil, Trash2, X, ImageIcon, Cog, ChevronDown, ChevronUp, Barcode, Upload, FileSpreadsheet, Shield, LayoutGrid, Rows3, LayoutList, RefreshCw, History } from 'lucide-react';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import ImportDialog from '@/components/ImportDialog';
import QualityNoteDialog from '@/components/QualityNoteDialog';
import ImagePreviewDialog from '@/components/ImagePreviewDialog';
import StockCard from '@/components/StockCard';
import { generateBarcode, extractBarcodes } from '@/utils/barcode';
import { generateShortId } from '@/utils/shortLink';

type ViewMode = 'table' | 'grid' | 'thumbnails';

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function today() { return new Date().toISOString().split('T')[0]; }

export default function Parts() {
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { parts, addPart, updatePart, deletePart } = useDataStore();
  const { canEdit, canDelete } = usePermissionStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [expandedPart, setExpandedPart] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'part' | 'part-set'>('part');
  const [formRevit, setFormRevit] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formMin, setFormMin] = useState('');
  const [formSource, setFormSource] = useState<'local' | 'import'>('local');
  // Image upload with Firebase Storage (high quality)
  const img = useImageUpload({ folder: 'parts' });
  const formImg = img.image || '';
  const setFormImg = (v: string) => img.setImage(v || null);
  const isDragOver = img.isDragOver;

  const [formLength, setFormLength] = useState('');
  const [formWidth, setFormWidth] = useState('');
  const [formHeight, setFormHeight] = useState('');
  const [formComponents, setFormComponents] = useState<PartComponent[]>([]);
  const [formBarcode, setFormBarcode] = useState('');
  // Nesting (تداخل)
  const [formAllowNesting, setFormAllowNesting] = useState(false);
  const [formMaxNesting, setFormMaxNesting] = useState('');
  const [formNestingIncrease, setFormNestingIncrease] = useState('');

  // Barcode
  const [bcOpen, setBcOpen] = useState(false);
  const [bcCode, setBcCode] = useState('');
  const [bcName, setBcName] = useState('');
  const [bcShortId, setBcShortId] = useState('');

  // Import
  const [importOpen, setImportOpen] = useState(false);

  // Quality Note
  const [qualityOpen, setQualityOpen] = useState(false);
  const [qualityPart, setQualityPart] = useState<Part | null>(null);

  // Stock Card
  const [stockCardOpen, setStockCardOpen] = useState(false);
  const [stockCardPart, setStockCardPart] = useState<Part | null>(null);

  // Image preview
  const [previewImage, setPreviewImage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  let searchTimer: ReturnType<typeof setTimeout>;
  const handleSearch = (val: string) => { setSearch(val); clearTimeout(searchTimer); searchTimer = setTimeout(() => setDebouncedSearch(val.trim().toLowerCase()), 300); };

  const filteredParts = useMemo(() => {
    if (!debouncedSearch) return parts;
    return parts.filter(p => p.name.toLowerCase().includes(debouncedSearch) || p.revit.toLowerCase().includes(debouncedSearch) || (p.supplierCode && p.supplierCode.toLowerCase().includes(debouncedSearch)));
  }, [parts, debouncedSearch]);

  const openAdd = () => { setEditingPart(null); setFormName(''); setFormType('part'); setFormRevit(''); setFormSupplier(''); setFormUnit(''); setFormQty(''); setFormMin(''); setFormSource('local'); img.clearImage(); setFormLength(''); setFormWidth(''); setFormHeight(''); setFormComponents([]); setFormBarcode(generateBarcode('part', extractBarcodes(parts))); setFormAllowNesting(false); setFormMaxNesting(''); setFormNestingIncrease(''); setIsModalOpen(true); };
  const openEdit = (part: Part) => { setEditingPart(part); setFormName(part.name); setFormType(part.type); setFormRevit(part.revit); setFormSupplier(part.supplierCode || ''); setFormUnit(part.unit); setFormQty(String(part.qty || 0)); setFormMin(String(part.min || 0)); setFormSource(part.source); img.setImage(part.img || null); setFormLength(part.length || ''); setFormWidth(part.width || ''); setFormHeight(part.height || ''); setFormComponents(part.components ? [...part.components] : []); setFormBarcode(part.barcode || ''); setFormAllowNesting(part.allowNesting || false); setFormMaxNesting(part.maxNestingCount ? String(part.maxNestingCount) : ''); setFormNestingIncrease(part.nestingSizeIncrease ? String(part.nestingSizeIncrease) : ''); setIsModalOpen(true); };

  const handleSave = () => { if (!formRevit.trim() || !formName.trim()) return;
    // Auto-generate barcode if empty — format: MNA + random
    const autoBarcode = formBarcode.trim() || `MNA${Math.floor(Math.random()*1000000000)}`;
    const data: Part = { id: editingPart?.id || uid(), revit: formRevit.trim(), name: formName.trim(), type: formType, supplierCode: formSupplier.trim() || undefined, unit: formUnit.trim() || 'pcs', qty: Number(formQty) || 0, min: Number(formMin) || 0, source: formSource, img: formImg || undefined, length: formLength.trim() || undefined, width: formWidth.trim() || undefined, height: formHeight.trim() || undefined, components: formType === 'part-set' && formComponents.length > 0 ? formComponents : undefined, barcode: autoBarcode, shortId: editingPart?.shortId || generateShortId(), publicQR: editingPart?.publicQR || false, allowNesting: formAllowNesting, maxNestingCount: formAllowNesting ? Number(formMaxNesting) || undefined : undefined, nestingSizeIncrease: formAllowNesting ? Number(formNestingIncrease) || undefined : undefined, createdAt: editingPart?.createdAt || today(), updatedAt: today() };
    if (editingPart) updatePart(editingPart.id, data); else addPart(data); setIsModalOpen(false);
  };
  const handleDelete = (id: string) => { if (confirm('هل أنت متأكد من حذف هذا القطع؟')) deletePart(id); };
  const addComponent = () => setFormComponents([...formComponents, { id: uid(), code: '', name: '', qty: 1, type: '', itemType: 'part' }]);
  const updateComponent = (idx: number, field: keyof PartComponent, val: string | number) => { const updated = [...formComponents]; updated[idx] = { ...updated[idx], [field]: val }; setFormComponents(updated); };
  const removeComponent = (idx: number) => setFormComponents(formComponents.filter((_, i) => i !== idx));



  const exportXlsx = () => { const rows = parts.map(p => ({ Revit: p.revit, الاسم: p.name, النوع: p.type === 'part' ? 'قطعة' : 'مجموعة قطع', 'كود المورد': p.supplierCode || '', الوحدة: p.unit, الرصيد: p.qty, 'الحد الأدنى': p.min, المصدر: p.source === 'local' ? 'محلي' : 'مستورد', الطول: p.length || '', العرض: p.width || '', الارتفاع: p.height || '' })); const csv = ['\uFEFF' + Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `parts_${today()}.csv`; a.click(); URL.revokeObjectURL(url); };

  const handleImport = (rows: Record<string, string>[]) => {
    let count = 0;
    rows.forEach(row => {
      const revit = row['Revit'] || row['revit'] || row['REVIT'] || row['الكود'] || '';
      const name = row['الاسم'] || row['name'] || row['Name'] || '';
      if (!revit.trim() || !name.trim()) return;
      const data: Part = { id: uid(), revit: revit.trim(), name: name.trim(), type: 'part', supplierCode: (row['كود المورد'] || row['supplierCode'] || '') || undefined, unit: row['الوحدة'] || row['unit'] || 'pcs', qty: Number(row['الرصيد'] || row['qty'] || 0), min: Number(row['الحد الأدنى'] || row['min'] || 0), source: (row['المصدر'] || row['source'] || '') === 'استيراد' ? 'import' : 'local', length: (row['الطول'] || row['length'] || '') || undefined, width: (row['العرض'] || row['width'] || '') || undefined, height: (row['الارتفاع'] || row['height'] || '') || undefined, createdAt: today(), updatedAt: today() };
      addPart(data);
      count++;
    });
    alert(`تم استيراد ${count} قطع بنجاح!`);
  };

  return (
    <div className="space-y-4 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <Input placeholder={t('parts.searchBy')} value={search} onChange={e => handleSearch(e.target.value)} className="flex-1 text-sm" />
          {search && <button onClick={() => handleSearch('')} className="p-1 hover:bg-gray-100 rounded flex-shrink-0"><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
        <div className="flex gap-2 flex-shrink-0 items-center">
          {/* View mode toggle */}
          <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="جدول"><Rows3 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="شبكة"><LayoutGrid className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode('thumbnails')} className={`p-1.5 rounded-md ${viewMode === 'thumbnails' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} title="مصغرات"><LayoutList className="w-3.5 h-3.5" /></button>
          </div>
          <Button variant="outline" size="sm" onClick={exportXlsx} className="text-xs hidden sm:flex gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> تصدير</Button>
          {canEdit(user?.role || '', 'parts') && <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="text-xs gap-1"><Upload className="w-3.5 h-3.5" /> استيراد</Button>}
          {canEdit(user?.role || '', 'parts') && <Button size="sm" onClick={openAdd} className="gap-1 bg-gradient-to-r from-blue-600 to-blue-700"><Plus className="w-4 h-4" /><span className="hidden sm:inline">إضافة</span></Button>}
        </div>
      </div>

      {/* Desktop views based on viewMode */}
      {viewMode === 'table' && (
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50/50">
              <th className="text-right text-xs font-bold p-3 w-10">#</th>
              <th className="text-right text-xs font-bold p-3 w-16">الصورة</th>
              <th className="text-right text-xs font-bold p-3">Revit</th>
              <th className="text-right text-xs font-bold p-3">الاسم</th>
              <th className="text-right text-xs font-bold p-3">الQR</th>
              <th className="text-right text-xs font-bold p-3">الأبعاد</th>
              <th className="text-right text-xs font-bold p-3">الرصيد</th>
              <th className="text-right text-xs font-bold p-3">المصدر</th>
              <th className="text-right text-xs font-bold p-3 w-32">إجراءات</th>
            </tr></thead>
            <tbody>
              {filteredParts.length === 0 ? (<tr><td colSpan={9} className="text-center py-12 text-gray-400"><Cog className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm">لا توجد قطع</p></td></tr>) : (
                filteredParts.map((part, idx) => (
                  <tr key={part.id} className="border-t hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => part.type === 'part-set' && setExpandedPart(expandedPart === part.id ? null : part.id)}>
                    <td className="p-3 text-xs text-gray-500">{idx + 1}</td>
                    <td className="p-3">{part.img ? <img src={part.img} alt="" className="w-10 h-10 rounded-lg object-cover border cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all" onClick={e => { e.stopPropagation(); setPreviewImage(part.img!); setPreviewOpen(true); }} /> : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>}</td>
                    <td className="p-3 text-xs font-semibold font-mono text-blue-700">{part.revit}</td>
                    <td className="p-3 text-xs font-medium">{part.name}</td>
                    <td className="p-3"><span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded">{part.barcode || '—'}</span></td>
                    <td className="p-3 text-xs text-gray-500">{part.length || part.width || part.height ? `${part.length || '—'}×${part.width || '—'}×${part.height || '—'}` : '—'}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-xs font-bold ${(part.qty - (part.reservedQty || 0)) <= part.min && part.min > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                          {(part.qty - (part.reservedQty || 0))}
                        </span>
                        {(part.reservedQty || 0) > 0 && (
                          <span className="text-[9px] text-amber-500">
                            من {part.qty} (محجوز: {part.reservedQty})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${part.source === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{part.source === 'local' ? 'محلي' : 'مستورد'}</span>
                      {part.allowNesting && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full mr-1" title="يسمح بالتداخل">🔀 تداخل</span>}
                    </td>
                    <td className="p-3"><div className="flex gap-1">{canEdit(user?.role || '', 'parts') && <button onClick={e => { e.stopPropagation(); openEdit(part); }} className="p-1.5 hover:bg-blue-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-blue-600" /></button>}<button onClick={e => { e.stopPropagation(); setBcCode(part.barcode || part.revit); setBcName(part.name); setBcShortId(part.shortId || ''); setBcOpen(true); }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1" title="طباعة QR"><Barcode className="w-3.5 h-3.5 text-gray-600" /><span className="text-[10px] text-gray-600">QR</span></button><button onClick={e => { e.stopPropagation(); setStockCardPart(part); setStockCardOpen(true); }} className="p-1.5 hover:bg-blue-100 rounded-lg" title="بطاقة مادة"><History className="w-3.5 h-3.5 text-blue-500" /></button><button onClick={e => { e.stopPropagation(); setQualityPart(part); setQualityOpen(true); }} className="p-1.5 hover:bg-amber-100 rounded-lg" title="إرسال إلى الجودة"><Shield className="w-3.5 h-3.5 text-amber-600" /></button>{canDelete('parts') && <button onClick={e => { e.stopPropagation(); handleDelete(part.id); }} className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}</div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-100 text-[10px] text-gray-400 text-center">إجمالي: {filteredParts.length} قطع</div>
      </div>
      )}

      {/* ═══ GRID VIEW ═══ */}
      {viewMode === 'grid' && (
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredParts.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400"><Cog className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm">لا توجد قطع</p></div>
        ) : filteredParts.map(part => (
          <div key={part.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all" onClick={() => part.type === 'part-set' && setExpandedPart(expandedPart === part.id ? null : part.id)}>
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-50 border flex-shrink-0 overflow-hidden">
                {part.img ? <img src={part.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-300" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{part.name}</p>
                <p className="text-xs font-mono text-blue-700">{part.revit}</p>
                {part.barcode && <p className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded w-fit mt-0.5">{part.barcode}</p>}
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${part.source === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{part.source === 'local' ? 'محلي' : 'مستورد'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${part.type === 'part' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{part.type === 'part' ? 'قطعة' : 'مجموعة'}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[9px] text-gray-400">المتاح</p>
                <p className={`text-sm font-bold ${(part.qty - (part.reservedQty || 0)) <= part.min && part.min > 0 ? 'text-red-600' : 'text-gray-800'}`}>{(part.qty - (part.reservedQty || 0))}</p>
                {(part.reservedQty || 0) > 0 && <p className="text-[8px] text-amber-500">محجوز: {part.reservedQty}</p>}
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-[9px] text-gray-400">الحد الأدنى</p><p className="text-sm font-bold text-gray-800">{part.min}</p></div>
              <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-[9px] text-gray-400">الأبعاد</p><p className="text-xs font-bold text-gray-800">{part.length || part.width || part.height ? `${part.length || '—'}×${part.width || '—'}×${part.height || '—'}` : '—'}</p></div>
            </div>
            {part.type === 'part-set' && expandedPart === part.id && part.components && (
              <div className="mt-3 pt-3 border-t border-gray-100"><p className="text-[10px] font-bold text-amber-700 mb-1">المكونات:</p><div className="flex flex-wrap gap-1">{part.components.map(c => <span key={c.id} className="text-[9px] bg-white border border-amber-200 rounded px-1.5 py-0.5">{c.name} x{c.qty}</span>)}</div></div>
            )}
            <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-gray-50">
              {canEdit(user?.role || '', 'parts') && <button onClick={e => { e.stopPropagation(); openEdit(part); }} className="p-1.5 hover:bg-blue-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-blue-600" /></button>}
              <button onClick={e => { e.stopPropagation(); setBcCode(part.barcode || part.revit); setBcName(part.name); setBcShortId(part.shortId || ''); setBcOpen(true); }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1"><Barcode className="w-3 h-3 text-gray-600" /><span className="text-[10px] text-gray-600">QR</span></button>
              <button onClick={e => { e.stopPropagation(); setQualityPart(part); setQualityOpen(true); }} className="p-1.5 hover:bg-amber-100 rounded-lg"><Shield className="w-3.5 h-3.5 text-amber-600" /></button>
              {canDelete('parts') && <button onClick={e => { e.stopPropagation(); handleDelete(part.id); }} className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* ═══ THUMBNAILS VIEW ═══ */}
      {viewMode === 'thumbnails' && (
      <div className="hidden md:grid grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredParts.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400"><Cog className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm">لا توجد قطع</p></div>
        ) : filteredParts.map(part => (
          <div key={part.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
            <div className="aspect-square bg-gray-50 relative overflow-hidden">
              {part.img ? <img src={part.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-200" /></div>}
              <span className={`absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full ${part.source === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{part.source === 'local' ? 'محلي' : 'مستورد'}</span>
            </div>
            <div className="p-2.5">
              <p className="text-[11px] font-bold text-gray-800 truncate">{part.name}</p>
              <p className="text-[10px] font-mono text-blue-600">{part.revit}</p>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs font-bold ${(part.qty - (part.reservedQty || 0)) <= part.min && part.min > 0 ? 'text-red-600' : 'text-gray-700'}`}>{(part.qty - (part.reservedQty || 0))}</span>
                {(part.reservedQty || 0) > 0 && <span className="text-[9px] text-amber-500 mr-1">/ {part.qty} (محجوز {part.reservedQty})</span>}
                <div className="flex gap-0.5">
                  {canEdit(user?.role || '', 'parts') && <button onClick={() => openEdit(part)} className="p-1 hover:bg-blue-100 rounded"><Pencil className="w-3 h-3 text-blue-600" /></button>}
                  <button onClick={() => { setBcCode(part.barcode || part.revit); setBcName(part.name); setBcShortId(part.shortId || ''); setBcOpen(true); }} className="p-1 hover:bg-gray-100 rounded"><Barcode className="w-3 h-3 text-gray-500" /></button>
                  {canDelete('parts') && <button onClick={() => handleDelete(part.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {filteredParts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400"><Cog className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm">لا توجد قطع</p></div>
        ) : (
          filteredParts.map((part) => (
            <div key={part.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4" onClick={() => part.type === 'part-set' && setExpandedPart(expandedPart === part.id ? null : part.id)}>
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-xl bg-gray-50 border flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all" onClick={() => part.img && (setPreviewImage(part.img), setPreviewOpen(true))}>
                  {part.img ? <img src={part.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-300" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-gray-800 truncate">{part.name}</p>
                    {part.type === 'part-set' && (expandedPart === part.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
                  </div>
                  <p className="text-xs font-mono text-blue-700">{part.revit}</p>
                  {part.barcode && <p className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded w-fit mt-0.5">{part.barcode}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${part.type === 'part' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{part.type === 'part' ? 'قطعة' : 'مجموعة'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${part.source === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{part.source === 'local' ? 'محلي' : 'مستورد'}</span>
                  </div>
                </div>
              </div>
              {part.barcode && (
                <div className="mt-2 bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                  <p className="text-[10px] text-gray-500">الQR</p>
                  <p className="text-xs font-mono font-bold text-gray-800">{part.barcode}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[9px] text-gray-400">المتاح</p>
                <p className={`text-sm font-bold ${(part.qty - (part.reservedQty || 0)) <= part.min && part.min > 0 ? 'text-red-600' : 'text-gray-800'}`}>{(part.qty - (part.reservedQty || 0))}</p>
                {(part.reservedQty || 0) > 0 && <p className="text-[8px] text-amber-500">محجوز: {part.reservedQty}</p>}
              </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-[9px] text-gray-400">الحد الأدنى</p><p className="text-sm font-bold text-gray-800">{part.min}</p></div>
                <div className="bg-gray-50 rounded-lg p-2 text-center"><p className="text-[9px] text-gray-400">الأبعاد</p><p className="text-sm font-bold text-gray-800">{part.length || part.width || part.height ? `${part.length || '—'}×${part.width || '—'}×${part.height || '—'}` : '—'}</p></div>
              </div>
              {part.type === 'part-set' && expandedPart === part.id && part.components && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-amber-700 mb-2">مكونات المجموعة:</p>
                  <div className="flex flex-wrap gap-2">{part.components.map(c => (<span key={c.id} className="text-[10px] bg-white border border-amber-200 rounded-lg px-2 py-1">{c.name} ({c.code}) x{c.qty}</span>))}</div>
                </div>
              )}
              <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-gray-50">
                {canEdit(user?.role || '', 'parts') && <button onClick={(e) => { e.stopPropagation(); openEdit(part); }} className="p-2 hover:bg-blue-100 rounded-lg"><Pencil className="w-4 h-4 text-blue-600" /></button>}
                <button onClick={(e) => { e.stopPropagation(); setBcCode(part.barcode || part.revit); setBcName(part.name); setBcShortId(part.shortId || ''); setBcOpen(true); }} className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1" title="طباعة QR"><Barcode className="w-4 h-4 text-gray-600" /><span className="text-[10px] text-gray-600">QR</span></button>
                <button onClick={(e) => { e.stopPropagation(); setQualityPart(part); setQualityOpen(true); }} className="p-2 hover:bg-amber-100 rounded-lg" title="إرسال إلى الجودة"><Shield className="w-4 h-4 text-amber-600" /></button>
                {canDelete('parts') && <button onClick={(e) => { e.stopPropagation(); handleDelete(part.id); }} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto pb-8" dir="rtl" onPaste={img.handlePaste}>
          <DialogHeader><DialogTitle className="text-base">{editingPart ? 'تعديل قطعة' : 'إضافة قطعة جديدة'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <button onClick={() => setFormType('part')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${formType === 'part' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>قطعة فردية</button>
              <button onClick={() => setFormType('part-set')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${formType === 'part-set' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>مجموعة قطع</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">كود الريفت (Revit) *</label><Input value={formRevit} onChange={e => setFormRevit(e.target.value)} placeholder="مثال: WALL-001" className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">الاسم *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="اسم القطعة" className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">كود المورد</label><Input value={formSupplier} onChange={e => setFormSupplier(e.target.value)} className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">الوحدة</label><Input value={formUnit} onChange={e => setFormUnit(e.target.value)} className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">الرصيد</label><Input type="number" value={formQty} onChange={e => setFormQty(e.target.value)} className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">الحد الأدنى</label><Input type="number" value={formMin} onChange={e => setFormMin(e.target.value)} className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">الطول</label><Input value={formLength} onChange={e => setFormLength(e.target.value)} placeholder="mm" className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">العرض</label><Input value={formWidth} onChange={e => setFormWidth(e.target.value)} placeholder="mm" className="text-sm" /></div>
              <div><label className="text-xs font-semibold text-gray-600 block mb-1">الارتفاع</label><Input value={formHeight} onChange={e => setFormHeight(e.target.value)} placeholder="mm" className="text-sm" /></div>
            </div>
            <div><label className="text-xs font-semibold text-gray-600 block mb-1">المصدر</label><div className="flex gap-2"><button onClick={() => setFormSource('local')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${formSource === 'local' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>محلي</button><button onClick={() => setFormSource('import')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${formSource === 'import' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>مستورد</button></div></div>

            {/* Nesting (تداخل) */}
            <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/10">
              <p className="text-xs font-bold text-amber-700 mb-2">📦 خاصية التداخل (Nesting)</p>
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formAllowNesting} onChange={e => setFormAllowNesting(e.target.checked)} className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
                  <span className="text-xs font-medium">يسمح بتداخل القطع داخل بعضها (مثل الطاولات)</span>
                </label>
              </div>
              {formAllowNesting && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1">أقصى عدد للتداخل</label><Input value={formMaxNesting} onChange={e => setFormMaxNesting(e.target.value)} placeholder="مثال: 5" type="number" min={2} className="text-sm" /></div>
                  <div><label className="text-xs font-semibold text-gray-600 block mb-1">الزيادة في القياس لكل تداخل (سم)</label><Input value={formNestingIncrease} onChange={e => setFormNestingIncrease(e.target.value)} placeholder="مثال: 3" type="number" min={0} step={0.5} className="text-sm" /></div>
                </div>
              )}
            </div>

            {/* Image: drag-drop + click + paste */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">الصورة</label>
              {formImg ? (
                <div className="flex items-center gap-3">
                  <img src={formImg} alt="" className="w-20 h-20 rounded-xl object-cover border shadow-sm" />
                  <div className="flex flex-col gap-1">
                    {img.sizeInfo && <p className="text-[10px] text-green-600 font-medium">{img.sizeInfo}</p>}
                    <label className="cursor-pointer px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] transition-colors flex items-center gap-1 w-fit">
                      تغيير
                      <input type="file" accept="image/*" className="hidden" onChange={img.handleUpload} />
                    </label>
                    <button onClick={() => img.clearImage()} className="text-[10px] text-red-500 hover:text-red-700 text-right">حذف</button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={img.handleDragOver}
                  onDragLeave={img.handleDragLeave}
                  onDrop={img.handleDrop}
                  onClick={() => document.getElementById('part-img-input')?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${isDragOver ? 'border-blue-500 bg-blue-50/60 scale-[1.02]' : 'border-gray-300 bg-gray-50/60 hover:border-gray-400 hover:bg-gray-100/60'}`}
                >
                  <input id="part-img-input" type="file" accept="image/*" className="hidden" onChange={img.handleUpload} />
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDragOver ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <ImageIcon className={`w-5 h-5 transition-colors ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-xs transition-colors ${isDragOver ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      {isDragOver ? 'أفلت الصورة هنا' : 'اسحب صورة أو انقر'}
                    </p>
                    <p className="text-[10px] text-gray-400">PNG, JPG, GIF</p>
                  </div>
                </div>
              )}
            </div>
            {formType === 'part-set' && (
              <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
                <div className="flex items-center justify-between mb-3"><p className="text-xs font-bold text-amber-700">مكونات المجموعة</p><Button size="sm" variant="outline" onClick={addComponent} className="text-xs h-7"><Plus className="w-3 h-3" /> إضافة</Button></div>
                {formComponents.map((comp, idx) => (
                  <div key={comp.id} className="grid grid-cols-12 gap-2 mb-2 items-end">
                    <div className="col-span-3"><Input value={comp.code} onChange={e => updateComponent(idx, 'code', e.target.value)} placeholder="الكود" className="text-xs h-8" /></div>
                    <div className="col-span-3"><Input value={comp.name} onChange={e => updateComponent(idx, 'name', e.target.value)} placeholder="الاسم" className="text-xs h-8" /></div>
                    <div className="col-span-2"><Input type="number" value={comp.qty} onChange={e => updateComponent(idx, 'qty', Number(e.target.value))} className="text-xs h-8" /></div>
                    <div className="col-span-2"><select value={comp.itemType} onChange={e => updateComponent(idx, 'itemType', e.target.value as 'part' | 'accessory')} className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"><option value="part">قطعة</option><option value="accessory">اكسسوار</option></select></div>
                    <div className="col-span-2"><button onClick={() => removeComponent(idx)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button></div>
                  </div>
                ))}
              </div>
            )}
            {/* Barcode — LAST field */}
            <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/30">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-indigo-700 flex items-center gap-1"><Barcode className="w-3 h-3" /> الQR</label>
                <button
                  type="button"
                  onClick={() => setFormBarcode(generateBarcode('part', extractBarcodes(parts), formRevit, formLength, formWidth, formHeight))}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-100 hover:bg-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
                  title="توليد QR جديد"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> توليد QR
                </button>
              </div>
              <Input
                value={formBarcode}
                onChange={e => setFormBarcode(e.target.value)}
                placeholder={editingPart ? 'لا يوجد QR مسجل' : 'PR2025000001 — أو توليد تلقائي'}
                className="text-sm font-mono bg-white"
              />
              {formBarcode && (
                <p className="text-[10px] text-indigo-400 mt-1">QR قابل للتعديل — اضغط "توليد QR" لإعادة التوليد</p>
              )}
              {!formBarcode && (
                <p className="text-[10px] text-amber-500 mt-1">لم يُسجل QR — اضغط "توليد QR" لإنشاء واحد</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>إلغاء</Button><Button size="sm" onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-blue-700">{editingPart ? 'حفظ' : 'إضافة'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import */}
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} title="القطع" expectedColumns={['Revit', 'الاسم', 'كود المورد', 'الوحدة', 'الرصيد', 'الحد الأدنى', 'المصدر', 'الطول', 'العرض', 'الارتفاع']} columnMapping={{ Revit: 'Revit', revit: 'Revit', الاسم: 'الاسم', name: 'الاسم', 'كود المورد': 'كود المورد', supplierCode: 'كود المورد', الوحدة: 'الوحدة', unit: 'الوحدة', الرصيد: 'الرصيد', qty: 'الرصيد', 'الحد الأدنى': 'الحد الأدنى', min: 'الحد الأدنى', المصدر: 'المصدر', source: 'المصدر', الطول: 'الطول', length: 'الطول', العرض: 'العرض', width: 'العرض', الارتفاع: 'الارتفاع', height: 'الارتفاع' }} onImport={handleImport} />

      <QRCodeGenerator open={bcOpen} onClose={() => setBcOpen(false)} code={bcCode} name={bcName} shortId={bcShortId} />

      {/* Quality Note */}
      {qualityPart && (
        <QualityNoteDialog
          open={qualityOpen}
          onClose={() => { setQualityOpen(false); setQualityPart(null); }}
          itemType="part"
          itemName={qualityPart.name}
          itemCode={qualityPart.revit}
        />
      )}

      {/* Image Preview */}
      <ImagePreviewDialog
        src={previewImage}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />

      {/* Stock Card */}
      {stockCardPart && (
        <StockCard
          open={stockCardOpen}
          onClose={() => { setStockCardOpen(false); setStockCardPart(null); }}
          itemId={stockCardPart.id}
          itemType="part"
          itemName={stockCardPart.name}
          itemCode={stockCardPart.revit}
          currentQty={stockCardPart.qty}
        />
      )}
    </div>
  );
}