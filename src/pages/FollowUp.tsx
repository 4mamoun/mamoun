// ============================================================
// FollowUp v2.0 — Kanban Board Pipeline
// متابعة المشاريع: مسار الدفعات والمنتجات بشكل واضح ومنظم
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { useBatchNoteStore } from '@/store/batchNoteStore';
import { WORKFLOW_STEPS, STEP_MAP, STAGE_ROUTE_MAP, getStepIndex, getProgressPercent } from '@/lib/workflow';
import type { WorkflowStage, Batch, Container, Box } from '@/types';
import BatchNotes from '@/components/BatchNotes';
import {
  Building2, Package, Truck, Boxes, Weight, CalendarDays,
  Search, X, TrendingUp, AlertCircle, MessageSquare,
  ChevronRight, Send, CheckCircle, Clock, ArrowRight, Timer,
  ClipboardList, FolderOpen, Layers, Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// ─── Derive stage from batch + containers + boxes ───
function deriveBatchStage(
  batch: Batch,
  batchContainers: Container[],
  batchBoxes: Box[],
): WorkflowStage {
  // If batch status is still 'جديد', it's being prepared
  if (batch.status === 'جديد') return 'batch_ready';

  // If no boxes created yet → sent to packing
  if (batchBoxes.length === 0) return 'batch_sent';

  // Check if all boxes are assigned to containers
  const boxesInContainers = batchBoxes.filter(b => b.containerId).length;
  const allBoxesInContainers = batchBoxes.length > 0 && boxesInContainers === batchBoxes.length;

  // If boxes exist but not all in containers → still packing
  if (!allBoxesInContainers) return 'packing';

  // All boxes in containers → packing done
  if (allBoxesInContainers) return 'packing_done';

  // Check container shipment status
  if (batchContainers.length > 0) {
    const allDelivered = batchContainers.every(c => c.shipmentStatus === 'delivered');
    const allShipped = batchContainers.every(c => c.shipped || c.shipmentStatus === 'shipped');
    const anyShipped = batchContainers.some(c => c.shipped || c.shipmentStatus === 'shipped');

    if (allDelivered) {
      // Check if all boxes are installed
      const allBoxesInstalled = batchBoxes.every(b => b.installed);
      if (allBoxesInstalled) return 'installed';
      return 'delivered';
    }
    if (allShipped) return 'shipped';
    if (anyShipped) return 'shipped';

    // Containers exist but none shipped → ready for shipment
    return 'shipment_ready';
  }

  return 'packing_done';
}

// ─── Stage icon component ───
function StageIcon({ stage, className = 'w-4 h-4' }: { stage: WorkflowStage; className?: string }) {
  const step = STEP_MAP[stage];
  if (!step) return null;
  // Use color circle as icon
  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ backgroundColor: step.color + '20' }}
    >
      <div className="rounded-full" style={{ width: '8px', height: '8px', backgroundColor: step.color }} />
    </div>
  );
}

// ─── Time elapsed formatter ───
function getElapsedTime(startDate: string): string {
  const now = new Date();
  const start = new Date(startDate);
  const diffMs = now.getTime() - start.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays > 0) return `${diffDays} يوم ${diffHrs % 24} ساعة`;
  if (diffHrs > 0) return `${diffHrs} ساعة`;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `${diffMins} دقيقة`;
}

