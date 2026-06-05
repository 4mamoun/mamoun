// ============================================================
// Pending Approval — شاشة انتظار الموافقة
// ============================================================

import { useAuthStore } from '@/store/authStore';
import { Clock, Mail, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PendingApproval() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
      {/* Blobs */}
      <div className="absolute -bottom-[200px] -left-[140px] w-[520px] h-[520px] rounded-full blur-[130px]" style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.18) 0%, transparent 70%)' }} />
      <div className="absolute -bottom-[160px] -right-[120px] w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(125,211,252,0.14) 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-[400px] px-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>

          <h2 className="text-base font-bold text-gray-800 mb-2">حسابك بانتظار الموافقة</h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            تم إنشاء حسابك بنجاح. يرجى انتظار موافقة مدير النظام للوصول إلى البرنامج.
          </p>

          {/* User info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-right">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-gray-700">{user?.name || 'مستخدم'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">{user?.email || ''}</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-xs text-amber-600 font-medium">بانتظار الموافقة</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            className="gap-1 text-xs"
          >
            <LogOut className="w-3.5 h-3.5" /> تسجيل الخروج
          </Button>
        </div>
      </div>
    </div>
  );
}
