// ============================================================
// Login — Email/Password + Google Sign-In
// ============================================================

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, register, loginWithGoogle, isLoading, authError, clearError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');
    if (mode === 'login') {
      if (!email.trim()) { setLocalError('يرجى إدخال البريد الإلكتروني'); return; }
      if (!password) { setLocalError('يرجى إدخال كلمة المرور'); return; }
      await login(email, password);
    } else {
      if (!name.trim()) { setLocalError('يرجى إدخال الاسم'); return; }
      if (!email.trim()) { setLocalError('يرجى إدخال البريد الإلكتروني'); return; }
      if (!password || password.length < 6) { setLocalError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
      await register(email, password, name);
    }
  };

  const handleGoogle = async () => {
    clearError();
    await loginWithGoogle();
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
      {/* Decorative blobs */}
      <div className="absolute -bottom-[200px] -left-[140px] w-[520px] h-[520px] rounded-full blur-[130px]" style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.18) 0%, rgba(167,139,250,0.08) 50%, transparent 70%)' }} />
      <div className="absolute -bottom-[160px] -right-[120px] w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(125,211,252,0.14) 0%, rgba(56,189,248,0.06) 50%, transparent 70%)' }} />
      <div className="absolute -top-[140px] left-[5%] w-[380px] h-[380px] rounded-full blur-[110px]" style={{ background: 'radial-gradient(circle, rgba(253,230,138,0.12) 0%, rgba(251,191,36,0.05) 50%, transparent 70%)' }} />
      <div className="absolute -top-[100px] -right-[80px] w-[320px] h-[320px] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(153,246,228,0.10) 0%, rgba(94,234,212,0.04) 50%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-[360px] px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-500/20">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <p className="text-lg font-bold text-gray-800 tracking-tight">نظام إدارة الإنتاج والشحن</p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium">Production Management System v8.0</p>
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100/80 p-6">
          <p className="text-center text-xs font-bold text-gray-500 mb-4">{mode === 'login' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد'}</p>

          {/* Error */}
          {(authError || localError) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-700">{authError || localError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">الاسم الكامل</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="محمد أحمد" className="text-sm h-10" required />
              </div>
            )}
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-1 block">البريد الإلكتروني</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@company.com" className="text-sm h-10" required />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 mb-1 block">كلمة المرور</label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="text-sm h-10 pr-10" required minLength={6} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-10 bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#5558e0] hover:to-[#9644e0] text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/25 transition-all">
              {isLoading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري...</span>
              ) : mode === 'login' ? (
                <span className="flex items-center gap-2"><LogIn className="w-4 h-4" /> دخول</span>
              ) : (
                <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> إنشاء حساب</span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] text-gray-400">أو</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={isLoading}
            className="w-full h-10 flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google تسجيل الدخول بـ
          </button>

          {/* Toggle mode */}
          <p className="text-center text-[11px] text-gray-500 mt-4">
            {mode === 'login' ? (
              <>لا تملك حساب؟ <button onClick={() => { setMode('register'); clearError(); }} className="text-blue-600 font-bold hover:underline">سجل الآن</button></>
            ) : (
              <>تملك حساباً؟ <button onClick={() => { setMode('login'); clearError(); }} className="text-blue-600 font-bold hover:underline">تسجيل الدخول</button></>
            )}
          </p>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4">v8.0 Cloud Edition</p>
      </div>
    </div>
  );
}
