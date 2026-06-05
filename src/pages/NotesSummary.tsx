// ============================================================
// Notes Summary — ملخص الملاحظات
// Inbox-style grouped by batch with stats and filters
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import BatchNotes from '@/components/BatchNotes';
import {
  MessageSquare, Inbox, CheckCircle, Clock, AlertCircle,
  Search, X, TrendingUp, MailOpen, Mail, BarChart3,
  Filter, ChevronDown, ChevronUp, Building2, Layers,
  ArrowLeft, StickyNote, CircleDot, Circle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

type FilterStatus = 'all' | 'open' | 'in_progress' | 'done' | 'rejected';
type SortMode = 'newest' | 'oldest' | 'batch';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Circle }> = {
  open: { label: 'مفتوحة', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: CircleDot },
  in_progress: { label: 'قيد التنفيذ', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
  done: { label: 'مكتملة', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle },
  rejected: { label: 'مرفوضة', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle },
};

interface RawNote {
  id: string;
  batchId: string;
  text: string;
  status: string;
  authorName: string;
  authorPhoto?: string;
  createdAt: number;
  images?: string[];
  replies?: any[];
}

export default function NotesSummary() {
  const { batches, projects } = useDataStore();
  const { user } = useAuthStore();

  // State
  const [allNotes, setAllNotes] = useState<RawNote[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterProject, setFilterProject] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [notesBatch, setNotesBatch] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to ALL batchNotes
  useEffect(() => {
    setIsLoading(true);
    const unsub = onSnapshot(
      collection(db, 'batchNotes'),
      (snap) => {
        const notes: RawNote[] = [];
        snap.forEach((d) => {
          const data = d.data();
          notes.push({
            id: d.id,
            batchId: data.batchId || '',
            text: data.text || '',
            status: data.status || 'open',
            authorName: data.authorName || '—',
            authorPhoto: data.authorPhoto,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || 0),
            images: data.images || [],
            replies: data.replies || [],
          });
        });
        notes.sort((a, b) => b.createdAt - a.createdAt);
        setAllNotes(notes);
        setIsLoading(false);
      },
      (err) => {
        console.error('[NotesSummary] subscribe error:', err);
        setIsLoading(false);
      }
    );
    return unsub;
  }, []);

  // Group notes by batch
  const notesByBatch = useMemo(() => {
    const map = new Map<string, RawNote[]>();
    for (const note of allNotes) {
      const list = map.get(note.batchId) || [];
      list.push(note);
      map.set(note.batchId, list);
    }
    return map;
  }, [allNotes]);

  // Get batch and project info
  const getBatchInfo = (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId);
    const project = batch ? projects.find((p) => p.id === batch.projectId) : null;
    return { batch, project };
  };

  // Filter and sort batch groups
  const batchGroups = useMemo(() => {
    let groups: { batchId: string; notes: RawNote[]; batchName: string; projectName: string }[] = [];

    for (const [batchId, notes] of notesByBatch) {
      const { batch, project } = getBatchInfo(batchId);
      const batchName = batch?.name || 'دفعة غير معروفة';
      const projectName = project?.name || '—';

      // Filter by project
      if (filterProject && project?.id !== filterProject) continue;

      // Filter notes by status
      let filteredNotes = notes;
      if (filterStatus !== 'all') {
        filteredNotes = notes.filter((n) => n.status === filterStatus);
      }
      // Filter by search
      if (search.trim()) {
        const q = search.toLowerCase();
        filteredNotes = filteredNotes.filter(
          (n) =>
            n.text.toLowerCase().includes(q) ||
            n.authorName.toLowerCase().includes(q) ||
            batchName.toLowerCase().includes(q)
        );
      }

      if (filteredNotes.length > 0) {
        groups.push({ batchId, notes: filteredNotes, batchName, projectName });
      }
    }

    // Sort
    if (sortMode === 'newest') {
      groups.sort((a, b) => (b.notes[0]?.createdAt || 0) - (a.notes[0]?.createdAt || 0));
    } else if (sortMode === 'oldest') {
      groups.sort((a, b) => (a.notes[0]?.createdAt || 0) - (b.notes[0]?.createdAt || 0));
    } else {
      groups.sort((a, b) => a.batchName.localeCompare(b.batchName));
    }

    return groups;
  }, [notesByBatch, filterStatus, filterProject, search, sortMode, batches, projects]);

  // Stats
  const stats = useMemo(() => {
    const total = allNotes.length;
    const open = allNotes.filter((n) => n.status === 'open').length;
    const inProgress = allNotes.filter((n) => n.status === 'in_progress').length;
    const done = allNotes.filter((n) => n.status === 'done').length;
    const rejected = allNotes.filter((n) => n.status === 'rejected').length;
    const withReplies = allNotes.filter((n) => (n.replies?.length || 0) > 0).length;
    const activeBatches = notesByBatch.size;
    return { total, open, inProgress, done, rejected, withReplies, activeBatches };
  }, [allNotes, notesByBatch]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col" dir="rtl">
      {/* ═══ Header ═══ */}
      <div className="bg-white border-b border-gray-100 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">ملخص الملاحظات</h1>
              <p className="text-[11px] text-gray-400">Notes Summary — ملاحظات جميع الدفعات</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex items-center gap-2">
            <div className="bg-indigo-50 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
              <p className="text-lg font-bold text-indigo-700">{stats.total}</p>
              <p className="text-[9px] text-indigo-400">الكل</p>
            </div>
            <div className="bg-blue-50 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
              <p className="text-lg font-bold text-blue-600">{stats.open}</p>
              <p className="text-[9px] text-blue-400">مفتوحة</p>
            </div>
            <div className="bg-amber-50 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
              <p className="text-lg font-bold text-amber-600">{stats.inProgress}</p>
              <p className="text-[9px] text-amber-400">قيد التنفيذ</p>
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
              <p className="text-lg font-bold text-green-600">{stats.done}</p>
              <p className="text-[9px] text-green-400">مكتملة</p>
            </div>
            <div className="bg-purple-50 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
              <p className="text-lg font-bold text-purple-600">{stats.activeBatches}</p>
              <p className="text-[9px] text-purple-400">دفعات</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md bg-gray-50 rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <Input
              placeholder="بحث في الملاحظات أو الدفعات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs border-0 bg-transparent focus-visible:ring-0 p-0 h-7"
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-1 hover:bg-gray-200 rounded">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Project filter */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="h-8 text-[11px] rounded-lg border border-gray-200 bg-white px-2"
          >
            <option value="">كل المشاريع</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {([
              { key: 'all' as FilterStatus, label: 'الكل', count: stats.total },
              { key: 'open' as FilterStatus, label: 'مفتوحة', count: stats.open },
              { key: 'in_progress' as FilterStatus, label: 'قيد التنفيذ', count: stats.inProgress },
              { key: 'done' as FilterStatus, label: 'مكتملة', count: stats.done },
              { key: 'rejected' as FilterStatus, label: 'مرفوضة', count: stats.rejected },
            ]).map((s) => (
              <button
                key={s.key}
                onClick={() => setFilterStatus(s.key)}
                className={`text-[10px] px-3 py-1.5 rounded-md font-medium transition-all ${
                  filterStatus === s.key
                    ? 'bg-white shadow-sm text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s.label} ({s.count})
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="h-8 text-[11px] rounded-lg border border-gray-200 bg-white px-2"
          >
            <option value="newest">الأحدث</option>
            <option value="oldest">الأقدم</option>
            <option value="batch">حسب الدفعة</option>
          </select>

          {/* Clear */}
          {(search || filterProject || filterStatus !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterProject(''); setFilterStatus('all'); }}
              className="text-[10px] text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-5 h-5 animate-spin" />
              <span className="text-sm">جاري التحميل...</span>
            </div>
          </div>
        ) : batchGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Inbox className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-lg font-bold text-gray-500 mb-1">لا توجد ملاحظات</p>
            <p className="text-sm text-gray-400">
              {search || filterStatus !== 'all' || filterProject
                ? 'جرب تغيير فلاتر البحث'
                : 'ستظهر الملاحظات هنا عند إضافتها للدفعات'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {batchGroups.map((group) => {
              const isExpanded = expandedBatch === group.batchId;
              const openCount = group.notes.filter((n) => n.status === 'open').length;
              const inProgressCount = group.notes.filter((n) => n.status === 'in_progress').length;
              const doneCount = group.notes.filter((n) => n.status === 'done').length;

              return (
                <div
                  key={group.batchId}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Batch Header — Inbox Style */}
                  <button
                    onClick={() => setExpandedBatch(isExpanded ? null : group.batchId)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-gray-50/50 transition-colors text-right"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-800">{group.batchName}</p>
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5" />
                          {group.projectName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-gray-400">{group.notes.length} ملاحظة</span>
                        {openCount > 0 && (
                          <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">
                            {openCount} مفتوحة
                          </span>
                        )}
                        {inProgressCount > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">
                            {inProgressCount} قيد التنفيذ
                          </span>
                        )}
                        {doneCount > 0 && (
                          <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-bold">
                            {doneCount} مكتملة
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Open notes button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotesBatch({ id: group.batchId, name: group.batchName });
                        }}
                        className="text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        فتح المحادثة
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Notes List */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {group.notes.map((note) => {
                        const cfg = STATUS_CONFIG[note.status] || STATUS_CONFIG.open;
                        const StatusIcon = cfg.icon;
                        const replyCount = note.replies?.length || 0;
                        const dateStr = note.createdAt
                          ? new Date(note.createdAt).toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—';

                        return (
                          <div
                            key={note.id}
                            className={`p-3 border-b border-gray-50 hover:bg-gray-50/30 transition-colors ${
                              note.status === 'open' ? 'bg-blue-50/20' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Author avatar */}
                              <div className="flex-shrink-0">
                                {note.authorPhoto ? (
                                  <img
                                    src={note.authorPhoto}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-gray-600">
                                      {note.authorName?.charAt(0) || '?'}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-xs font-bold text-gray-700">
                                    {note.authorName}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${cfg.bg} ${cfg.color} ${cfg.border} border`}
                                  >
                                    <StatusIcon className="w-2.5 h-2.5" />
                                    {cfg.label}
                                  </span>
                                  <span className="text-[9px] text-gray-400">{dateStr}</span>
                                </div>
                                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                  {note.text}
                                </p>
                                {note.images && note.images.length > 0 && (
                                  <div className="flex gap-1 mt-2">
                                    {note.images.map((img, i) => (
                                      <img
                                        key={i}
                                        src={img}
                                        alt=""
                                        className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                      />
                                    ))}
                                  </div>
                                )}
                                {replyCount > 0 && (
                                  <div className="mt-2 flex items-center gap-1 text-[10px] text-indigo-500">
                                    <MessageSquare className="w-3 h-3" />
                                    <span>{replyCount} رد</span>
                                  </div>
                                )}
                              </div>

                              {/* Unread indicator for open notes */}
                              {note.status === 'open' && (
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Batch Notes Drawer ═══ */}
      {notesBatch && (
        <BatchNotes
          batchId={notesBatch.id}
          batchName={notesBatch.name}
          open={!!notesBatch}
          onClose={() => setNotesBatch(null)}
        />
      )}
    </div>
  );
}
