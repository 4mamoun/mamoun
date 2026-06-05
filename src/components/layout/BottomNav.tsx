import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Cog, Box, Building2,
  Warehouse, Bell, Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: '', icon: LayoutDashboard, labelAr: 'الرئيسية', labelEn: 'Home' },
  { id: 'projects', icon: Building2, labelAr: 'المشاريع', labelEn: 'Projects' },
  { id: 'parts', icon: Cog, labelAr: 'القطع', labelEn: 'Parts' },
  { id: 'warehouse', icon: Warehouse, labelAr: 'المستودع', labelEn: 'Warehouse' },
  { id: 'settings', icon: Settings, labelAr: 'المزيد', labelEn: 'More' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const isActive = (path: string) => {
    if (path === '') return location.pathname === '/' || location.pathname === '/dash';
    return location.pathname === `/${path}`;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Glassmorphism background */}
      <div className="glass-strong border-t border-white/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 pb-safe">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id ? `/${item.id}` : '/')}
                className={`flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-2xl transition-all ${
                  active
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : ''}`} />
                <span className={`text-[9px] font-medium ${active ? 'text-white' : ''}`}>
                  {isAr ? item.labelAr : item.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
