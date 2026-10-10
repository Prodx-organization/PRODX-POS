import React, { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

type AdminRole = 'owner' | 'admin' | 'manager' | 'cashier';

export function AdminPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    const loadRole = async (userId: string) => {
      setRoleLoading(true);
      const { data, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!alive) return;
      setRole(roleError ? null : (data?.role as AdminRole | null) ?? null);
      if (roleError) setError('Could not verify your administrator role. Please try again.');
      setRoleLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      setError('');
      if (nextSession?.user.id) {
        queueMicrotask(() => { void loadRole(nextSession.user.id); });
      } else {
        setRole(null);
        setRoleLoading(false);
      }
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError('Could not restore your session. Please sign in again.');
      setSession(data.session);
      if (data.session?.user.id) void loadRole(data.session.user.id);
      else setBusy(false);
    }).finally(() => {
      if (alive) setBusy(false);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      setPassword('');
    } catch {
      setError('Sign-in failed. Check your credentials or contact your organization owner.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError('Sign-out could not be confirmed. Please retry.');
    setBusy(false);
  };

  const canAdminister = role === 'owner' || role === 'admin';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400">PRODX · Control Plane</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Owner & Admin</h1>
          <p className="mt-2 text-sm text-slate-400">แยกการจัดการระบบออกจากเครื่องขาย POS</p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          {busy && <p role="status" className="text-sm text-slate-300">กำลังตรวจสอบเซสชัน…</p>}

          {!busy && !session && (
            <form onSubmit={signIn} className="space-y-4">
              <h2 className="text-lg font-bold">Sign in to administration</h2>
              <label className="block text-sm font-medium">
                Email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-orange-400"
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-orange-400"
                />
              </label>
              <button disabled={busy} className="h-11 w-full rounded-lg bg-orange-500 font-bold text-slate-950 hover:bg-orange-400 disabled:opacity-60">
                Sign in
              </button>
              <p className="text-xs text-slate-400">Admin accounts must be provisioned by an authorized owner. Public sign-up is not available here.</p>
            </form>
          )}

          {!busy && session && roleLoading && (
            <p role="status" className="text-sm text-slate-300">กำลังตรวจสอบสิทธิ์จากฐานข้อมูล…</p>
          )}

          {!busy && session && !roleLoading && canAdminister && (
            <div className="space-y-4">
              <p className="text-sm text-emerald-300">ยืนยันตัวตนแล้ว และพบสิทธิ์ {role}</p>
              <p className="text-sm text-slate-300">Signed in as <span className="font-semibold text-white">{session.user.email}</span></p>
              <p className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
                Admin authentication is active. Privileged business operations must still enforce role and tenant authorization on the server.
              </p>
              <button onClick={() => { void signOut(); }} disabled={busy} className="h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60">
                Sign out
              </button>
            </div>
          )}

          {!busy && session && !roleLoading && !canAdminister && (
            <div className="space-y-4">
              <h2 className="font-bold text-rose-300">Access denied</h2>
              <p className="text-sm text-slate-300">บัญชีนี้ไม่มี role owner/admin จึงไม่สามารถเข้า Control Plane ได้</p>
              <button onClick={() => { void signOut(); }} disabled={busy} className="h-10 rounded-lg border border-slate-700 px-4 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60">
                Sign out
              </button>
            </div>
          )}

          {error && <p role="alert" className="mt-4 rounded-lg border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p>}
        </section>
        <p className="mt-5 text-xs leading-5 text-slate-500">
          Security note: this client-side route is a UI boundary, not a substitute for server-side authorization or database RLS.
        </p>
      </div>
    </main>
  );
}
