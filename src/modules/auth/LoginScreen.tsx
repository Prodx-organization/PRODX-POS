import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Lock,
  Monitor,
  ShieldCheck,
  Store,
  UserRound,
  Wifi,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

const STORAGE = {
  organization: 'prodx.terminal.organization',
  store: 'prodx.terminal.store',
  register: 'prodx.terminal.register',
} as const;

const readTerminalValue = (key: string, env?: string) => {
  if (typeof window === 'undefined') return env?.trim() ?? '';
  try { return window.localStorage.getItem(key)?.trim() || env?.trim() || ''; } catch { return env?.trim() ?? ''; }
};

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { addToast } = useToast();
  const isThai = language === 'th';

  const [organizationSlug, setOrganizationSlug] = useState(() =>
    readTerminalValue(STORAGE.organization, import.meta.env.VITE_PRODX_ORGANIZATION_SLUG),
  );
  const [storeCode, setStoreCode] = useState(() =>
    readTerminalValue(STORAGE.store, import.meta.env.VITE_PRODX_STORE_CODE),
  );
  const [registerId, setRegisterId] = useState(() =>
    readTerminalValue(STORAGE.register, import.meta.env.VITE_PRODX_REGISTER_ID),
  );
  const [identity, setIdentity] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(
    !organizationSlug || !storeCode || !registerId,
  );
  const [clock, setClock] = useState('');

  const copy = useMemo(
    () =>
      isThai
        ? {
            eyebrow: 'PRODX POS · OPERATOR CONSOLE',
            title: 'พร้อมเริ่มกะ',
            subtitle: 'เข้าสู่ระบบเพื่อเปิดเครื่องขายและเริ่มงานของคุณ',
            password: 'รหัสผ่าน',
            identity: 'รหัสพนักงานหรืออีเมล',
            identityPlaceholder: 'เช่น cashier@prodx.co',
            secretPassword: 'รหัสผ่าน',
            signIn: 'เข้าสู่ระบบ',
            signingIn: 'กำลังตรวจสอบสิทธิ์…',
            terminal: 'เครื่องขาย',
            ready: 'ข้อมูลครบถ้วน',
            setup: 'ต้องตั้งค่า',
            organization: 'องค์กร',
            store: 'สาขา',
            register: 'Register',
            edit: 'แก้ไข',
            done: 'เสร็จสิ้น',
            security: 'ต้องยืนยันสิทธิ์กับเซิร์ฟเวอร์',
            verified: 'Secure sign-in',
            serverNote: 'บัญชี · สาขา · เครื่องขาย จะถูกตรวจสอบก่อนเปิดเซสชัน',
            failed: 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง',
            required: 'กรุณากรอกข้อมูลให้ครบ',
            language: 'English',
          }
        : {
            eyebrow: 'PRODX POS · OPERATOR CONSOLE',
            title: 'Ready for your shift',
            subtitle: 'Sign in to open this register and start operating.',
            password: 'Password',
            identity: 'Employee ID or email',
            identityPlaceholder: 'e.g. cashier@prodx.co',
            secretPassword: 'Password',
            signIn: 'Sign in',
            signingIn: 'Verifying access…',
            terminal: 'Terminal',
            ready: 'Details complete',
            setup: 'Setup required',
            organization: 'Organization',
            store: 'Store',
            register: 'Register',
            edit: 'Edit',
            done: 'Done',
            security: 'Server verification required',
            verified: 'Secure sign-in',
            serverNote: 'Account · store · terminal are checked before a session opens.',
            failed: 'Sign-in failed. Check your details and try again.',
            required: 'Complete the required fields.',
            language: 'ไทย',
          },
    [isThai],
  );

  const terminalReady = Boolean(
    organizationSlug.trim() && storeCode.trim() && registerId.trim(),
  );
  const canSubmit = terminalReady && Boolean(identity.trim()) && Boolean(secret);

  useEffect(() => {
    const update = () =>
      setClock(
        new Intl.DateTimeFormat(isThai ? 'th-TH' : 'en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date()),
      );
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [isThai]);

  const persistTerminal = () => {
    try {
      window.localStorage.setItem(STORAGE.organization, organizationSlug.trim());
      window.localStorage.setItem(STORAGE.store, storeCode.trim());
      window.localStorage.setItem(STORAGE.register, registerId.trim());
    } catch {
      // Terminal identifiers are a convenience only; authentication must still work.
    }
  };

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isLoading) return;

    if (!terminalReady || !identity.trim() || !secret) {
      setTerminalOpen(true);
      addToast({ title: copy.setup, message: copy.required, type: 'error' });
      return;
    }
    try {
      await login({
        organizationSlug: organizationSlug.trim(),
        storeCode: storeCode.trim(),
        registerId: registerId.trim(),
        emailOrPin: identity.trim(),
        passwordOrPin: secret,
      });
      persistTerminal();
    } catch {
      setSecret('');
      addToast({ title: copy.title, message: copy.failed, type: 'error' });
    }
  };

  return (
    <main className="min-h-[100svh] bg-white text-slate-950">
      <div className="grid min-h-[100svh] lg:grid-cols-[57%_43%]">
        <section className="relative hidden overflow-hidden bg-[#07111f] text-white lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,107,26,.16),transparent_22%),radial-gradient(circle_at_76%_78%,rgba(16,91,145,.28),transparent_38%),linear-gradient(135deg,#06101c,#091a2b_52%,#030913)]" />
          <div className="absolute inset-0 opacity-[0.055]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
          <div className="absolute -left-24 top-1/2 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />
          <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-orange-500/10 blur-[110px]" />

          <div className="relative z-10 flex min-h-[100svh] w-full flex-col px-8 py-8 xl:px-14 xl:py-10">
            <header className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[22px] font-black tracking-[-0.08em] text-[#08111d] shadow-[0_12px_30px_rgba(0,0,0,.22)]">
                    P<span className="text-[#ff6b1a]">.</span>
                  </div>
                  <div>
                    <div className="text-[25px] font-black tracking-[-0.06em]">PRODX<span className="font-medium text-slate-300">POS</span></div>
                    <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">People · Process · Progress</div>
                  </div>
                </div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Production Terminal
              </span>
            </header>

            <div className="my-auto grid items-center gap-10 xl:grid-cols-[minmax(0,1fr)_210px]">
              <div className="max-w-2xl">
                <div className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-[#ff7a2a]">
                  {copy.verified}
                </div>
                <h1 className="text-[3.4rem] font-black leading-[0.98] tracking-[-0.065em] xl:text-[4.8rem]">
                  {isThai ? (
                    <>ยกระดับ<span className="block text-[#ff6b1a]">งานหน้าร้าน.</span></>
                  ) : (
                    <>Streamline<span className="block text-[#ff6b1a]">store operations.</span></>
                  )}
                </h1>
                <p className="mt-6 max-w-lg text-[14px] leading-6 text-slate-400">
                  {isThai
                    ? 'ศูนย์ควบคุมการขาย สินค้าคงคลัง ลูกค้า และงานประจำวันของสาขา — จากเครื่องเดียว'
                    : 'A unified workspace for sales, inventory, customers, and everyday store operations.'}
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: UserRound, title: isThai ? 'People' : 'People', sub: isThai ? 'Operator access' : 'Operator access' },
                  { icon: Monitor, title: isThai ? 'Store Operations' : 'Store Operations', sub: isThai ? 'Register control' : 'Register control' },
                  { icon: ShieldCheck, title: isThai ? 'Security' : 'Security', sub: isThai ? 'Server authority' : 'Server authority' },
                  { icon: Wifi, title: isThai ? 'Live System' : 'Live System', sub: isThai ? 'Connected terminal' : 'Connected terminal' },
                ].map(({ icon: Icon, title, sub }) => (
                  <div key={title} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] transition-all duration-300 group-hover:border-[#ff6b1a]/40 group-hover:bg-[#ff6b1a]/10">
                      <Icon className="h-5 w-5 text-[#ff8a45] stroke-[1.6]" />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-white">{title}</div>
                      <div className="mt-0.5 text-[10px] font-medium text-slate-500">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-3 h-36 overflow-hidden rounded-[26px] border border-white/10 bg-[#050b13] shadow-2xl shadow-black/30">
              <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_center,rgba(255,107,26,.18),transparent_65%)] blur-2xl" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#ff6b1a]/80 to-transparent" />
              <div className="absolute bottom-4 left-7 flex items-end gap-2.5">
                {[48,66,82,60,92,74].map((height, index) => (
                  <div key={index} className="relative w-12 rounded-t-lg border border-slate-600/80 bg-gradient-to-b from-slate-700/90 to-slate-950/95 shadow-[0_0_22px_rgba(255,107,26,.08)] xl:w-14" style={{ height }}>
                    <div className="absolute inset-x-2 top-3 space-y-1.5 opacity-80">
                      {[0,1,2,3].map((row) => (
                        <div key={row} className="flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-[#ff6b1a]" />
                          <span className="h-1 flex-1 rounded-full bg-slate-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-5 right-8 flex h-20 w-28 items-center justify-center rounded-2xl border border-[#ff6b1a]/30 bg-[#ff6b1a]/10 shadow-[0_0_45px_rgba(255,107,26,.13)]">
                <div className="h-11 w-16 rounded-xl border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_25px_rgba(34,211,238,.16)]" />
              </div>
              <div className="absolute right-1/3 top-4 h-1.5 w-1.5 rounded-full bg-[#ff6b1a] shadow-[0_0_12px_rgba(255,107,26,.9)]" />
              <div className="absolute right-1/3 top-5 h-20 w-px bg-gradient-to-b from-[#ff6b1a]/80 to-transparent" />
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.035]">
              {[
                { icon: ShieldCheck, title: 'Secure', sub: 'Server verified' },
                { icon: Monitor, title: 'Touch ready', sub: 'Built for registers' },
                { icon: CheckCircle2, title: 'Reliable', sub: 'Production flow' },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex items-center gap-3 px-4 py-3.5">
                  <Icon className="h-5 w-5 text-[#ff7a2a] stroke-[1.6]" />
                  <div>
                    <div className="text-xs font-bold text-white">{title}</div>
                    <div className="text-[9px] font-medium text-slate-500">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative min-h-[100svh] bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,107,26,.055),transparent_25%)]" />
          <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 xl:px-14">
            <div className="lg:hidden">
              <div className="text-xl font-black tracking-[-0.05em]">PRODX<span className="text-[#ff6b1a]">POS</span></div>
              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Production Terminal</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden h-9 items-center gap-2 rounded-lg bg-slate-50 px-3 text-[11px] font-bold text-slate-500 sm:flex">
                <Clock3 className="h-3.5 w-3.5" />
                {clock}
              </div>
              <button type="button" onClick={() => setLanguage(isThai ? 'en' : 'th')} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 transition-all duration-300 hover:border-[#ff6b1a] hover:text-[#e85d0c] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a]/30">
                <Globe2 className="h-3.5 w-3.5 stroke-[1.6]" />
                {copy.language}
              </button>
            </div>
          </header>

          <div className="relative z-10 flex min-h-[calc(100svh-88px)] items-center justify-center px-6 pb-10 sm:px-10 xl:px-16">
            <div className="w-full max-w-[470px]">
              <div className="mb-8">
                <div className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#e85d0c]">
                  {isThai ? 'Welcome back' : 'Welcome back'}
                </div>
                <h2 className="text-4xl font-black leading-none tracking-[-0.06em] text-[#0b1a2a] sm:text-[3.25rem]">
                  {isThai ? 'เข้าสู่ระบบ' : 'Operator Access'}
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">{copy.subtitle}</p>
              </div>

              <button type="button" onClick={() => setTerminalOpen((value) => !value)} className="group mb-5 flex w-full items-center gap-3 border-b border-slate-200 pb-4 text-left transition-all duration-300 hover:border-slate-300 active:scale-[0.995]">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${terminalReady ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {terminalReady ? <Check className="h-4 w-4 stroke-[2]" /> : <Wifi className="h-4 w-4 stroke-[1.6]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-slate-900">{copy.terminal} <span className={terminalReady ? 'text-emerald-600' : 'text-amber-600'}>· {terminalReady ? copy.ready : copy.setup}</span></div>
                  <div className="truncate text-[11px] font-medium text-slate-400">{terminalReady ? `${storeCode} · ${registerId}` : copy.serverNote}</div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 transition-colors group-hover:text-[#e85d0c]">{terminalOpen ? copy.done : copy.edit}</span>
              </button>

              {terminalOpen && (
                <div className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4">
                  {[
                    { icon: Building2, label: copy.organization, value: organizationSlug, set: setOrganizationSlug },
                    { icon: Store, label: copy.store, value: storeCode, set: setStoreCode },
                    { icon: Monitor, label: copy.register, value: registerId, set: setRegisterId },
                  ].map(({ icon: Icon, label, value, set }) => (
                    <label key={label} className="block">
                      <span className="mb-1.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-500"><Icon className="h-3 w-3" />{label}</span>
                      <input value={value} onChange={(event) => set(event.target.value)} autoComplete="off" maxLength={256} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none transition-all duration-300 focus:border-[#ff6b1a] focus:ring-4 focus:ring-[#ff6b1a]/10" />
                    </label>
                  ))}
                </div>
              )}

              <form onSubmit={submit}>
                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-700">{copy.identity}</span>
                  <span className="relative block">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[1.6]" />
                    <input value={identity} onChange={(event) => setIdentity(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={256} placeholder={copy.identityPlaceholder} className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-300 hover:border-slate-300 focus:border-[#ff6b1a] focus:ring-4 focus:ring-[#ff6b1a]/10" />
                  </span>
                </label>

                <label className="mt-5 block">
                  <span className="mb-2 block text-xs font-black text-slate-700">{copy.secretPassword}</span>
                  <span className="relative block">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[1.6]" />
                    <input value={secret} onChange={(event) => setSecret(event.target.value)} type={showSecret ? 'text' : 'password'} autoComplete="current-password" maxLength={256} className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-medium outline-none transition-all duration-300 placeholder:text-slate-300 hover:border-slate-300 focus:border-[#ff6b1a] focus:ring-4 focus:ring-[#ff6b1a]/10" />
                    <button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-1 top-1 flex h-12 w-12 items-center justify-center rounded-lg text-slate-400 transition-all duration-300 hover:bg-slate-50 hover:text-slate-700 active:scale-[0.98]" aria-label={showSecret ? 'Hide password' : 'Show password'}>{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </span>
                </label>

                <button type="submit" disabled={!canSubmit || isLoading} className="group mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ff6b1a] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(255,107,26,.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#eb5b0c] hover:shadow-[0_18px_35px_rgba(255,107,26,.26)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ff6b1a]/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
                  {isLoading ? copy.signingIn : copy.signIn}
                </button>
              </form>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ff6b1a] stroke-[1.6]" />
                  <div>
                    <div className="text-xs font-black text-slate-800">{isThai ? 'Secure. Controlled. Auditable.' : 'Secure. Controlled. Auditable.'}</div>
                    <div className="mt-1 text-[10px] leading-4 text-slate-500">{copy.serverNote}</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-slate-300">
                PRODX · Production Terminal · {clock}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
