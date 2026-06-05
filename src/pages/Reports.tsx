import { useState, useMemo, useRef } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Cog, Square, Layers, Box, Building2, Warehouse, XCircle, CheckCircle, AlertTriangle, FileSpreadsheet, ArrowLeft, Printer, ShieldAlert, ImageIcon, ZoomIn, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';

export default function Reports() {
  const navigate = useNavigate();
  const { parts, tops, accessories, products, projects, batches, containers, pallets, boxes, movements, rejected, inspections, settings } = useDataStore();
  const [tab, setTab] = useState('overview');
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const rejectedPrintRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => ({
    totalParts: parts.length, totalTops: tops.length, totalAcc: accessories.length, totalProds: products.length,
    totalProjects: projects.length, totalBatches: batches.length, totalContainers: containers.length,
    totalPallets: pallets.length, totalBoxes: boxes.length, totalMovements: movements.length,
    totalRejected: rejected.length, totalInspections: inspections.length,
    lowStock: parts.filter(p => p.qty <= p.min && p.min > 0).length,
    resolvedRejected: rejected.filter(r => r.status === 'resolved').length,
    passedInspections: inspections.filter(i => i.status === 'pass').length,
    totalIn: movements.filter(m => m.type === 'in' || m.type === 'return').reduce((s, m) => s + m.qty, 0),
    totalOut: movements.filter(m => m.type === 'out').reduce((s, m) => s + m.qty, 0),
  }), [parts, tops, accessories, products, projects, batches, containers, pallets, boxes, movements, rejected, inspections]);

  const cards = [
    { label: 'القطع', value: stats.totalParts, icon: Cog, color: 'from-blue-500 to-blue-600' },
    { label: 'التوبات', value: stats.totalTops, icon: Square, color: 'from-teal-500 to-teal-600' },
    { label: 'الاكسسوارات', value: stats.totalAcc, icon: Layers, color: 'from-purple-500 to-purple-600' },
    { label: 'المنتجات', value: stats.totalProds, icon: Box, color: 'from-green-500 to-green-600' },
    { label: 'المشاريع', value: stats.totalProjects, icon: Building2, color: 'from-amber-500 to-amber-600' },
    { label: 'الدفعات', value: stats.totalBatches, icon: Box, color: 'from-cyan-500 to-cyan-600' },
    { label: 'الكونتينرات', value: stats.totalContainers, icon: Box, color: 'from-blue-600 to-blue-700' },
    { label: 'البالتات', value: stats.totalPallets, icon: Warehouse, color: 'from-green-600 to-green-700' },
    { label: 'الصناديق', value: stats.totalBoxes, icon: Box, color: 'from-orange-500 to-orange-600' },
    { label: 'الحركات', value: stats.totalMovements, icon: Box, color: 'from-pink-500 to-pink-600' },
  ];

  // ─── Export Rejected to Excel ───
  const exportRejectedExcel = () => {
    if (rejected.length === 0) return;
    const rows = rejected.map((r, i) => ({
      '#': i + 1,
      'القطعة': r.partName,
      'الكود': r.partCode,
      'المصدر': r.sourceType === 'warehouse' ? 'مستودع' : 'دفعة',
      'رقم الشحنة / الدفعة': r.shipmentNo || r.batchName || '-',
      'المشروع': r.projectName || '-',
      'الكمية': r.qty,
      'التاريخ': r.date,
      'السبب': r.reason,
      'الحالة': r.status === 'rejected' ? 'مرفوض' : 'محلول',
      'طلب استبدال': r.replacementStatus === 'requested' ? 'تم الطلب' : r.replacementStatus === 'replaced' ? 'تم الاستبدال' : '-',
      'المسجل': r.userName,
      'ملاحظات': r.notes || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rejected Items');
    XLSX.writeFile(wb, `rejected-items-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ─── Print Rejected ───
  const printRejected = () => {
    if (!rejectedPrintRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
      <head><title>تقرير القطع المرفوضة</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 9px; direction: rtl; }
          .header { text-align: center; margin-bottom: 15px; }
          .header h1 { font-size: 16px; margin: 0; }
          .header p { font-size: 10px; color: #666; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #333; padding: 4px 6px; text-align: center; }
          th { background: #e0e0e0; font-weight: bold; }
          .status-rejected { background: #fee; color: #c00; }
          .status-resolved { background: #efe; color: #080; }
          .source-warehouse { color: #b45309; }
          .source-batch { color: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>تقرير القطع المرفوضة</h1>
          <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
        </div>
        ${rejectedPrintRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Quick Access Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button onClick={() => navigate('/packing-list-report')} className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><FileSpreadsheet className="w-6 h-6" /></div>
          <div className="flex-1 text-right">
            <h3 className="font-bold text-base">تقرير باكنج ليست</h3>
            <p className="text-xs opacity-80">عرض وتصدير قوائم التعبئة من الكونتينرات</p>
          </div>
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <button onClick={() => setTab('rejected')} className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><ShieldAlert className="w-6 h-6" /></div>
          <div className="flex-1 text-right">
            <h3 className="font-bold text-base">تقرير القطع المرفوضة</h3>
            <p className="text-xs opacity-80">عرض وطباعة وتصدير القطع المرفوضة</p>
          </div>
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
      </div>

      <Tabs value={tab} onValueChange={setTab} dir="rtl">
        <TabsList className="bg-white border">
          <TabsTrigger value="overview" className="text-xs gap-1"><BarChart3 className="w-3.5 h-3.5" /> نظرة عامة</TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs gap-1"><XCircle className="w-3.5 h-3.5" /> القطع المرفوضة</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-white" /></div><div><h3 className="font-bold text-sm">نظرة عامة</h3><p className="text-[10px] text-gray-400">إحصائيات شاملة لجميع أقسام النظام</p></div></div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {cards.map(c => { const Icon = c.icon; return (<div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-xl p-4 text-white shadow-lg`}><Icon className="w-5 h-5 mb-2 opacity-80" /><p className="text-2xl font-bold">{c.value}</p><p className="text-[10px] opacity-80">{c.label}</p></div>); })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-amber-500" /><h4 className="text-sm font-bold">مخزون منخفض</h4></div><p className="text-3xl font-bold text-amber-600">{stats.lowStock}</p><p className="text-xs text-gray-400">قطع تحت الحد الأدنى</p></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-2 mb-3"><XCircle className="w-4 h-4 text-red-500" /><h4 className="text-sm font-bold">قطع مرفوضة</h4></div><p className="text-3xl font-bold text-red-600">{stats.totalRejected}</p><p className="text-xs text-gray-400">{stats.resolvedRejected} محلول منها</p></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="flex items-center gap-2 mb-3"><CheckCircle className="w-4 h-4 text-green-500" /><h4 className="text-sm font-bold">فحوصات ناجحة</h4></div><p className="text-3xl font-bold text-green-600">{stats.passedInspections} / {stats.totalInspections}</p><p className="text-xs text-gray-400">نسبة النجاح: {stats.totalInspections ? Math.round((stats.passedInspections / stats.totalInspections) * 100) : 0}%</p></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h4 className="text-sm font-bold mb-3">الحركات المخزنية</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg"><p className="text-2xl font-bold text-green-700">{stats.totalIn}</p><p className="text-[10px] text-green-600">إجمالي الوارد</p></div>
              <div className="text-center p-3 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-700">{stats.totalOut}</p><p className="text-[10px] text-red-600">إجمالي الصادر</p></div>
              <div className="text-center p-3 bg-blue-50 rounded-lg"><p className="text-2xl font-bold text-blue-700">{stats.totalIn - stats.totalOut}</p><p className="text-[10px] text-blue-600">الرصيد الصافي</p></div>
            </div>
          </div>
        </TabsContent>

        {/* REJECTED ITEMS REPORT TAB */}
        <TabsContent value="rejected" className="mt-4 space-y-4">
          {/* Header + Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <div>
                  <h3 className="text-sm font-bold">تقرير القطع المرفوضة</h3>
                  <p className="text-[10px] text-gray-400">{rejected.length} قطعة مرفوضة • {stats.resolvedRejected} محلول • {rejected.filter(r => r.replacementStatus === 'requested').length} بانتظار استبدال</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={printRejected} disabled={rejected.length === 0} className="gap-1"><Printer className="w-3.5 h-3.5" /> طباعة</Button>
                <Button size="sm" onClick={exportRejectedExcel} disabled={rejected.length === 0} className="gap-1 bg-gradient-to-r from-green-500 to-green-600"><FileSpreadsheet className="w-3.5 h-3.5" /> تصدير Excel</Button>
              </div>
            </div>
          </div>

          {/* Rejected Items Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div ref={rejectedPrintRef} className="p-4">
              {/* Print Header */}
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
                    <p className="text-lg font-bold">{settings.companyName || 'شركة الإنتاج'}</p>
                    {settings.companyPhone && <p className="text-[10px] text-gray-500">{settings.companyPhone}</p>}
                  </div>
                </div>
                <h2 className="text-lg font-bold border-b pb-2 mb-2">تقرير القطع المرفوضة</h2>
                <p className="text-xs text-gray-500">تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')}</p>
              </div>

              {rejected.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm">لا توجد قطع مرفوضة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2 border text-center w-6">#</th>
                        <th className="p-2 border text-center w-12">الصورة</th>
                        <th className="p-2 border text-right">القطعة</th>
                        <th className="p-2 border text-center w-20">الكود</th>
                        <th className="p-2 border text-center w-16">المصدر</th>
                        <th className="p-2 border text-center w-20">الشحنة/الدفعة</th>
                        <th className="p-2 border text-center w-8">الكمية</th>
                        <th className="p-2 border text-center w-16">التاريخ</th>
                        <th className="p-2 border text-right">السبب</th>
                        <th className="p-2 border text-center w-12">الحالة</th>
                        <th className="p-2 border text-center w-14">الاستبدال</th>
                        <th className="p-2 border text-center w-14">المسجل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejected.map((r, i) => (
                        <tr key={r.id} className="border-b hover:bg-red-50/10">
                          <td className="p-2 border text-center text-gray-500">{i + 1}</td>
                          <td className="p-2 border text-center">
                            {r.img ? (
                              <button onClick={() => setZoomImg(r.img || '')} className="relative group">
                                <img src={r.img} alt="" className="w-8 h-8 rounded object-cover border" />
                                <div className="absolute inset-0 bg-black/20 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ZoomIn className="w-2.5 h-2.5 text-white" /></div>
                              </button>
                            ) : (<span className="text-gray-300">—</span>)}
                          </td>
                          <td className="p-2 border text-right font-medium">{r.partName}</td>
                          <td className="p-2 border text-center font-mono text-red-600">{r.partCode}</td>
                          <td className="p-2 border text-center">
                            {r.sourceType === 'warehouse' ? (
                              <span className="text-amber-600">مستودع</span>
                            ) : (
                              <span className="text-blue-600">دفعة</span>
                            )}
                          </td>
                          <td className="p-2 border text-center">{r.shipmentNo || r.batchName || '-'}</td>
                          <td className="p-2 border text-center font-bold">{r.qty}</td>
                          <td className="p-2 border text-center">{r.date}</td>
                          <td className="p-2 border text-right">{r.reason}</td>
                          <td className="p-2 border text-center">
                            {r.status === 'rejected' ? (
                              <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">مرفوض</span>
                            ) : (
                              <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">محلول</span>
                            )}
                          </td>
                          <td className="p-2 border text-center">
                            {r.replacementStatus === 'requested' ? <span className="text-[9px] text-amber-600">تم الطلب</span> :
                             r.replacementStatus === 'replaced' ? <span className="text-[9px] text-green-600">تم الاستبدال</span> :
                             r.replacementStatus === 'pending' ? <span className="text-[9px] text-gray-400">معلق</span> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="p-2 border text-center text-gray-500">{r.userName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Zoom Image Dialog */}
      <Dialog open={!!zoomImg} onOpenChange={() => setZoomImg(null)}>
        <DialogContent className="max-w-3xl max-h-[95dvh] p-2" dir="rtl">
          {zoomImg && (
            <div className="relative">
              <img src={zoomImg} alt="" className="w-full h-auto max-h-[80dvh] object-contain rounded-lg" />
              <button onClick={() => setZoomImg(null)} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
