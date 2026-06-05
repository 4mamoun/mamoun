// ============================================================
// BarcodeSearch — بحث بالباركود في القائمة الجانبية
// نتائج كبطاقات مع صورة + معلومات
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ScanLine, Barcode, ImageIcon } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import BarcodeScanner from './barcode/BarcodeScanner';
import type { Part, Top, Product, Accessory } from '@/types';

type ItemType = 'part' | 'top' | 'product' | 'accessory';

interface SearchResult {
  item: Part | Top | Product | Accessory;
  type: ItemType;
  typeLabel: string;
  page: string;
  color: string;
  bgColor: string;
  img?: string;
}

const TYPE_STYLES: Record<ItemType, { typeLabel: string; page: string; color: string; bgColor: string }> = {
  part:       { typeLabel: 'قطعة',      page: 'parts',       color: 'text-blue-600',      bgColor: 'bg-blue-50' },
  top:        { typeLabel: 'توب',       page: 'tops',        color: 'text-teal-600',      bgColor: 'bg-teal-50' },
  product:    { typeLabel: 'منتج',      page: 'products',    color: 'text-green-600',     bgColor: 'bg-green-50' },
  accessory:  { typeLabel: 'اكسسوار',   page: 'accessories', color: 'text-purple-600',    bgColor: 'bg-purple-50' },
};

function getName(item: any): string { return item.name || ''; }
function getCode(item: any): string { return item.revit || item.code || ''; }
function getBarcode(item: any): string { return item.barcode || ''; }
function getImg(item: any): string | undefined { return item.img; }

function getSpecs(item: any, type: ItemType): string {
  if (type === 'part') {
    const dims = [item.length, item.width, item.height].filter(Boolean).join('×');
    return `${item.source === 'local' ? 'محلي' : 'مستورد'}${dims ? ' | ' + dims + 'مم' : ''}`;
  }
  if (type === 'top') {
    const dims = [item.length, item.width, item.thickness].filter(Boolean).join('×');
    return `${item.product || ''}${dims ? ' | ' + dims + 'مم' : ''}`;
  }
  if (type === 'product') {
    return `${item.components?.length || 0} مكون`;
  }
  return '';
}

export default function BarcodeSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { parts, tops, products, accessories } = useDataStore();

  const searchBarcode = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const lower = q.toLowerCase();
    const found: SearchResult[] = [];

    parts.forEach(p => {
      if ((p.barcode && p.barcode.toLowerCase().includes(lower)) || p.revit.toLowerCase().includes(lower) || p.name.toLowerCase().includes(lower)) {
        const s = TYPE_STYLES.part;
        found.push({ item: p, type: 'part', ...s, img: p.img });
      }
    });
    tops.forEach(t => {
      if ((t.barcode && t.barcode.toLowerCase().includes(lower)) || t.code.toLowerCase().includes(lower) || t.name.toLowerCase().includes(lower)) {
        const s = TYPE_STYLES.top;
        found.push({ item: t, type: 'top', ...s, img: t.img });
      }
    });
    products.forEach(p => {
      if ((p.barcode && p.barcode.toLowerCase().includes(lower)) || p.code.toLowerCase().includes(lower) || p.name.toLowerCase().includes(lower)) {
        const s = TYPE_STYLES.product;
        found.push({ item: p, type: 'product', ...s, img: p.img });
      }
    });
    accessories.forEach(a => {
      if ((a.barcode && a.barcode.toLowerCase().includes(lower)) || a.code.toLowerCase().includes(lower) || a.name.toLowerCase().includes(lower)) {
        const s = TYPE_STYLES.accessory;
        found.push({ item: a, type: 'accessory', ...s, img: a.img });
      }
    });

    setResults(found.slice(0, 6));
    setShowResults(true);
  }, [parts, tops, products, accessories]);

  const handleScan = (code: string) => {
    setScannerOpen(false);
    setQuery(code);
    searchBarcode(code);
  };

  const handleSelect = (r: SearchResult) => {
    setShowResults(false);
    setQuery('');
    navigate(`/${r.page}`);
    sessionStorage.setItem('highlight_barcode_item', r.item.id);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
      <div ref={containerRef} className="relative px-3 mb-2">
        {/* Search bar */}
        <div className="flex items-center gap-1 bg-white/10 rounded-xl px-2 py-1.5">
          <Search className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); searchBarcode(e.target.value); }}
            onFocus={() => query && searchBarcode(query)}
            placeholder="بحث بالباركود..."
            className="flex-1 bg-transparent text-[11px] text-white placeholder-white/30 outline-none"
            dir="rtl"
          />
          {query ? (
            <button onClick={() => { setQuery(''); setResults([]); setShowResults(false); }} className="p-0.5 hover:bg-white/10 rounded">
              <X className="w-3 h-3 text-white/40" />
            </button>
          ) : (
            <button onClick={() => setScannerOpen(true)} className="p-0.5 hover:bg-white/10 rounded" title="مسح باركود">
              <ScanLine className="w-3.5 h-3.5 text-white/50" />
            </button>
          )}
        </div>

        {/* Results — Image Cards */}
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2 space-y-1.5" dir="rtl">
            {results.map((r, i) => (
              <button
                key={`${r.type}-${r.item.id}-${i}`}
                onClick={() => handleSelect(r)}
                className="w-full text-right rounded-xl p-2.5 hover:bg-gray-50 transition-all flex items-center gap-3 border border-gray-50 hover:border-gray-100 hover:shadow-sm"
              >
                {/* Image */}
                <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {getImg(r.item) ? (
                    <img src={getImg(r.item)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-200" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${r.bgColor} ${r.color}`}>
                      {r.typeLabel}
                    </span>
                  </div>
                  <p className="text-[13px] font-bold text-gray-800 truncate leading-tight">{getName(r.item)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-gray-400 font-mono">{getCode(r.item)}</p>
                    {getBarcode(r.item) && (
                      <p className="text-[10px] text-indigo-400 font-mono flex items-center gap-0.5">
                        <Barcode className="w-2.5 h-2.5" /> {getBarcode(r.item)}
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{getSpecs(r.item, r.type)}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {showResults && query && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50 text-center" dir="rtl">
            <Barcode className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">لا توجد نتائج</p>
          </div>
        )}
      </div>
    </>
  );
}
