import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { usePermissionStore } from '@/store/permissionStore';
import { useAuthStore } from '@/store/authStore';
import type { Project, ProjectBuilding, ProjectFloor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Pencil, Trash2, X, Building2, ChevronDown } from 'lucide-react';

function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function today() { return new Date().toISOString().split('T')[0]; }

export default function Projects() {
  const { user } = useAuthStore();
  const { t: _t, i18n } = useTranslation();
  const { projects, addProject, updateProject, deleteProject } = useDataStore();
  const { canEdit, canDelete } = usePermissionStore();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [client, setClient] = useState('');
  const [buildings, setBuildings] = useState<ProjectBuilding[]>([]);

  let timer: ReturnType<typeof setTimeout>;
  const handleSearch = (v: string) => { setSearch(v); clearTimeout(timer); timer = setTimeout(() => setDebounced(v.trim().toLowerCase()), 300); };
  const filtered = useMemo(() => { if (!debounced) return projects; return projects.filter(p => p.name.toLowerCase().includes(debounced) || (p.code && p.code.toLowerCase().includes(debounced))); }, [projects, debounced]);
  const openAdd = () => { setEditing(null); setName(''); setCode(''); setClient(''); setBuildings([]); setIsOpen(true); };
  const openEdit = (p: Project) => { setEditing(p); setName(p.name); setCode(p.code || ''); setClient(p.client || ''); setBuildings(p.buildings ? JSON.parse(JSON.stringify(p.buildings)) : []); setIsOpen(true); };
  const addBuilding = () => setBuildings([...buildings, { id: uid(), name: '', floors: [] }]);
  const updateBuilding = (i: number, name: string) => { const u = [...buildings]; u[i] = { ...u[i], name }; setBuildings(u); };
  const delBuilding = (i: number) => setBuildings(buildings.filter((_, idx) => idx !== i));
  const addFloor = (bi: number) => { const u = [...buildings]; u[bi] = { ...u[bi], floors: [...u[bi].floors, { name: '', source: 'local' as const }] }; setBuildings(u); };
  const updateFloor = (bi: number, fi: number, f: Partial<ProjectFloor>) => { const u = [...buildings]; u[bi] = { ...u[bi], floors: u[bi].floors.map((fl, idx) => idx === fi ? { ...fl, ...f } : fl) }; setBuildings(u); };
  const delFloor = (bi: number, fi: number) => { const u = [...buildings]; u[bi] = { ...u[bi], floors: u[bi].floors.filter((_, idx) => idx !== fi) }; setBuildings(u); };
  const handleSave = () => { if (!name.trim()) return; const data: Project = { id: editing?.id || uid(), name: name.trim(), code: code.trim() || undefined, client: client.trim() || undefined, buildings: buildings.filter(b => b.name.trim()).map(b => ({ ...b, floors: b.floors.filter(f => f.name.trim()) })), createdAt: editing?.createdAt || today(), updatedAt: today() }; if (editing) updateProject(editing.id, data); else addProject(data); setIsOpen(false); };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]"><Search className="w-4 h-4 text-gray-400" /><Input placeholder="البحث..." value={search} onChange={(e) => handleSearch(e.target.value)} className="flex-1 text-sm" />{search && <button onClick={() => handleSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>}</div>
        {canEdit(user?.role || '', 'projects') && <Button size="sm" onClick={openAdd} className="gap-1 bg-gradient-to-r from-amber-500 to-amber-600"><Plus className="w-4 h-4" /> إضافة مشروع</Button>}
      </div>
      <div className="space-y-3">
        {filtered.length === 0 ? (<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center"><Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" /><p className="text-sm text-gray-400">لا توجد مشاريع مسجلة</p></div>) : (
          filtered.map((p) => (<div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-50/20 transition-colors" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div><div><p className="text-sm font-bold text-gray-800">{p.name}</p><p className="text-[10px] text-gray-400">{p.code || '—'} | {p.client || '—'} | {p.buildings.length} مبنى</p></div></div>
              <div className="flex items-center gap-2">{canEdit(user?.role || '', 'projects') && <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-1.5 hover:bg-amber-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-amber-600" /></button>}{canDelete('projects') && <button onClick={(e) => { e.stopPropagation(); if (confirm('هل أنت متأكد؟')) deleteProject(p.id); }} className="p-1.5 hover:bg-red-100 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}<ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded === p.id ? 'rotate-180' : ''}`} /></div>
            </div>
            {expanded === p.id && (
              <div className="px-4 pb-4 border-t border-gray-50">
                {p.buildings.map((b) => (<div key={b.id} className="mt-3"><p className="text-xs font-bold text-gray-700 mb-1">🏢 {b.name}</p><div className="flex flex-wrap gap-2">{b.floors.map((f, fi) => (<span key={fi} className={`text-[10px] px-2 py-1 rounded-lg ${f.source === 'local' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{f.name}</span>))}</div></div>))}
              </div>
            )}
          </div>))
        )}
      </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto pb-8" dir="rtl"><DialogHeader><DialogTitle className="text-base">{editing ? 'تعديل مشروع' : 'إضافة مشروع'}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-semibold text-gray-600 block mb-1">الاسم *</label><Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm" /></div><div><label className="text-xs font-semibold text-gray-600 block mb-1">الكود</label><Input value={code} onChange={(e) => setCode(e.target.value)} className="text-sm" /></div><div><label className="text-xs font-semibold text-gray-600 block mb-1">العميل</label><Input value={client} onChange={(e) => setClient(e.target.value)} className="text-sm" /></div></div>
          <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/20"><div className="flex justify-between mb-2"><p className="text-xs font-bold text-amber-700">المباني والطوابق</p><Button size="sm" variant="outline" onClick={addBuilding} className="text-xs h-7"><Plus className="w-3 h-3" /> مبنى</Button></div>
          {buildings.map((b, bi) => (<div key={b.id} className="mb-3 border border-gray-100 rounded-lg p-2"><div className="flex items-center gap-2 mb-2"><Input value={b.name} onChange={(e) => updateBuilding(bi, e.target.value)} placeholder="اسم المبنى" className="text-xs flex-1" /><button onClick={() => delBuilding(bi)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-3 h-3 text-red-500" /></button></div><div className="flex flex-wrap gap-2">{b.floors.map((f, fi) => (<div key={fi} className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border"><Input value={f.name} onChange={(e) => updateFloor(bi, fi, { name: e.target.value })} placeholder="طابق" className="text-[10px] h-6 w-20 border-0 p-0" /><select value={f.source} onChange={(e) => updateFloor(bi, fi, { source: e.target.value as 'local' | 'import' })} className="text-[10px] h-6 border-0 bg-transparent"><option value="local">محلي</option><option value="import">استيراد</option></select><button onClick={() => delFloor(bi, fi)} className="text-red-400 hover:text-red-600 text-[10px]">×</button></div>))}<button onClick={() => addFloor(bi)} className="text-[10px] text-amber-600 hover:text-amber-700 px-2 py-1">+ طابق</button></div></div>))}
          {buildings.length === 0 && <p className="text-[10px] text-gray-400 text-center py-2">لا توجد مباني</p>}</div>
          <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>إلغاء</Button><Button size="sm" onClick={handleSave} className="bg-gradient-to-r from-amber-500 to-amber-600">{editing ? 'حفظ' : 'إضافة'}</Button></div>
        </div>
      </DialogContent></Dialog>
    </div>
  );
}
