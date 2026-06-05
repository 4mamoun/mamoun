// ─── Auto Barcode Generator ───
// Reads pattern from dataStore settings, builds barcode with continuous numbers (no x, no separators)

import { useDataStore } from '@/store/dataStore';
import type { BarcodeSegment } from '@/types';

const DEFAULT_PREFIXES: Record<string, string> = {
  part: 'PR', top: 'TP', accessory: 'AC', product: 'PD',
};

/** Default segments if none saved */
function defaultSegments(): BarcodeSegment[] {
  return [
    { id: 'd1', type: 'type', value: 'TYPE' },
    { id: 'd2', type: 'year', value: 'YEAR' },
    { id: 'd3', type: 'seq', value: '000001', length: 6 },
  ];
}

/** Load segments from dataStore (reactive source of truth) */
function loadSegments(): BarcodeSegment[] {
  const settings = useDataStore.getState().settings;
  if (settings?.barcodeSegments && settings.barcodeSegments.length > 0) {
    return settings.barcodeSegments;
  }
  return defaultSegments();
}

/** Get next sequence number from existing barcodes */
function getNextSeq(existingBarcodes: string[]): number {
  let max = 0;
  existingBarcodes.forEach(bc => {
    const digits = bc.replace(/\D/g, '');
    if (digits) {
      const num = parseInt(digits.slice(-6), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  });
  return max + 1;
}

/** Build barcode from segments — continuous numbers, no x, no extra separators */
export function generateBarcode(
  type: 'part' | 'top' | 'accessory' | 'product',
  existingBarcodes: string[] = [],
  itemCode?: string,   // part revit or product code
  length?: string,     // e.g. '1200'
  width?: string,      // e.g. '800'
  height?: string,     // e.g. '18'
): string {
  const segments = loadSegments();
  const prefix = DEFAULT_PREFIXES[type] || 'XX';
  const year = new Date().getFullYear();
  const seqLen = segments.find(s => s.type === 'seq')?.length || 6;
  const nextSeq = getNextSeq(existingBarcodes);

  return segments.map(s => {
    switch (s.type) {
      case 'type': return prefix;
      case 'year': return String(year);
      case 'seq': return String(nextSeq).padStart(seqLen, '0');
      case 'dim':
        return (length || '') + (width || '') + (height || '');
      case 'partcode':
      case 'prodcode':
        return itemCode || '';
      case 'custom':
        return s.value;
      default:
        return s.value;
    }
  }).join('');
}

/** Extract barcode values from an array of items */
export function extractBarcodes(items: { barcode?: string }[]): string[] {
  return items.map(i => i.barcode).filter(Boolean) as string[];
}
