import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';
import BarcodeSearch from '@/components/BarcodeSearch';
import {
  LayoutDashboard, Cog, Square, Layers, Box, Building2,
  Warehouse, Truck, Package, RefreshCw, Ship,
  FileBarChart, BarChart3, Users, Shield,
  Settings, User, ChevronRight, X,
  Camera, FileSpreadsheet, ClipboardCheck, Wrench,
  StickyNote, TrendingUp,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Cog, Square, Layers, Box, Building2,
  Warehouse, Truck, Package, RefreshCw, Ship,
  FileBarChart, BarChart3, Users, Shield,
  Settings, User, Camera, FileSpreadsheet, ClipboardCheck, Wrench,
  StickyNote, TrendingUp,
};

interface NavItem { id: string; label: string; icon: string; perm: string; }
interface NavSection { category: string; items: NavItem[]; }

interface SidebarProps {
  navItems: NavSection[];
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ navItems, mobileOpen, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const handleClick = (id: string) => { navigate(`/${id}`); onMobileClose(); };
  const isActive = (id: string) => location.pathname === `/${id}`;

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/25 z-[55] md:hidden" onClick={onMobileClose} />}

      <aside className={`fixed top-0 right-0 h-full w-[220px] z-[56] flex flex-col bg-[#3a3f4b] transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <button onClick={onMobileClose} className="md:hidden absolute top-3 left-3 p-2 rounded-full bg-white/10 text-white/50">
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-[#667eea] to-[#764ba2]">
              M
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">نظام الإنتاج</p>
              <p className="text-[10px] text-white/40">v9.8 Cloud</p>
            </div>
          </div>
        </div>

        {/* Barcode Search */}
        <BarcodeSearch />

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(section => (
            <div key={section.category} className="mb-2">
              <p className="text-[10px] font-bold text-white/30 px-3 py-1.5 tracking-wider">{section.category}</p>
              {section.items.map(item => {
                const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                const active = isActive(item.id);
                return (
                  <button key={item.id} onClick={() => handleClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all ${active ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md' : 'text-white/60 hover:bg-white/10'}`}>
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-right">{item.label}</span>
                    {active && <ChevronRight className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => handleClick('profile')}
            className="flex items-center gap-3 w-full text-right hover:bg-white/5 rounded-xl p-2 -m-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/20">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{user?.name || 'مستخدم'}</p>
              <p className="text-[10px] text-white/40">{user?.role === 'admin' ? 'مدير النظام' : user?.role}</p>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
