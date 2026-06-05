// ============================================================
// Standard Templates — قوالب قياسية
// ============================================================
import type { BoxTemplate, ContainerTemplate, PalletTemplate } from '@/types';

export const DEFAULT_BOX_TEMPLATES: BoxTemplate[] = [
  {
    id: 'tpl-carton-s', name: 'كرتون صغير', type: 'Carton',
    boxLength: 40, boxWidth: 30, boxHeight: 25,
    wgt: '0.5', maxWeight: 15, stackable: true,
    isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-carton-m', name: 'كرتون متوسط', type: 'Carton',
    boxLength: 60, boxWidth: 40, boxHeight: 40,
    wgt: '0.8', maxWeight: 25, stackable: true,
    isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-carton-l', name: 'كرتون كبير', type: 'Carton',
    boxLength: 80, boxWidth: 60, boxHeight: 50,
    wgt: '1.2', maxWeight: 40, stackable: true,
    isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-wooden-m', name: 'صندوق خشبي متوسط', type: 'Wooden',
    boxLength: 100, boxWidth: 80, boxHeight: 60,
    wgt: '8', maxWeight: 200, stackable: true,
    isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-wooden-l', name: 'صندوق خشبي كبير', type: 'Wooden',
    boxLength: 120, boxWidth: 100, boxHeight: 80,
    wgt: '12', maxWeight: 500, stackable: false,
    isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-shipping', name: 'صندوق شحن', type: 'شحن',
    boxLength: 120, boxWidth: 80, boxHeight: 100,
    wgt: '5', maxWeight: 300, stackable: false,
    isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-cart-m', name: 'عربة متوسطة', type: 'عربة',
    boxLength: 150, boxWidth: 80, boxHeight: 120,
    wgt: '25', maxWeight: 800, stackable: false,
    isDefault: true, createdAt: '2024-01-01',
  },
];

export const DEFAULT_CONTAINER_TEMPLATES: ContainerTemplate[] = [
  {
    id: 'tpl-cont-20', name: 'كونتينر 20 قدم',
    contLength: 605, contWidth: 243, contHeight: 259,
    emptyWeight: 2300, maxWeight: 28000,
    isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-cont-40', name: 'كونتينر 40 قدم',
    contLength: 1219, contWidth: 243, contHeight: 259,
    emptyWeight: 3800, maxWeight: 28000,
    isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-cont-40hc', name: 'كونتينر 40 قدم مرتفع',
    contLength: 1219, contWidth: 243, contHeight: 289,
    emptyWeight: 4200, maxWeight: 28000,
    isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-cont-box-s', name: 'صندوق شحن صغير',
    contLength: 200, contWidth: 150, contHeight: 150,
    emptyWeight: 50, maxWeight: 2000,
    isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-cont-box-l', name: 'صندوق شحن كبير',
    contLength: 400, contWidth: 200, contHeight: 200,
    emptyWeight: 150, maxWeight: 5000,
    isDefault: true, createdAt: '2024-01-01',
  },
];

export const DEFAULT_PALLET_TEMPLATES: PalletTemplate[] = [
  {
    id: 'tpl-pallet-eur', name: 'طبلية يورو قياسية',
    dimensions: '120x80x15', wgt: '25',
    maxWeight: 1500, isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-pallet-ind', name: 'طبلية صناعية',
    dimensions: '120x100x15', wgt: '30',
    maxWeight: 2000, isDefault: true, createdAt: '2024-01-01',
  },
  {
    id: 'tpl-pallet-sml', name: 'طبلية صغيرة',
    dimensions: '80x60x12', wgt: '15',
    maxWeight: 800, isDefault: true, createdAt: '2024-01-01',
  },
];

// ─── Get sequential box number for a BATCH ───
// Each batch starts from 001. Local and import are separate.
// 3 digits: 001, 002, 003 ...
export function getNextBoxNumber(
  boxes: { num: string; batchId?: string | null; source?: string }[],
  batchId: string,
  source: 'local' | 'import',
): string {
  const batchBoxes = boxes.filter(
    b => b.batchId === batchId && b.source === source,
  );
  let maxNum = 0;
  batchBoxes.forEach(b => {
    const match = b.num.match(/^(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  return String(maxNum + 1).padStart(3, '0');
}

export function getNextContainerNumber(
  containers: { number: string }[],
): string {
  let maxNum = 0;
  containers.forEach(c => {
    const match = c.number.match(/CNT-?(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  return `CNT-${String(maxNum + 1).padStart(3, '0')}`;
}
