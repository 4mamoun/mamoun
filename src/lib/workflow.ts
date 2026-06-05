// ============================================================
// Workflow Pipeline Configuration — خط سير المشاريع v2.0
// ============================================================

import type { WorkflowStage, WorkflowStep } from '@/types';

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    stage: 'batch_ready',
    label: 'إعداد الدفعة',
    shortLabel: 'إعداد',
    ownerRole: 'الإنتاج',
    description: 'تجهيز المنتجات وتوزيع القطع',
    icon: 'ClipboardList',
    color: '#64748B', // slate
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    nextStage: 'batch_sent',
  },
  {
    stage: 'batch_sent',
    label: 'إرسال للتحجيم',
    shortLabel: 'للتحجيم',
    ownerRole: 'الإنتاج',
    description: 'الدفعة أُرسلت لمسؤول التحجيم',
    icon: 'Send',
    color: '#0EA5E9', // sky
    bgColor: '#E0F2FE',
    borderColor: '#7DD3FC',
    nextStage: 'packing',
  },
  {
    stage: 'packing',
    label: 'قيد التحجيم',
    shortLabel: 'تحجيم',
    ownerRole: 'التحجيم',
    description: 'تعبئة الصناديق وتخصيص القطع',
    icon: 'BoxSelect',
    color: '#F59E0B', // amber
    bgColor: '#FEF3C7',
    borderColor: '#FCD34D',
    nextStage: 'packing_done',
  },
  {
    stage: 'packing_done',
    label: 'تم التحجيم',
    shortLabel: 'تم التحجيم',
    ownerRole: 'التحجيم',
    description: 'اكتمال تعبئة الصناديق',
    icon: 'CheckCircle',
    color: '#8B5CF6', // violet
    bgColor: '#EDE9FE',
    borderColor: '#C4B5FD',
    nextStage: 'shipment_ready',
  },
  {
    stage: 'shipment_ready',
    label: 'جاهز للشحن',
    shortLabel: 'للشحن',
    ownerRole: 'الشحنات',
    description: 'تجهيز الكونتينرات والتوزيع',
    icon: 'Truck',
    color: '#6366F1', // indigo
    bgColor: '#E0E7FF',
    borderColor: '#A5B4FC',
    nextStage: 'shipped',
  },
  {
    stage: 'shipped',
    label: 'تم الإرسال',
    shortLabel: 'مُرسل',
    ownerRole: 'الاستلام',
    description: 'الشحنة في الطريق للموقع',
    icon: 'SendHorizonal',
    color: '#3B82F6', // blue
    bgColor: '#DBEAFE',
    borderColor: '#93C5FD',
    nextStage: 'delivered',
  },
  {
    stage: 'delivered',
    label: 'تم الاستلام',
    shortLabel: 'مُستلم',
    ownerRole: 'التركيب',
    description: 'استلام الشحنة في الموقع',
    icon: 'PackageCheck',
    color: '#14B8A6', // teal
    bgColor: '#CCFBF1',
    borderColor: '#5EEAD4',
    nextStage: 'installed',
  },
  {
    stage: 'installed',
    label: 'تم التركيب',
    shortLabel: 'مُركب',
    ownerRole: '—',
    description: 'اكتمال المشروع',
    icon: 'CheckSquare',
    color: '#22C55E', // green
    bgColor: '#DCFCE7',
    borderColor: '#86EFAC',
    nextStage: null,
  },
];

export const STEP_MAP: Record<WorkflowStage, WorkflowStep> = WORKFLOW_STEPS.reduce(
  (acc, step) => ({ ...acc, [step.stage]: step }),
  {} as Record<WorkflowStage, WorkflowStep>
);

export function getStep(stage: WorkflowStage): WorkflowStep | undefined {
  return STEP_MAP[stage];
}

export function getStepIndex(stage: WorkflowStage): number {
  return WORKFLOW_STEPS.findIndex(s => s.stage === stage);
}

export function getProgressPercent(stage: WorkflowStage): number {
  const idx = getStepIndex(stage);
  if (idx < 0) return 0;
  return Math.round((idx / (WORKFLOW_STEPS.length - 1)) * 100);
}

export function getNextStep(stage: WorkflowStage): WorkflowStep | null {
  const step = getStep(stage);
  if (!step?.nextStage) return null;
  return getStep(step.nextStage) || null;
}

export const STAGE_LABELS: Record<WorkflowStage, string> = WORKFLOW_STEPS.reduce(
  (acc, step) => ({ ...acc, [step.stage]: step.label }),
  {} as Record<WorkflowStage, string>
);

export const STAGE_SHORT_LABELS: Record<WorkflowStage, string> = WORKFLOW_STEPS.reduce(
  (acc, step) => ({ ...acc, [step.stage]: step.shortLabel }),
  {} as Record<WorkflowStage, string>
);

// Navigation map: where each stage should route to
export const STAGE_ROUTE_MAP: Record<WorkflowStage, string> = {
  batch_ready: '/batches',
  batch_sent: '/packing',
  packing: '/packing',
  packing_done: '/containers',
  shipment_ready: '/shipments',
  shipped: '/delivery',
  delivered: '/installation',
  installed: '/projects',
};

// Stage groupings for filtering
export const STAGE_GROUPS = {
  active: ['batch_ready', 'batch_sent', 'packing', 'packing_done', 'shipment_ready'] as WorkflowStage[],
  shipping: ['shipped'] as WorkflowStage[],
  done: ['delivered', 'installed'] as WorkflowStage[],
};