// ─── Batch Card ───
function BatchCard({
  batch,
  stage,
  projectName,
  containers,
  boxes,
  onShowNotes,
  onAdvance,
}: {
  batch: Batch;
  stage: WorkflowStage;
  projectName: string;
  containers: Container[];
  boxes: Box[];
  onShowNotes: () => void;
  onAdvance: () => void;
}) {
  const navigate = useNavigate();
  const step = STEP_MAP[stage];
  const nextStep = step?.nextStage ? STEP_MAP[step.nextStage] : null;

  const totalWeight = useMemo(() => {
    return boxes.reduce((sum, b) => {
      const boxW = (Number(b.wgt) || 0) + (b.pickItems || []).reduce((s: number, item: any) => s + ((item.weight || 0) * (item.assignedQty || 1)), 0);
      return sum + boxW;
    }, 0);
  }, [boxes]);

  const boxesInContainers = boxes.filter(b => b.containerId).length;
  const packedPercent = boxes.length > 0 ? Math.round((boxesInContainers / boxes.length) * 100) : 0;

  return (
    <div
      className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group"
      style={{ borderColor: step?.borderColor || '#e5e7eb' }}
      onClick={() => navigate('/batches')}
    >
      {/* Card Header */}
      <div className="p-3 pb-2">
        <div className="flex items-start gap-2 mb-2">
          <StageIcon stage={stage} className="w-5 h-5 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-800 truncate leading-tight">{batch.name}</p>
            <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
              <Building2 className="w-2.5 h-2.5" />
              {projectName}
            </p>
          </div>
          {/* Notes button */}
          <button
            onClick={(e) => { e.stopPropagation(); onShowNotes(); }}
            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 transition-colors flex-shrink-0"
            title="ملاحظات"
          >
            <MessageSquare className="w-3 h-3" />
          </button>
        </div>

        {/* Mini progress bar */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${getProgressPercent(stage)}%`, backgroundColor: step?.color || '#cbd5e1' }}
            />
          </div>
          <span className="text-[9px] text-gray-400 font-medium">{getProgressPercent(stage)}%</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <Package className="w-2.5 h-2.5 text-gray-400" />
            {(batch.prods || []).length} منتج
          </span>
          <span className="flex items-center gap-1">
            <Boxes className="w-2.5 h-2.5 text-gray-400" />
            {boxes.length} صندوق
          </span>
          <span className="flex items-center gap-1">
            <Truck className="w-2.5 h-2.5 text-gray-400" />
            {containers.length} كونتينر
          </span>
          <span className="flex items-center gap-1">
            <Weight className="w-2.5 h-2.5 text-gray-400" />
            {totalWeight.toFixed(0)} كجم
          </span>
        </div>

        {/* Elapsed time on current stage — uses stageHistory if available */}
        {stage !== 'installed' && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
              <span>⏱️</span>
              جاري العمل على {step?.label}
              {batch.stageHistory?.find(s => s.stage === stage && !s.completedAt)
                ? ` — ${getElapsedTime(batch.stageHistory.find(s => s.stage === stage)!.startedAt)}`
                : batch.updatedAt
                  ? ` — ${getElapsedTime(batch.updatedAt)}`
                  : ''}
            </span>
          </div>
        )}

        {/* Packing mini bar */}
        {boxes.length > 0 && stage !== 'installed' && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${packedPercent}%`,
                  backgroundColor: packedPercent === 100 ? '#22c55e' : '#f59e0b',
                }}
              />
            </div>
            <span className="text-[9px] text-gray-400">{boxesInContainers}/{boxes.length}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      {nextStep && (
        <div
          className="px-3 py-2 border-t flex items-center justify-between"
          style={{ borderColor: step?.borderColor || '#e5e7eb', backgroundColor: step?.bgColor || '#f9fafb' }}
        >
          <span className="text-[9px] text-gray-500">
            {nextStep.ownerRole}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onAdvance(); }}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white flex items-center gap-1 transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: step?.color || '#64748b' }}
          >
            <ArrowRight className="w-3 h-3" />
            {nextStep.shortLabel}
          </button>
        </div>
      )}

      {/* Completed footer */}
      {!nextStep && (
        <div
          className="px-3 py-2 border-t flex items-center justify-center gap-1"
          style={{ borderColor: '#86efac', backgroundColor: '#f0fdf4' }}
        >
          <CheckCircle className="w-3 h-3 text-green-600" />
          <span className="text-[10px] font-bold text-green-700">مكتمل</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function FollowUp() {
  const navigate = useNavigate();
  const { projects, batches, containers, boxes } = useDataStore();
  const { user } = useAuthStore();

  // Filters
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterGroup, setFilterGroup] = useState<'all' | 'active' | 'shipping' | 'done'>('all');

  // Notes
  const [notesBatch, setNotesBatch] = useState<{ id: string; name: string } | null>(null);

  // ─── Build pipeline data ───
  const pipelineItems = useMemo(() => {
    return batches.map(batch => {
      const project = projects.find(p => p.id === batch.projectId);
      const batchBoxes = boxes.filter(b => b.batchId === batch.id);
      const batchContainerIds = new Set(
        batchBoxes.filter(b => b.containerId).map(b => b.containerId as string)
      );
      const batchContainers = containers.filter(c => batchContainerIds.has(c.id));
      const stage = deriveBatchStage(batch, batchContainers, batchBoxes);

      return {
        batch,
        project: project || { id: '', name: '—' },
        stage,
        containers: batchContainers,
        boxes: batchBoxes,
      };
    });
  }, [batches, projects, containers, boxes]);

  // ─── Filter ───
  const filteredItems = useMemo(() => {
    let result = [...pipelineItems];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        i =>
          i.batch.name.toLowerCase().includes(q) ||
          i.project.name.toLowerCase().includes(q) ||
          STEP_MAP[i.stage]?.label.includes(q)
      );
    }

    // Project filter
    if (filterProject) {
      result = result.filter(i => i.project.id === filterProject);
    }

    // Group filter
    if (filterGroup !== 'all') {
      const groups: Record<string, WorkflowStage[]> = {
        active: ['batch_ready', 'batch_sent', 'packing', 'packing_done', 'shipment_ready'],
        shipping: ['shipped'],
        done: ['delivered', 'installed'],
      };
      result = result.filter(i => groups[filterGroup]?.includes(i.stage));
    }

    return result;
  }, [pipelineItems, search, filterProject, filterGroup]);

  // ─── Group by stage ───
  const itemsByStage = useMemo(() => {
    const map = new Map<WorkflowStage, typeof filteredItems>();
    for (const step of WORKFLOW_STEPS) {
      const items = filteredItems.filter(i => i.stage === step.stage);
      map.set(step.stage, items);
    }
    return map;
  }, [filteredItems]);

  // ─── Stats ───
  const stats = useMemo(() => {
    const total = pipelineItems.length;
    const active = pipelineItems.filter(i =>
      ['batch_ready', 'batch_sent', 'packing', 'packing_done', 'shipment_ready'].includes(i.stage)
    ).length;
    const shipping = pipelineItems.filter(i => i.stage === 'shipped').length;
    const done = pipelineItems.filter(i =>
      ['delivered', 'installed'].includes(i.stage)
    ).length;
    const avgProgress = total > 0
      ? Math.round(pipelineItems.reduce((s, i) => s + getProgressPercent(i.stage), 0) / total)
      : 0;
    return { total, active, shipping, done, avgProgress };
  }, [pipelineItems]);

  // ─── Handlers ───
  const handleAdvance = useCallback(
    (batch: Batch, currentStage: WorkflowStage) => {
      const step = STEP_MAP[currentStage];
      if (!step?.nextStage) return;

      const nextRoute = STAGE_ROUTE_MAP[step.nextStage];
      const confirmMsg = `تأكيد انتقال الدفعة "${batch.name}" إلى مرحلة "${STEP_MAP[step.nextStage]?.label}"؟`;

      if (confirm(confirmMsg)) {
        // Update batch status based on stage transition
        if (currentStage === 'batch_ready') {
          // Moving from ready to sent → update batch status
          const { updateBatch } = useDataStore.getState();
          updateBatch(batch.id, { status: 'قيد التجهيز' as any });
        }
        navigate(nextRoute);
      }
    },
    [navigate]
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col" dir="rtl">
      {/* ═══ Header ═══ */}
      <div className="bg-white border-b border-gray-100 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">متابعة المشاريع</h1>
              <p className="text-[11px] text-gray-400">Pipeline — خط سير الدفعات والمنتجات</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-50 rounded-lg px-3 py-1.5 text-center">
              <p className="text-lg font-bold text-slate-700">{stats.total}</p>
              <p className="text-[9px] text-slate-400">الكل</p>
            </div>
            <div className="bg-amber-50 rounded-lg px-3 py-1.5 text-center">
              <p className="text-lg font-bold text-amber-600">{stats.active}</p>
              <p className="text-[9px] text-amber-400">نشط</p>
            </div>
            <div className="bg-blue-50 rounded-lg px-3 py-1.5 text-center">
              <p className="text-lg font-bold text-blue-600">{stats.shipping}</p>
              <p className="text-[9px] text-blue-400">بالشحن</p>
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-1.5 text-center">
              <p className="text-lg font-bold text-green-600">{stats.done}</p>
              <p className="text-[9px] text-green-400">مكتمل</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
              <p className="text-lg font-bold text-gray-700">{stats.avgProgress}%</p>
              <p className="text-[9px] text-gray-400">التقدم</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md bg-gray-50 rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <Input
              placeholder="بحث في الدفعات أو المشاريع..."
              value={search}
              onChange={e => setSearch(e.target.value)}
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
            onChange={e => setFilterProject(e.target.value)}
            className="h-8 text-[11px] rounded-lg border border-gray-200 bg-white px-2"
          >
            <option value="">كل المشاريع</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Group filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {([
              { key: 'all', label: 'الكل', count: stats.total },
              { key: 'active', label: 'نشط', count: stats.active },
              { key: 'shipping', label: 'بالشحن', count: stats.shipping },
              { key: 'done', label: 'مكتمل', count: stats.done },
            ] as const).map(g => (
              <button
                key={g.key}
                onClick={() => setFilterGroup(g.key)}
                className={`text-[10px] px-3 py-1.5 rounded-md font-medium transition-all ${
                  filterGroup === g.key
                    ? 'bg-white shadow-sm text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {g.label} ({g.count})
              </button>
            ))}
          </div>

          {/* Clear filters */}
          {(search || filterProject || filterGroup !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterProject(''); setFilterGroup('all'); }}
              className="text-[10px] text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* ═══ Kanban Board ═══ */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-50/50">
        <div className="flex gap-3 p-4 h-full min-w-max">
          {WORKFLOW_STEPS.map(step => {
            const items = itemsByStage.get(step.stage) || [];
            const isLast = step.nextStage === null;

            return (
              <div
                key={step.stage}
                className="flex flex-col w-72 flex-shrink-0 rounded-xl overflow-hidden border"
                style={{
                  backgroundColor: step.bgColor,
                  borderColor: step.borderColor,
                }}
              >
                {/* Column Header */}
                <div
                  className="p-3 border-b flex items-center justify-between"
                  style={{ borderColor: step.borderColor, backgroundColor: step.bgColor }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: step.color }}
                    />
                    <span className="text-xs font-bold" style={{ color: step.color }}>
                      {step.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: step.color + '20', color: step.color }}
                    >
                      {items.length}
                    </span>
                    <span className="text-[9px] text-gray-400">{step.ownerRole}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {items.length === 0 ? (
                    <div className="text-center py-8">
                      <div
                        className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                        style={{ backgroundColor: step.color + '10' }}
                      >
                        <Clock className="w-4 h-4" style={{ color: step.color + '40' }} />
                      </div>
                      <p className="text-[10px] text-gray-300">لا توجد دفعات</p>
                    </div>
                  ) : (
                    items.map(item => (
                      <BatchCard
                        key={item.batch.id}
                        batch={item.batch}
                        stage={item.stage}
                        projectName={item.project.name}
                        containers={item.containers}
                        boxes={item.boxes}
                        onShowNotes={() => setNotesBatch({ id: item.batch.id, name: item.batch.name })}
                        onAdvance={() => handleAdvance(item.batch, item.stage)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
