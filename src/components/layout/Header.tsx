import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePermissionStore } from '@/store/permissionStore';
import { useDataStore } from '@/store/dataStore';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, ChevronDown, LogOut, User, Settings, Shield,
  LayoutDashboard, X, CheckCheck, AlertTriangle, Menu,
} from 'lucide-react';

interface HeaderProps { onMenuToggle?: () => void; }

export default function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { getRoleName } = usePermissionStore();
  const { settings, getLowStockParts } = useDataStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
    if (favicon && settings.companyLogo) favicon.href = settings.companyLogo;
    if (settings.companyName) document.title = settings.companyName;
  }, [settings.companyLogo, settings.companyName]);

  const lowStock = getLowStockParts();
  const handleLogout = async () => { await logout(); navigate('/login'); };
  const isHome = location.pathname === '/' || location.pathname === '/dashboard';

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 md:px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3 flex-1">
        {/* Menu button - ALWAYS visible on mobile */}
        {onMenuToggle && (
          <button onClick={onMenuToggle} className="md:hidden p-2 -mr-1 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
        )}
        {settings.companyLogo ? (
          <img src={settings.companyLogo} alt="" className="w-9 h-9 rounded-lg object-contain hidden md:block" />
        ) : (
          <div className="w-9 h-9 rounded-lg hidden md:flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-[#667eea] to-[#764ba2]">
            {settings.companyName?.charAt(0) || 'M'}
          </div>
        )}
        <div className="hidden md:block">
          <p className="text-sm font-bold text-gray-800">{settings.companyName || 'نظام الإنتاج'}</p>
          <p className="text-[10px] text-gray-400">{settings.companyWebsite || 'v9.8 Cloud'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isHome && (
          <button onClick={() => navigate('/dashboard')} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#667eea] to-[#764ba2]">
            <LayoutDashboard className="w-4 h-4" /> الرئيسية
          </button>
        )}

        <div className="relative">
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 hover:bg-gray-100 rounded-xl">
            <Bell className="w-5 h-5 text-gray-500" />
            {lowStock.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute left-0 md:left-auto md:right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50">
                  <p className="text-xs font-bold flex items-center gap-2"><Bell className="w-4 h-4 text-blue-500" /> الإشعارات</p>
                  <button onClick={() => setNotifOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-3.5 h-3.5 text-gray-400" /></button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {lowStock.length === 0 ? (
                    <div className="px-4 py-6 text-center"><CheckCheck className="w-6 h-6 text-green-400 mx-auto mb-2" /><p className="text-xs text-gray-400">لا توجد إشعارات</p></div>
                  ) : (
                    <>
                      <div className="px-3 py-1.5 bg-amber-50"><p className="text-[10px] font-bold text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> مخزون منخفض</p></div>
                      {lowStock.slice(0, 5).map(item => (
                        <div key={item.id} className="px-4 py-2 border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => { setNotifOpen(false); navigate('/parts'); }}>
                          <p className="text-xs font-medium">{item.name}</p>
                          <p className="text-[10px] text-red-500">رصيد: {item.qty} / الحد: {item.min}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-gray-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="text-right hidden md:block">
              <p className="text-[11px] font-bold text-gray-800">{user?.name || 'مستخدم'}</p>
              <p className="text-[10px] text-blue-500">{getRoleName(user?.role || '')}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 md:left-auto md:right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-50">
                  <p className="text-xs font-bold text-gray-800">{user?.name}</p>
                  <p className="text-[10px] text-gray-400">{user?.email}</p>
                </div>
                <button onClick={() => { setMenuOpen(false); navigate('/profile'); }} className="w-full text-right px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"><User className="w-3.5 h-3.5" /> الملف الشخصي</button>
                <button onClick={() => { setMenuOpen(false); navigate('/settings'); }} className="w-full text-right px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"><Settings className="w-3.5 h-3.5" /> الإعدادات</button>
                {user?.role === 'admin' && <button onClick={() => { setMenuOpen(false); navigate('/users'); }} className="w-full text-right px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> المستخدمين</button>}
                <div className="border-t border-gray-50 mt-1 pt-1">
                  <button onClick={handleLogout} className="w-full text-right px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut className="w-3.5 h-3.5" /> تسجيل الخروج</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
