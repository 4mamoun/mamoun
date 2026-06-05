// ============================================================
// تقرير باكنج ليست — Packing List Report
// عرض + تصدير Excel + طباعة
// ============================================================

import { useState, useMemo, useRef } from 'react';
import { useDataStore } from '@/store/dataStore';
import type { Box, PickListItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileSpreadsheet, Printer, Package, Search, X, FileText, ArrowRight, Building2, Layers, Truck } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PackingListRow {
  serial: number;
  boxNum: string;
  productCode: string;
  description: string;
  dimensions: string;   // L×W×H
  color: string;
  qty: number;
  coverSize: string;
  partsWeight: number;
  coverWeight: number;
  boxWeight: number;
  cartonWeight: number;
  totalWeight: number;
}

function today() { return new Date().toISOString().split('T')[0]; }

export default function PackingListReport() {
  const { boxes, batches, containers, projects, parts, accessories, tops, settings } = useDataStore();
  const [selectedContainerId, setSelectedContainerId] = useState('');
  const [search, setSearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Filter containers that have boxes with items
  const availableContainers = useMemo(() => {
    return containers
      .filter(c => c.boxes.length > 0)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [containers]);

  const selectedContainer = containers.find(c => c.id === selectedContainerId);

  // Get boxes in this container
  const containerBoxes = useMemo(() => {
    if (!selectedContainer) return [];
    return boxes
      .filter(b => selectedContainer.boxes.includes(b.id) && (b.pickItems?.length || 0) > 0)
      .sort((a, b) => a.num.localeCompare(b.num));
  }, [boxes, selectedContainer]);

  // Get batch info from the first box
  const batchInfo = useMemo(() => {
    const firstBox = containerBoxes[0];
    if (!firstBox?.batchId) return null;
    return batches.find(b => b.id === firstBox.batchId);
  }, [containerBoxes, batches]);

  const projectInfo = useMemo(() => {
    if (!batchInfo?.projectId) return null;
    return projects.find(p => p.id === batchInfo.projectId);
  }, [batchInfo, projects]);

  // Generate packing list rows
  const packingRows: PackingListRow[] = useMemo(() => {
    const rows: PackingListRow[] = [];
    let serial = 1;

    for (const box of containerBoxes) {
      const boxItems = box.pickItems || [];
      const boxEmptyWeight = Number(box.wgt) || 0;
      const itemCount = boxItems.length || 1;
      const boxWeightPerItem = boxEmptyWeight / itemCount;
      const cartonWeightPerItem = calcCartonWeight(box) / itemCount;

      for (const item of boxItems) {
        const qty = item.assignedQty || item.qty || 1;
        const dims = formatDimensions(item);
        const coverSize = getCoverSize(item, tops);
        const color = getItemColor(item, parts, accessories, tops);

        // Weight calculations
        const partsWeight = item.type === 'part' ? (item.weight || 0) * qty : 0;
        const coverWeight = item.type === 'top' ? (item.weight || 0) * qty : 0;
        const accWeight = item.type === 'accessory' ? (item.weight || 0) * qty : 0;

        // For parts: partsWeight has the value, for tops: coverWeight has the value
        // Accessories weight goes to partsWeight
        const finalPartsWeight = partsWeight + accWeight;

        rows.push({
          serial: serial++,
          boxNum: box.num,
          productCode: item.code,
          description: item.name,
          dimensions: dims,
          color,
          qty,
          coverSize,
          partsWeight: Math.round(finalPartsWeight * 100) / 100,
          coverWeight: Math.round(coverWeight * 100) / 100,
          boxWeight: Math.round(boxWeightPerItem * 100) / 100,
          cartonWeight: Math.round(cartonWeightPerItem * 100) / 100,
          totalWeight: Math.round((finalPartsWeight + coverWeight + boxWeightPerItem + cartonWeightPerItem) * 100) / 100,
        });
      }
    }

    // Apply search filter
    if (search.trim()) {
      const deb = search.toLowerCase();
      return rows.filter(r =>
        r.boxNum.toLowerCase().includes(deb) ||
        r.productCode.toLowerCase().includes(deb) ||
        r.description.toLowerCase().includes(deb)
      );
    }

    return rows;
  }, [containerBoxes, parts, accessories, tops, search]);

  // Totals
  const totals = useMemo(() => {
    return {
      qty: packingRows.reduce((s, r) => s + r.qty, 0),
      partsWeight: Math.round(packingRows.reduce((s, r) => s + r.partsWeight, 0) * 100) / 100,
      coverWeight: Math.round(packingRows.reduce((s, r) => s + r.coverWeight, 0) * 100) / 100,
      boxWeight: Math.round(packingRows.reduce((s, r) => s + r.boxWeight, 0) * 100) / 100,
      cartonWeight: Math.round(packingRows.reduce((s, r) => s + r.cartonWeight, 0) * 100) / 100,
      totalWeight: Math.round(packingRows.reduce((s, r) => s + r.totalWeight, 0) * 100) / 100,
    };
  }, [packingRows]);

  // Export to Excel
  const exportExcel = () => {
    if (packingRows.length === 0) return;

    // Header rows
    const headerRows = [
      ['قائمة التعبئة'],
      [''],
      ['رقم الفاتورة:', batchInfo?.invoiceNo || '-', '', 'التاريخ:', batchInfo?.deliveryDate || today()],
      ['وصف البضاعة:', batchInfo?.desc || projectInfo?.name || '-', '', 'رقم السيارة:', selectedContainer?.plateNumber || '-'],
      [''],
    ];

    // Column headers
    const colHeaders = ['#', 'بوكس', 'كود المنتج', 'وصف المنتج', 'الأبعاد (طول×عرض×عمق)', 'اللون', 'الكمية', 'قياس الغطاء', 'وزن القطع', 'وزن الغلاف', 'وزن الصندوق', 'وزن الكرتون', 'الإجمالي'];

    // Data rows
    const dataRows = packingRows.map(r => [
      r.serial, r.boxNum, r.productCode, r.description, r.dimensions, r.color, r.qty, r.coverSize, r.partsWeight, r.coverWeight, r.boxWeight, r.cartonWeight, r.totalWeight
    ]);

    // Totals row
    const totalsRow = ['', '', '', '', '', 'الإجمالي:', totals.qty, '', totals.partsWeight, totals.coverWeight, totals.boxWeight, totals.cartonWeight, totals.totalWeight];

    const allRows = [...headerRows, colHeaders, ...dataRows, totalsRow];

    const ws = XLSX.utils.aoa_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Packing List');
    XLSX.writeFile(wb, `packing-list-${selectedContainer?.number || 'report'}.xlsx`);
  };

  // Print
  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <title>قائمة التعبئة</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 10px; direction: rtl; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 18px; margin: 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; font-size: 11px; }
          .info-item { display: flex; gap: 5px; }
          .info-label { font-weight: bold; color: #555; }
          table { width: 100%; border-collapse: collapse; font-size: 9px; }
          th, td { border: 1px solid #333; padding: 4px 6px; text-align: center; }
          th { background: #e0e0e0; font-weight: bold; }
          .totals-row { font-weight: bold; background: #f5f5f5; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold">تقرير باكنج ليست</h2>
        </div>

        {/* Container Selection */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[250px]">
            <Truck className="w-4 h-4 text-gray-400" />
            <select
              value={selectedContainerId}
              onChange={e => setSelectedContainerId(e.target.value)}
              className="flex-1 text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
            >
              <option value="">اختر الكونتينر/الشحنة...</option>
              {availableContainers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.number} {c.driverName ? `- ${c.driverName}` : ''} ({c.boxes.length} صندوق)
                </option>
              ))}
            </select>
          </div>

          {selectedContainer && (
            <>
              <div className="flex gap-2">
                <Button size="sm" onClick={exportExcel} className="gap-1 bg-gradient-to-r from-green-500 to-green-600" disabled={packingRows.length === 0}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> تصدير Excel
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1" disabled={packingRows.length === 0}>
                  <Printer className="w-3.5 h-3.5" /> طباعة
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected Container Info */}
      {selectedContainer && batchInfo && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-blue-500 font-medium">رقم الفاتورة</p>
              <p className="font-bold text-gray-800">{batchInfo.invoiceNo || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-500 font-medium">التاريخ</p>
              <p className="font-bold text-gray-800">{batchInfo.deliveryDate || today()}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-500 font-medium">وصف البضاعة</p>
              <p className="font-bold text-gray-800">{batchInfo.desc || projectInfo?.name || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-500 font-medium">رقم السيارة</p>
              <p className="font-bold text-gray-800">{selectedContainer.plateNumber || '-'}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200/50 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-blue-500 font-medium">المشروع</p>
              <p className="font-medium text-gray-700">{projectInfo?.name || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-500 font-medium">الدفعة</p>
              <p className="font-medium text-gray-700">{batchInfo.name || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-500 font-medium">الكونتينر</p>
              <p className="font-medium text-gray-700">{selectedContainer.number}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {selectedContainer && (
        <div className="flex items-center gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <Search className="w-4 h-4 text-gray-400" />
          <Input placeholder="البحث في القائمة..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 text-sm" />
          {search && <button onClick={() => setSearch('')} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
      )}

      {/* Packing List Table */}
      {selectedContainer && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Preview / Print Area */}
          <div ref={printRef} className="p-4">
            {/* Print Header (hidden on screen) */}
            <div className="hidden print:block text-center mb-4">
              {/* Company Logo + Name */}
              <div className="flex items-center justify-center gap-3 mb-3">
                {settings.companyLogo ? (
                  <img src={settings.companyLogo} alt="" className="h-14 w-auto object-contain" />
                ) : (
                  <div className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                    {settings.companyName?.charAt(0) || 'M'}
                  </div>
                )}
                <div className="text-right">
                  <h1 className="text-lg font-bold">{settings.companyName || 'شركة الإنتاج'}</h1>
                  {settings.companyPhone && <p className="text-[10px] text-gray-500">{settings.companyPhone}</p>}
                  {settings.companyAddress && <p className="text-[9px] text-gray-400">{settings.companyAddress}</p>}
                </div>
              </div>
              <h2 className="text-lg font-bold border-b pb-2 mb-3">قائمة التعبئة</h2>
              <div className="grid grid-cols-2 gap-4 text-sm text-right">
                <div><span className="font-bold">رقم الفاتورة:</span> {batchInfo?.invoiceNo || '-'}</div>
                <div><span className="font-bold">التاريخ:</span> {batchInfo?.deliveryDate || today()}</div>
                <div><span className="font-bold">وصف البضاعة:</span> {batchInfo?.desc || projectInfo?.name || '-'}</div>
                <div><span className="font-bold">رقم السيارة:</span> {selectedContainer?.plateNumber || '-'}</div>
              </div>
            </div>

            {packingRows.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p className="text-sm">لا توجد بيانات للعرض</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-2 border text-center w-8">#</th>
                      <th className="p-2 border text-center w-16">بوكس</th>
                      <th className="p-2 border text-center w-20">كود المنتج</th>
                      <th className="p-2 border text-right min-w-[200px]">وصف المنتج</th>
                      <th className="p-2 border text-center w-24">الأبعاد</th>
                      <th className="p-2 border text-center w-16">اللون</th>
                      <th className="p-2 border text-center w-10">الكمية</th>
                      <th className="p-2 border text-center w-16">قياس الغطاء</th>
                      <th className="p-2 border text-center w-14">وزن القطع</th>
                      <th className="p-2 border text-center w-14">وزن الغلاف</th>
                      <th className="p-2 border text-center w-14">وزن الصندوق</th>
                      <th className="p-2 border text-center w-14">وزن الكرتون</th>
                      <th className="p-2 border text-center w-14 bg-blue-50">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packingRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 border-b">
                        <td className="p-2 border text-center text-gray-500">{row.serial}</td>
                        <td className="p-2 border text-center font-medium">{row.boxNum}</td>
                        <td className="p-2 border text-center font-mono text-blue-700">{row.productCode}</td>
                        <td className="p-2 border text-right">{row.description}</td>
                        <td className="p-2 border text-center font-mono">{row.dimensions}</td>
                        <td className="p-2 border text-center">{row.color}</td>
                        <td className="p-2 border text-center font-bold">{row.qty}</td>
                        <td className="p-2 border text-center font-mono">{row.coverSize}</td>
                        <td className="p-2 border text-center">{row.partsWeight > 0 ? row.partsWeight.toFixed(1) : '-'}</td>
                        <td className="p-2 border text-center">{row.coverWeight > 0 ? row.coverWeight.toFixed(1) : '-'}</td>
                        <td className="p-2 border text-center">{row.boxWeight > 0 ? row.boxWeight.toFixed(1) : '-'}</td>
                        <td className="p-2 border text-center">{row.cartonWeight > 0 ? row.cartonWeight.toFixed(1) : '-'}</td>
                        <td className="p-2 border text-center font-bold bg-blue-50/50">{row.totalWeight.toFixed(1)}</td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-gray-100 font-bold border-t-2">
                      <td className="p-2 border text-center" colSpan={6}>الإجمالي</td>
                      <td className="p-2 border text-center">{totals.qty}</td>
                      <td className="p-2 border text-center">-</td>
                      <td className="p-2 border text-center">{totals.partsWeight.toFixed(1)}</td>
                      <td className="p-2 border text-center">{totals.coverWeight.toFixed(1)}</td>
                      <td className="p-2 border text-center">{totals.boxWeight.toFixed(1)}</td>
                      <td className="p-2 border text-center">{totals.cartonWeight.toFixed(1)}</td>
                      <td className="p-2 border text-center bg-blue-100">{totals.totalWeight.toFixed(1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedContainer && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <Truck className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">اختر كونتينراً لعرض قائمة التعبئة</p>
          <p className="text-[10px] mt-1">يتم عرض الصناديق المعبأة داخل الكونتينر المختار</p>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───

function formatDimensions(item: PickListItem): string {
  if (!item.length && !item.width && !item.height) return '-';
  const l = item.length || 0;
  const w = item.width || 0;
  const h = item.height || 0;
  if (l === 0 && w === 0 && h === 0) return '-';
  return `${l}×${w}×${h}`;
}

function getCoverSize(item: PickListItem, tops: any[]): string {
  if (item.type !== 'top') return '-';
  const top = tops.find((t: any) => t.code === item.code);
  if (!top) return '-';
  return `${top.length || 0}×${top.width || 0}`;
}

function getItemColor(item: PickListItem, parts: any[], accessories: any[], tops: any[]): string {
  if (item.type === 'part') {
    const p = parts.find((x: any) => x.revit === item.code);
    return p?.color || p?.source === 'local' ? 'محلي' : 'مستورد';
  }
  if (item.type === 'accessory') {
    return 'عدة';
  }
  if (item.type === 'top') {
    const t = tops.find((x: any) => x.code === item.code);
    return t?.product === 'local' ? 'محلي' : 'مستورد';
  }
  return '-';
}

function calcCartonWeight(box: Box): number {
  // Estimate carton weight based on box dimensions or type
  if (box.type?.toLowerCase().includes('carton') || box.type?.toLowerCase().includes('كرتون')) {
    const vol = (box.boxLength || 0) * (box.boxWidth || 0) * (box.boxHeight || 0);
    if (vol > 0) return Math.round(vol * 0.0005 * 100) / 100; // ~0.5kg per cubic meter equivalent
    return 0.5;
  }
  return 0; // Non-carton boxes have no carton weight
}
