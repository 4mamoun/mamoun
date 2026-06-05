// ============================================================
// Stock Card Dialog — بطاقة مادة (عرض حركات المخزون)
// ============================================================

import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import type { StockTransaction } from '@/store/dataStore';
import {
  X, ArrowDownLeft, ArrowUpRight, RefreshCw, Package,
  AlertTriangle, History, TrendingUp, TrendingDown,
  Calendar, User, FileText,
} from 'lucide-react';

interface StockCardProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemType: 'part' | 'top' | 'accessory' | 'product';
  itemName: string;
  itemCode: string;
  currentQty?: number;
}

const typeLabels: Record<string, string> = {
  in: 'وارد',
  out: 'صادر',
  adj: 'تعديل',
  return: 'إرجاع',
  reserve: 'حجز',
  release: 'إلغاء حجز',
  shipment: 'شحنة',
};

const typeColors: Record<string, { bg: string; text: string; icon: typeof TrendingUp }> = {
  in: { bg: 'bg-green-50', text: 'text-green-700', icon: ArrowDownLeft },
  out: { bg: 'bg-red-50', text: 'text-red-700', icon: ArrowUpRight },
  adj: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: AlertTriangle },
  return: { bg: 'bg-blue-50', text: 'text-blue-700', icon: RefreshCw },
  reserve: { bg: 'bg-orange-50', text: 'text-orange-700', icon: Package },
  release: { bg: 'bg-teal-50', text: 'text-teal-700', icon: Package },
  shipment: { bg: 'bg-purple-50', text: 'text-purple-700', icon: TrendingDown },
};

export default function StockCard({ open, onClose, itemId, itemType, itemName, itemCode, currentQty }: StockCardProps) {
  const { getStockCard, parts, tops, accessories } = useDataStore();
  const [filterType, setFilterType] = useState<string>('all');

  const transactions = useMemo(() => getStockCard(itemId, itemType), [getStockCard, itemId, itemType]);

  const filtered = useMemo(() => {
    if (filterType === 'all') return transactions;
    return transactions.filter(t => t.type === filterType);
  }, [transactions, filterType]);

  const stats = useMemo(() => {
    const totalIn = transactions.filter(t => t.type === 'in' || t.type === 'return').reduce((s, t) => s + t.qty, 0);
    const totalOut = transactions.filter(t => t.type === 'out' || t.type === 'shipment').reduce((s, t) => s + t.qty, 0);
    const totalReserve = transactions.filter(t => t.type === 'reserve').reduce((s, t) => s + t.qty, 0);
    const totalRelease = transactions.filter(t => t.type === 'release').reduce((s, t) => s + t.qty, 0);
    return { totalIn, totalOut, totalReserve, totalRelease, count: transactions.length };
  }, [transactions]);

  const qty = useMemo(() => {
    if (currentQty !== undefined) return currentQty;
    if (itemType === 'part') return parts.find(p => p.id === itemId)?.qty || 0;
    return 0;
  }, [currentQty, itemType, itemId, parts]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">بطاقة مادة</h2>
              <p className="text-[11px] text-gray-400">{itemName} — <span className="font-mono">{itemCode}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2 p-3 bg-gray-50 border-b">
          <div className="bg-white rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-gray-800">{qty}</p>
            <p className="text-[10px] text-gray-400">الرصيد</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-green-600">{stats.totalIn}</p>
            <p className="text-[10px] text-gray-400">وارد</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-red-600">{stats.totalOut}</p>
            <p className="text-[10px] text-gray-400">صادر</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-orange-600">{stats.totalReserve}</p>
            <p className="text-[10px] text-gray-400">محجوز</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-gray-600">{stats.count}</p>
            <p className="text-[10px] text-gray-400">حركات</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-1 p-3 border-b overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`text-[11px] px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${filterType === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            الكل ({stats.count})
          </button>
          {(['in', 'out', 'reserve', 'release', 'adj', 'return'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-[11px] px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${filterType === t ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {typeLabels[t]} ({transactions.filter(tx => tx.type === t).length})
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <History className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">لا توجد حركات مسجلة</p>
              <p className="text-[11px] text-gray-300 mt-1">ستظهر هنا حركات المخزون لهذا الصنف</p>
            </div>
          ) : (
            filtered.map(tx => {
              const tc = typeColors[tx.type] || typeColors.adj;
              const Icon = tc.icon;
              return (
                <div key={tx.id} className="bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${tc.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-4 h-4 ${tc.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${tc.bg} ${tc.text} font-medium`}>
                            {typeLabels[tx.type] || tx.type}
                          </span>
                          <span className="text-xs font-bold text-gray-800">{tx.qty > 0 ? `${tx.qty > 0 && tx.type !== 'adj' ? '+' : ''}${tx.qty}` : tx.qty}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {tx.date}
                        </span>
                      </div>
                      {tx.reason && (
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-gray-300" />
                          {tx.reason}
                        </p>
                      )}
                      {(tx.beforeQty !== undefined && tx.afterQty !== undefined) && (
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                          قبل: {tx.beforeQty} → بعد: {tx.afterQty}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {tx.userName && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <User className="w-3 h-3" />
                            {tx.userName}
                          </span>
                        )}
                        {tx.refName && (
                          <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                            <Package className="w-3 h-3" />
                            {tx.refName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
