import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usePermissionStore } from '@/store/permissionStore';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout() {
  const { user, isLoggedIn, isLoading } = useAuthStore();
  const { canView, NAV_STRUCTURE } = usePermissionStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Wait for auth check before deciding
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0c1222 0%, #0f172a 40%, #1a1f3a 100%)' }}>
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn || !user) return <Navigate to="/login" replace />;

  const navItems = NAV_STRUCTURE.map(section => ({
    category: section.category,
    items: section.items.filter(item => canView(user.role, item.perm)),
  })).filter(section => section.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar navItems={navItems} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col mr-0 md:mr-[220px]">
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
