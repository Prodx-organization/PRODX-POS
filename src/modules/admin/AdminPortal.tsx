import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

type AdminRole = 'owner' | 'admin';

type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'denied'; email?: string }
  | { status: 'allowed'; session: Session; role: AdminRole };

const isAdminRole = (value: unknown): value is AdminRole =>
  value === 'owner' || value === 'admin';

export const AdminPortal: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const resolveSession = async (session: Session | null) => {
    if (!session) {
      setAuthState({ status: 'signed-out' });
      return;
    }

    // Never trust role metadata supplied by the browser. Resolve the role from
    // the RLS-protected database row for this authenticated user.
    const { data, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (roleError || !isAdminRole(data?.role)) {
      setAuthState({ status: 'denied', email: session.user.email });
      return;
    }

    setAuthState({ status: 'allowed', session, role: data.role });
  };

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) {
        setError('Unable to verify your session. Please sign in again.');
        setAuthState({ status: 'signed-out' });
        return;
      }
      void resolveSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        // Defer database access until the auth callback has returned.
        window.setTimeout(() => {
          if (mounted) void resolveSession(session);
        }, 0);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError || !data.session) {
        throw new Error('Sign-in failed. Check your email and password.');
      }
      await resolveSession(data.session);
      setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      setAuthState({ status: 'signed-out' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100svh] bg-[#07111f] px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[80svh] max-w-xl items-center justify-center">
        <section className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl font-black text-[#07111f]">P<span className="text-[#ff6b1a]">.</span></div>
            <div>
              <div className="text-xl font-black tracking-tight">PRODX <span className="text-[#ff6b1a]">ADMIN</span></div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Owner console · Protected access</div>
            </div>
          </div>

          {authState.status === 'loading' ? (
            <p className="text-sm text-slate-300" role="status">กำลังตรวจสอบเซสชัน…</p>
          ) : authState.status === 'signed-out' ? (
            <>
              <h1 className="text-2xl font-black">เข้าสู่ระบบผู้ดูแล</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">ใช้บัญชี Supabase Auth ที่ได้รับบทบาท Owner หรือ Admin เท่านั้น บัญชี POS เดิมยังใช้งานแยกตามปกติ</p>
              <form className="mt-7 space-y-4" onSubmit={signIn}>
                <label className="block text-sm font-semibold">อีเมล
                  <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none focus:border-[#ff6b1a]" />
                </label>
                <label className="block text-sm font-semibold">รหัสผ่าน
                  <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-white outline-none focus:border-[#ff6b1a]" />
                </label>
                {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
                <button disabled={busy} className="h-12 w-full rounded-xl bg-[#ff6b1a] px-4 font-bold text-white transition hover:bg-[#e85d0c] disabled:opacity-60">{busy ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบผู้ดูแล'}</button>
              </form>
            </>
          ) : authState.status === 'denied' ? (
            <>
              <h1 className="text-2xl font-black">ไม่มีสิทธิ์เข้าถึง</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">บัญชี {authState.email || 'นี้'} ไม่ได้ถูกกำหนดบทบาท Owner หรือ Admin ในฐานข้อมูล จึงไม่สามารถเปิดหน้าจัดการระบบได้</p>
              {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
              <button onClick={() => void signOut()} disabled={busy} className="mt-6 h-11 rounded-xl border border-white/15 px-4 font-semibold hover:bg-white/5">ออกจากระบบ</button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">✓</div>
                <div>
                  <h1 className="text-2xl font-black">ยืนยันตัวตนแล้ว</h1>
                  <p className="mt-1 text-sm text-slate-400">Signed in as {authState.session.user.email}</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Access role</div>
                <div className="mt-2 text-lg font-black text-[#ff8a45]">{authState.role.toUpperCase()}</div>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-400">Protected admin entry point is active. Management actions should be exposed only through backend endpoints that independently verify this session and the Owner/Admin role.</p>
              <button onClick={() => void signOut()} disabled={busy} className="mt-6 h-11 rounded-xl border border-white/15 px-4 font-semibold hover:bg-white/5">ออกจากระบบ</button>
            </>
          )}
          <div className="mt-8 border-t border-white/10 pt-5 text-xs text-slate-500">PRODX POS · Separate from the operator terminal · <a href="/" className="text-[#ff8a45] hover:underline">กลับหน้า POS</a></div>
        </section>
      </div>
    </main>
  );
};
