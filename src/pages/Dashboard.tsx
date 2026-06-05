import { useNavigate } from 'react-router-dom';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { usePermissionStore } from '@/store/permissionStore';
import {
  Building2, Package, AlertTriangle, XCircle, CheckCircle2,
  ArrowDownLeft, ArrowUpRight, BarChart3, Clock,
  Cog, Square, Layers, Box, Truck, Ship,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getRoleName } = usePermissionStore();
  const { parts, products, projects, batches, containers, boxes, movements, rejected, getLowStockParts, settings, tops, accessories } = useDataStore();
  const lowStock = getLowStockParts();

  const totalIn = movements.filter(m => m.type === 'in' || m.type === 'return').reduce((s, m) => s + m.qty, 0);
  const totalOut = movements.filter(m => m.type === 'out').reduce((s, m) => s + m.qty, 0);
  const activeProjects = projects.filter(p => batches.some(b => b.projectId === p.id));
  const activeBatches = batches.filter(b => b.status !== 'تم');
  const pendingBatches = batches.filter(b => b.status === 'جديد');
  const recentRejected = rejected.filter(r => {
    const d = new Date(r.createdAt || r.date);
    return (Date.now() - d.getTime()) < 30 * 24 * 3600 * 1000;
  });

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Welcome */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {settings.companyLogo ? (
            <img src={settings.companyLogo} alt="" className="w-12 h-12 rounded-2xl object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold bg-gradient-to-br from-[#667eea] to-[#764ba2]">
              {settings.companyName?.charAt(0) || 'M'}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-800">أهلاً {user?.name?.split(' ')[0] || ''} 👋</h1>
            <p className="text-xs text-gray-400">{getRoleName(user?.role || '')} • {new Date().toLocaleDateString('ar-SA')}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => navigate('/projects')} className="bg-white rounded-2xl p-4 shadow-sm text-left">
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center mb-2">
            <Building2 className="w-5 h-5 text-pink-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{activeProjects.length}</p>
          <p className="text-xs text-gray-400">المشاريع الفعالة</p>
        </button>
        <button onClick={() => navigate('/batches')} className="bg-white rounded-2xl p-4 shadow-sm text-left">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-2">
            <Package className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{activeBatches.length}</p>
          <p className="text-xs text-gray-400">الدفعات النشطة</p>
        </button>
        <button onClick={() => navigate('/parts')} className="bg-white rounded-2xl p-4 shadow-sm text-left">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-2">
            <Cog className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{parts.length}</p>
          <p className="text-xs text-gray-400">القطع</p>
        </button>
        <button onClick={() => navigate('/shipments')} className="bg-white rounded-2xl p-4 shadow-sm text-left">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-2">
            <Ship className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{boxes.length}</p>
          <p className="text-xs text-gray-400">الشحنات</p>
        </button>
      </div>

      {/* Shortages + Rejected */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button onClick={() => navigate('/parts')} className="bg-white rounded-2xl p-4 shadow-sm text-left" style={{ background: lowStock.length > 0 ? '#fef2f2' : '#f0fdf4' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: lowStock.length > 0 ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'linear-gradient(135deg, #22c55e, #4ade80)' }}>
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">النواقص</p>
              <p className="text-xs text-gray-400">{lowStock.length} قطعة</p>
            </div>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> لا يوجد نواقص</p>
          ) : (
            <div className="space-y-1">
              {lowStock.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span>{p.name}</span>
                  <span className="font-bold text-red-500">{p.qty} / {p.min}</span>
                </div>
              ))}
            </div>
          )}
        </button>

        <button onClick={() => navigate('/quality')} className="bg-white rounded-2xl p-4 shadow-sm text-left" style={{ background: '#fff7ed' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">المرفوضات</p>
              <p className="text-xs text-gray-400">{recentRejected.length} خلال 30 يوم</p>
            </div>
          </div>
        </button>
      </div>

      {/* Stock Movement */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center"><ArrowDownLeft className="w-5 h-5 text-white" /></div>
          <div><p className="text-xl font-bold">{totalIn}</p><p className="text-xs text-gray-400">وارد</p></div>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center"><ArrowUpRight className="w-5 h-5 text-white" /></div>
          <div><p className="text-xl font-bold">{totalOut}</p><p className="text-xs text-gray-400">صادر</p></div>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-white" /></div>
          <div><p className="text-xl font-bold">{totalIn - totalOut}</p><p className="text-xs text-gray-400">الصافي</p></div>
        </div>
      </div>

      {/* General Stats */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-400" />
          <h3 className="text-xs font-bold text-gray-500">إحصائيات عامة</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Cog, value: parts.length, label: 'القطع', color: '#3b82f6', bg: '#eff6ff' },
            { icon: Square, value: tops.length, label: 'التوبات', color: '#14b8a6', bg: '#f0fdfa' },
            { icon: Layers, value: accessories.length, label: 'اكسسوارات', color: '#8b5cf6', bg: '#f5f3ff' },
            { icon: Box, value: products.length, label: 'منتجات', color: '#22c55e', bg: '#f0fdf4' },
            { icon: Building2, value: projects.length, label: 'مشاريع', color: '#f59e0b', bg: '#fffbeb' },
            { icon: Package, value: batches.length, label: 'دفعات', color: '#06b6d4', bg: '#ecfeff' },
            { icon: Ship, value: boxes.length, label: 'شحنات', color: '#f97316', bg: '#fff7ed' },
            { icon: Truck, value: containers.length, label: 'كونتينر', color: '#ec4899', bg: '#fdf2f8' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center p-2 rounded-xl" style={{ background: s.bg }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1" style={{ background: s.color }}>
                <s.icon className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-sm font-bold">{s.value}</p>
              <p className="text-[10px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
