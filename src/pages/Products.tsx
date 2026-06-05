import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { usePermissionStore } from '@/store/permissionStore';
import { useAuthStore } from '@/store/authStore';
import type { Product, ProductComponent } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Pencil, Trash2, X, Box, ImageIcon, Barcode, Tag, ChevronDown, ChevronUp, Cog, Layers, Square, LayoutGrid, Rows3, LayoutList, RefreshCw } from 'lucide-react';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import ImageUpload from '@/components/ImageUpload';
import ImagePreviewDialog from '@/components/ImagePreviewDialog';
import { generateBarcode, extractBarcodes } from '@/utils/barcode';
import { generateShortId } from '@/utils/shortLink';

type ViewMode = 'table' | 'grid' | 'thumbnails';

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function today() { return new Date().toISOString().split('T')[0]; }

export default function Products() {
  const { user } = useAuthStore();
  const { t: _t, i18n } = useTranslation();
  const { products, parts, accessories, tops, addProduct, updateProduct, deleteProduct } = useDataStore();
  const { canEdit, canDelete } = usePermissionStore();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [l, setL] = useState('');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [weight, setWeight] = useState('');
  const [img, setImg] = useState('');
  const [comps, setComps] = useState<ProductComponent[]>([]);
  const [formBarcode, setFormBarcode] = useState('');

  // Barcode
  const [bcOpen, setBcOpen] = useState(false);
  const [bcCode, setBcCode] = useState('');
  const [bcName, setBcName] = useState('');
  const [bcShortId, setBcShortId] = useState('');

  // Image preview
  const [previewImage, setPreviewImage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Component search states
  const [partSearch, setPartSearch] = useState('');
  const [accSearch, setAccSearch] = useState('');
  const [topSearch, setTopSearch] = useState('');
  const [expandedProd, setExpandedProd] = useState<string | null>(null);

  let timer: ReturnType<typeof setTimeout>;
  const handleSearch = (v: string) => { setSearch(v); clearTimeout(timer); timer = setTimeout(() => setDebounced(v.trim().toLowerCase()), 300); };
  const filtered = useMemo(() => { if (!debounced) return products; return products.filter(p => p.name.toLowerCase().includes(debounced) || p.code.toLowerCase().includes(debounced)); }, [products, debounced]);
  const openAdd = () => { setEditing(null); setCode(''); setName(''); setDesc(''); setL(''); setW(''); setH(''); setWeight(''); setImg(''); setComps([]); setPartSearch(''); setAccSearch(''); setTopSearch(''); setFormBarcode(generateBarcode('product', extractBarcodes(products))); setIsOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setCode(p.code); setName(p.name); setDesc(p.desc || ''); setL(p.dim.l); setW(p.dim.w); setH(p.dim.h); setWeight(p.weight || ''); setImg(p.img || ''); setComps(p.components ? [...p.components] : []); setFormBarcode(p.barcode || ''); setIsOpen(true); };
  const handleSave = () => { if (!code.trim() || !name.trim()) return; const data: Product = { id: editing?.id || uid(), code: code.trim(), name: name.trim(), desc: desc.trim() || undefined, dim: { l: l || '', w: w || '', h: h || '' }, weight: weight.trim() || undefined, img: img || undefined, components: comps, barcode: formBarcode.trim() || undefined, shortId: editing?.shortId || generateShortId(), publicQR: editing?.publicQR || false, createdAt: editing?.createdAt || today(), updatedAt: today() }; if (editing) updateProduct(editing.id, data); else addProduct(data); setIsOpen(false); };

  const addComp = (_id: string, cCode: string, cName: string, compType: ProductComponent['compType']) => { setComps([...comps, { id: uid(), code: cCode, name: cName, qty: 1, compType }]); };
  const updateComp = (i: number, f: keyof ProductComponent, v: string | number) => { const u = [...comps]; u[i] = { ...u[i], [f]: v }; setComps(u); };
  const delComp = (i: number) => setComps(comps.filter((_, idx) => idx !== i));

  const partComps = comps.filter(c => c.compType === 'part' || c.compType === 'part-set');
  const accComps = comps.filter(c => c.compType === 'accessory' || c.compType === 'acc-set');
  const topComps = comps.filter(c => c.compType === 'top');

  const filteredParts = partSearch ? parts.filter(p => p.name.toLowerCase().includes(partSearch.toLowerCase()) || p.revit.toLowerCase().includes(partSearch.toLowerCase())) : parts;
  const filteredAccs = accSearch ? accessories.filter(a => a.name.toLowerCase().includes(accSearch.toLowerCase()) || a.code.toLowerCase().includes(accSearch.toLowerCase())) : accessories;
  const filteredTops = topSearch ? tops.filter(t => t.name.toLowerCase().includes(topSearch.toLowerCase()) || t.code.toLowerCase().includes(topSearch.toLowerCase())) : tops;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]"><Search className="w-4 h-4 text-gray-400" /><Input placeholder="البحث..." value={search} onChange={(e) => handleSearch(e.target.value)} className="flex-1 text-sm" />{search && <button onClick={() => handleSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>}</div>
        <div className="flex gap-2 flex-shrink-0 items-center">
          <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`} title="جدول"><Rows3 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`} title="شبكة"><LayoutGrid className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode('thumbnails')} className={`p-1.5 rounded-md ${viewMode === 'thumbnails' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`} title="مصغرات"><LayoutList className="w-3.5 h-3.5" /></button>
          </div>
          {canEdit(user?.role || '', 'prods') && <Button size="sm" onClick={openAdd} className="gap-1 bg-gradient-to-r from-green-600 to-green-700"><Plus className="w-4 h-4" /> إضافة منتج</Button>}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-gray-50/50"><TableHead className="text-right text-xs w-8"></TableHead><TableHead className="text-right text-xs">#</TableHead><TableHead className="text-right text-xs">الصورة</TableHead><TableHead className="text-right text-xs">الكود</TableHead><TableHead className="text-right text-xs">الاسم</TableHead><TableHead className="text-right text-xs">الأبعاد</TableHead><TableHead className="text-right text-xs">الوزن</TableHead><TableHead className="text-right text-xs">المكونات</TableHead><TableHead className="text-right text-xs">الQR</TableHead><TableHead className="text-right text-xs w-32">إجراءات</TableHead></TableRow></TableHeader>
        <TableBody>{filtered.length === 0 ? (<TableRow><TableCell colSpan={10} className="text-center py-12 text-gray-400"><Box className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm">لا توجد منتجات مسجلة</p></TableCell></TableRow>) : (filtered.map((p, i) => (
          <>
            <TableRow key={p.id} className="hover:bg-green-50/30 transition-colors cursor-pointer" onClick={() => setExpandedProd(expandedProd === p.id ? null : p.id)}>
              <TableCell className="p-2">{expandedProd === p.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}</TableCell>
              <TableCell className="text-xs text-gray-500">{i + 1}</TableCell>
              <TableCell>{p.img ? <img src={p.img} alt="" className="w-10 h-10 rounded-lg object-cover border cursor-pointer hover:ring-2 hover:ring-green-400 transition-all" onClick={e => { e.stopPropagation(); setPreviewImage(p.img!); setPreviewOpen(true); }} /> : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>}</TableCell>
              <TableCell className="text-xs font-semibold font-mono text-green-700">{p.code}</TableCell>
              <TableCell className="text-xs font-medium">{p.name}</TableCell>
              <TableCell className="text-xs">{p.dim.l}×{p.dim.w}×{p.dim.h}</TableCell>
              <TableCell className="text-xs">{p.weight || '—'}</TableCell>
              <TableCell className="text-xs">
                <span className="bg-gray-100 px-2 py-0.5 rounded-full text-[10px]">{p.components.length} مكون</span>
              </TableCell>
              <TableCell><span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded">{p.barcode || '—'}</span></TableCell>
              <TableCell onClick={e => e.stopPropagation()}><div className="flex items-center gap-1">{canEdit(user?.role || '', 'prods') && <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-green-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-green-600" /></button>}<button onClick={() => { setBcCode(p.barcode || p.code); setBcName(p.name); setBcShortId(p.shortId || ''); setBcOpen(true); }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1" title="طباعة QR"><Barcode className="w-3.5 h-3.5 text-gray-600" /><span className="text-[10px] text-gray-600">QR</span></button>{canDelete('prods') && <button onClick={() => { if (confirm('هل أنت متأكد؟')) deleteProduct(p.id); }} className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}</div></TableCell>
            </TableRow>
            {expandedProd === p.id && p.components.length > 0 && (
              <TableRow className="bg-gray-50/50">
                <TableCell colSpan={10} className="p-3">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Parts */}
                    <div>
                      <p className="text-[10px] font-bold text-blue-700 mb-2 flex items-center gap-1"><Cog className="w-3 h-3" /> القطع ({p.components.filter(c => c.compType === 'part' || c.compType === 'part-set').length})</p>
                      {p.components.filter(c => c.compType === 'part' || c.compType === 'part-set').map(c => (
                        <div key={c.id} className="flex justify-between text-xs bg-white rounded p-1.5 mb-1 border"><span>{c.name}</span><span className="text-gray-500 font-mono">{c.code} ×{c.qty}</span></div>
                      ))}
                      {p.components.filter(c => c.compType === 'part' || c.compType === 'part-set').length === 0 && <p className="text-[10px] text-gray-400">لا يوجد</p>}
                    </div>
                    {/* Accessories */}
                    <div>
                      <p className="text-[10px] font-bold text-purple-700 mb-2 flex items-center gap-1"><Layers className="w-3 h-3" /> الاكسسوارات ({p.components.filter(c => c.compType === 'accessory' || c.compType === 'acc-set').length})</p>
                      {p.components.filter(c => c.compType === 'accessory' || c.compType === 'acc-set').map(c => (
                        <div key={c.id} className="flex justify-between text-xs bg-white rounded p-1.5 mb-1 border"><span>{c.name}</span><span className="text-gray-500 font-mono">{c.code} ×{c.qty}</span></div>
                      ))}
                      {p.components.filter(c => c.compType === 'accessory' || c.compType === 'acc-set').length === 0 && <p className="text-[10px] text-gray-400">لا يوجد</p>}
                    </div>
                    {/* Tops */}
                    <div>
                      <p className="text-[10px] font-bold text-teal-700 mb-2 flex items-center gap-1"><Square className="w-3 h-3" /> التوبات ({p.components.filter(c => c.compType === 'top').length})</p>
                      {p.components.filter(c => c.compType === 'top').map(c => (
                        <div key={c.id} className="flex justify-between text-xs bg-white rounded p-1.5 mb-1 border"><span>{c.name}</span><span className="text-gray-500 font-mono">{c.code} ×{c.qty}</span></div>
                      ))}
                      {p.components.filter(c => c.compType === 'top').length === 0 && <p className="text-[10px] text-gray-400">لا يوجد</p>}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </>
        )))}</TableBody></Table></div>
        <div className="p-3 border-t border-gray-100 text-[10px] text-gray-400 text-center">إجمالي: {filtered.length} منتج</div>
      </div>

      {/* ═══ GRID VIEW ═══ */}
      {viewMode === 'grid' && (
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400"><Box className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm">لا توجد منتجات</p></div>
        ) : filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-50 border flex-shrink-0 overflow-hidden">
                {p.img ? <img src={p.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-300" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{p.name}</p>
                <p className="text-xs font-mono text-green-700">{p.code}</p>
                {p.barcode && <p className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded w-fit mt-0.5">{p.barcode}</p>}
                <p className="text-[10px] text-gray-400 mt-1">{p.components?.length || 0} مكون</p>
              </div>
            </div>
            <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-gray-50">
              {canEdit(user?.role || '', 'products') && <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-green-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-green-600" /></button>}
              <button onClick={() => { setBcCode(p.barcode || p.code); setBcName(p.name); setBcShortId(p.shortId || ''); setBcOpen(true); }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1"><Barcode className="w-3 h-3 text-gray-600" /><span className="text-[10px] text-gray-600">QR</span></button>
              {canDelete('prods') && <button onClick={() => { if (confirm('هل أنت متأكد؟')) deleteProduct(p.id); }} className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* ═══ THUMBNAILS VIEW ═══ */}
      {viewMode === 'thumbnails' && (
      <div className="hidden md:grid grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400"><Box className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm">لا توجد منتجات</p></div>
        ) : filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
            <div className="aspect-square bg-gray-50 relative overflow-hidden">
              {p.img ? <img src={p.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-200" /></div>}
            </div>
            <div className="p-2.5">
              <p className="text-[11px] font-bold text-gray-800 truncate">{p.name}</p>
              <p className="text-[10px] font-mono text-green-600">{p.code}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-400">{p.components?.length || 0} مكون</span>
                <div className="flex gap-0.5">
                  {canEdit(user?.role || '', 'products') && <button onClick={() => openEdit(p)} className="p-1 hover:bg-green-100 rounded"><Pencil className="w-3 h-3 text-green-600" /></button>}
                  {canDelete('prods') && <button onClick={() => { if (confirm('هل أنت متأكد؟')) deleteProduct(p.id); }} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            <Box className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm">لا توجد منتجات مسجلة</p>
          </div>
        ) : (
          filtered.map((p, i) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" onClick={() => setExpandedProd(expandedProd === p.id ? null : p.id)}>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {p.img ? <img src={p.img} alt="" className="w-14 h-14 rounded-lg object-cover border cursor-pointer hover:ring-2 hover:ring-green-400 transition-all" onClick={() => (setPreviewImage(p.img!), setPreviewOpen(true))} /> : <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-300" /></div>}
                    <div>
                      <p className="text-sm font-bold text-gray-800">{p.name}</p>
                      <p className="text-xs font-mono text-green-700">{p.code}</p>
                      {p.barcode && <p className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded w-fit mt-0.5">{p.barcode}</p>}
                      <span className="inline-block mt-1 bg-gray-100 px-2 py-0.5 rounded-full text-[10px]">{p.components.length} مكون</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {expandedProd === p.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>
                {p.barcode && (
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500">الQR</p>
                    <p className="text-xs font-mono font-bold text-gray-800">{p.barcode}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center border-t pt-3">
                  <div><p className="text-[10px] text-gray-400">الأبعاد</p><p className="text-xs font-bold">{p.dim.l}×{p.dim.w}×{p.dim.h}</p></div>
                  <div><p className="text-[10px] text-gray-400">الوزن</p><p className="text-xs font-bold">{p.weight || '—'}</p></div>
                  <div><p className="text-[10px] text-gray-400">#</p><p className="text-xs font-bold text-gray-500">{i + 1}</p></div>
                </div>
                {/* Expanded: show components */}
                {expandedProd === p.id && p.components.length > 0 && (
                  <div className="border-t pt-3 space-y-3">
                    {/* Parts */}
                    {p.components.filter(c => c.compType === 'part' || c.compType === 'part-set').length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-blue-700 mb-1.5 flex items-center gap-1"><Cog className="w-3 h-3" /> القطع</p>
                        <div className="space-y-1">
                          {p.components.filter(c => c.compType === 'part' || c.compType === 'part-set').map(c => (
                            <div key={c.id} className="flex justify-between text-xs bg-blue-50/50 rounded-lg px-3 py-2"><span className="font-medium">{c.name}</span><span className="text-gray-500 font-mono">{c.code} ×{c.qty}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Accessories */}
                    {p.components.filter(c => c.compType === 'accessory' || c.compType === 'acc-set').length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-purple-700 mb-1.5 flex items-center gap-1"><Layers className="w-3 h-3" /> الاكسسوارات</p>
                        <div className="space-y-1">
                          {p.components.filter(c => c.compType === 'accessory' || c.compType === 'acc-set').map(c => (
                            <div key={c.id} className="flex justify-between text-xs bg-purple-50/50 rounded-lg px-3 py-2"><span className="font-medium">{c.name}</span><span className="text-gray-500 font-mono">{c.code} ×{c.qty}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Tops */}
                    {p.components.filter(c => c.compType === 'top').length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-teal-700 mb-1.5 flex items-center gap-1"><Square className="w-3 h-3" /> التوبات</p>
                        <div className="space-y-1">
                          {p.components.filter(c => c.compType === 'top').map(c => (
                            <div key={c.id} className="flex justify-between text-xs bg-teal-50/50 rounded-lg px-3 py-2"><span className="font-medium">{c.name}</span><span className="text-gray-500 font-mono">{c.code} ×{c.qty}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Action buttons */}
                <div className="flex justify-end gap-1 pt-2 border-t" onClick={e => e.stopPropagation()}>
                  {canEdit(user?.role || '', 'prods') && <button onClick={() => openEdit(p)} className="p-2 hover:bg-green-100 rounded-lg"><Pencil className="w-4 h-4 text-green-600" /></button>}
                  <button onClick={() => { setBcCode(p.barcode || p.code); setBcName(p.name); setBcShortId(p.shortId || ''); setBcOpen(true); }} className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1" title="طباعة QR"><Barcode className="w-4 h-4 text-gray-600" /><span className="text-[10px] text-gray-600">QR</span></button>
                  {canDelete('prods') && <button onClick={() => { if (confirm('هل أنت متأكد؟')) deleteProduct(p.id); }} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>}
                </div>
              </div>
            </div>
          ))
        )}
        <div className="text-[10px] text-gray-400 text-center py-2">إجمالي: {filtered.length} منتج</div>
      </div>

      {/* Product Dialog with separated BOM sections */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto pb-8" dir="rtl"><DialogHeader><DialogTitle className="text-base">{editing ? 'تعديل منتج' : 'إضافة منتج BOM'}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Basic Info */}
          <div className="border border-green-200 rounded-xl p-3 bg-green-50/10">
            <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> معلومات المنتج الأساسية</p>
            <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-600 block mb-1">الكود *</label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PR-001" className="text-sm" /></div><div><label className="text-xs font-semibold text-gray-600 block mb-1">الاسم *</label><Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm" /></div></div>
            <div className="mt-2"><label className="text-xs font-semibold text-gray-600 block mb-1">الوصف</label><Input value={desc} onChange={(e) => setDesc(e.target.value)} className="text-sm" /></div>
            <div className="grid grid-cols-4 gap-2 mt-2"><div><label className="text-xs font-semibold text-gray-600 block mb-1">الطول</label><Input value={l} onChange={(e) => setL(e.target.value)} placeholder="L" className="text-sm" /></div><div><label className="text-xs font-semibold text-gray-600 block mb-1">العرض</label><Input value={w} onChange={(e) => setW(e.target.value)} placeholder="W" className="text-sm" /></div><div><label className="text-xs font-semibold text-gray-600 block mb-1">الارتفاع</label><Input value={h} onChange={(e) => setH(e.target.value)} placeholder="H" className="text-sm" /></div><div><label className="text-xs font-semibold text-gray-600 block mb-1">الوزن</label><Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="kg" className="text-sm" /></div></div>
            <div className="mt-2">
              <ImageUpload value={img} onChange={setImg} label="صورة المنتج" />
            </div>
          </div>

          {/* Parts Section */}
          <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-blue-700">🔷 القطع ({partComps.length})</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <Input value={partSearch} onChange={e => setPartSearch(e.target.value)} placeholder="بحث بالكود أو اسم القطعة..." className="text-xs h-8" />
              {partSearch && <button onClick={() => setPartSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-3 h-3 text-gray-400" /></button>}
            </div>
            {partSearch && (
              <div className="max-h-28 overflow-y-auto border rounded-lg mb-2 bg-white">
                {filteredParts.length === 0 ? <p className="text-[10px] text-gray-400 text-center py-2">لا توجد نتائج</p> :
                  filteredParts.slice(0, 8).map(p => (
                    <button key={p.id} onClick={() => { addComp(p.id, p.revit, p.name, p.type === 'part-set' ? 'part-set' : 'part'); setPartSearch(''); }} className="w-full text-right px-2 py-1.5 text-xs hover:bg-blue-50 border-b last:border-0 flex justify-between">
                      <span>{p.name}</span><span className="text-gray-400 font-mono text-[10px]">{p.revit}</span>
                    </button>
                  ))}
              </div>
            )}
            {partComps.length > 0 && (
              <div className="space-y-1">
                {partComps.map((c) => {
                  const globalIdx = comps.indexOf(c);
                  return (
                    <div key={c.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border">
                      <span className="text-xs flex-1">{c.name} <span className="text-gray-400 font-mono text-[10px]">({c.code})</span></span>
                      <Input type="number" value={c.qty} onChange={e => updateComp(globalIdx, 'qty', Number(e.target.value))} className="w-16 h-7 text-xs text-center" />
                      <button onClick={() => delComp(globalIdx)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3 h-3 text-red-500" /></button>
                    </div>
                  );
                })}
              </div>
            )}
            {partComps.length === 0 && !partSearch && <p className="text-[10px] text-gray-400 text-center py-1">لا توجد قطع مضافة</p>}
          </div>

          {/* Accessories Section */}
          <div className="border border-purple-200 rounded-xl p-3 bg-purple-50/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-purple-700">🟣 الاكسسوارات ({accComps.length})</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <Input value={accSearch} onChange={e => setAccSearch(e.target.value)} placeholder="بحث بالكود أو اسم الاكسسوار..." className="text-xs h-8" />
              {accSearch && <button onClick={() => setAccSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-3 h-3 text-gray-400" /></button>}
            </div>
            {accSearch && (
              <div className="max-h-28 overflow-y-auto border rounded-lg mb-2 bg-white">
                {filteredAccs.length === 0 ? <p className="text-[10px] text-gray-400 text-center py-2">لا توجد نتائج</p> :
                  filteredAccs.slice(0, 8).map(a => (
                    <button key={a.id} onClick={() => { addComp(a.id, a.code, a.name, a.type === 'acc-set' ? 'acc-set' : 'accessory'); setAccSearch(''); }} className="w-full text-right px-2 py-1.5 text-xs hover:bg-purple-50 border-b last:border-0 flex justify-between">
                      <span>{a.name}</span><span className="text-gray-400 font-mono text-[10px]">{a.code}</span>
                    </button>
                  ))}
              </div>
            )}
            {accComps.length > 0 && (
              <div className="space-y-1">
                {accComps.map((c) => {
                  const globalIdx = comps.indexOf(c);
                  return (
                    <div key={c.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border">
                      <span className="text-xs flex-1">{c.name} <span className="text-gray-400 font-mono text-[10px]">({c.code})</span></span>
                      <Input type="number" value={c.qty} onChange={e => updateComp(globalIdx, 'qty', Number(e.target.value))} className="w-16 h-7 text-xs text-center" />
                      <button onClick={() => delComp(globalIdx)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3 h-3 text-red-500" /></button>
                    </div>
                  );
                })}
              </div>
            )}
            {accComps.length === 0 && !accSearch && <p className="text-[10px] text-gray-400 text-center py-1">لا توجد اكسسوارات مضافة</p>}
          </div>

          {/* Tops Section */}
          <div className="border border-teal-200 rounded-xl p-3 bg-teal-50/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-teal-700">🟢 التوبات ({topComps.length})</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <Input value={topSearch} onChange={e => setTopSearch(e.target.value)} placeholder="بحث بالكود أو اسم التوب..." className="text-xs h-8" />
              {topSearch && <button onClick={() => setTopSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-3 h-3 text-gray-400" /></button>}
            </div>
            {topSearch && (
              <div className="max-h-28 overflow-y-auto border rounded-lg mb-2 bg-white">
                {filteredTops.length === 0 ? <p className="text-[10px] text-gray-400 text-center py-2">لا توجد نتائج</p> :
                  filteredTops.slice(0, 8).map(t => (
                    <button key={t.id} onClick={() => { addComp(t.id, t.code, t.name, 'top'); setTopSearch(''); }} className="w-full text-right px-2 py-1.5 text-xs hover:bg-teal-50 border-b last:border-0 flex justify-between">
                      <span>{t.name}</span><span className="text-gray-400 font-mono text-[10px]">{t.code}</span>
                    </button>
                  ))}
              </div>
            )}
            {topComps.length > 0 && (
              <div className="space-y-1">
                {topComps.map((c) => {
                  const globalIdx = comps.indexOf(c);
                  return (
                    <div key={c.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border">
                      <span className="text-xs flex-1">{c.name} <span className="text-gray-400 font-mono text-[10px]">({c.code})</span></span>
                      <Input type="number" value={c.qty} onChange={e => updateComp(globalIdx, 'qty', Number(e.target.value))} className="w-16 h-7 text-xs text-center" />
                      <button onClick={() => delComp(globalIdx)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3 h-3 text-red-500" /></button>
                    </div>
                  );
                })}
              </div>
            )}
            {topComps.length === 0 && !topSearch && <p className="text-[10px] text-gray-400 text-center py-1">لا توجد توبات مضافة</p>}
          </div>

          {/* Barcode — LAST field */}
          <div className="border border-green-100 rounded-xl p-4 bg-green-50/30">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-green-700 flex items-center gap-1"><Barcode className="w-3 h-3" /> الQR</label>
              <button type="button" onClick={() => setFormBarcode(generateBarcode('product', extractBarcodes(products), code, l, w, h))} className="text-[10px] text-green-600 hover:text-green-700 font-medium bg-green-100 hover:bg-green-200 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors" title="توليد QR جديد"><RefreshCw className="w-2.5 h-2.5" /> توليد QR</button>
            </div>
            <Input value={formBarcode} onChange={e => setFormBarcode(e.target.value)} placeholder={editing ? 'لا يوجد QR مسجل' : 'PD2025000001 — أو توليد تلقائي'} className="text-sm font-mono bg-white" />
            {formBarcode && (
              <p className="text-[10px] text-green-400 mt-1">QR قابل للتعديل — اضغط "توليد QR" لإعادة التوليد</p>
            )}
            {!formBarcode && (
              <p className="text-[10px] text-amber-500 mt-1">لم يُسجل QR — اضغط "توليد QR" لإنشاء واحد</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>إلغاء</Button><Button size="sm" onClick={handleSave} className="bg-gradient-to-r from-green-600 to-green-700">{editing ? 'حفظ' : 'إضافة'}</Button></div>
        </div>
      </DialogContent></Dialog>

      <QRCodeGenerator open={bcOpen} onClose={() => setBcOpen(false)} code={bcCode} name={bcName} shortId={bcShortId} />

      {/* Image Preview */}
      <ImagePreviewDialog src={previewImage} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}
