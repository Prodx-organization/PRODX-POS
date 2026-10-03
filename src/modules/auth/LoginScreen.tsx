import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Delete,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
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

type AuthMode = 'pin' | 'password';

const STORAGE = {
  organization: 'prodx.terminal.organization',
  store: 'prodx.terminal.store',
  register: 'prodx.terminal.register',
} as const;

const readTerminalValue = (key: string, env?: string) => {
  if (typeof window === 'undefined') return env?.trim() ?? '';
  return window.localStorage.getItem(key)?.trim() || env?.trim() || '';
};

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { addToast } = useToast();
  const isThai = language === 'th';

  const [mode, setMode] = useState<AuthMode>('pin');
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
            pin: 'PIN พนักงาน',
            password: 'รหัสผ่าน',
            identity: 'รหัสพนักงานหรืออีเมล',
            identityPlaceholder: 'เช่น cashier@prodx.co',
            secretPin: 'PIN 4 หลัก',
            secretPassword: 'รหัสผ่าน',
            signIn: 'เข้าสู่ระบบ',
            signingIn: 'กำลังตรวจสอบสิทธิ์…',
            terminal: 'เครื่องขาย',
            ready: 'พร้อมใช้งาน',
            setup: 'ต้องตั้งค่า',
            organization: 'องค์กร',
            store: 'สาขา',
            register: 'Register',
            edit: 'แก้ไข',
            done: 'เสร็จสิ้น',
            security: 'สิทธิ์การใช้งานตรวจสอบโดยเซิร์ฟเวอร์',
            verified: 'Server verified',
            clear: 'ล้าง',
            serverNote: 'บัญชี · สาขา · เครื่องขาย จะถูกตรวจสอบก่อนเปิดเซสชัน',
            failed: 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง',
            required: 'กรุณากรอกข้อมูลให้ครบ',
            invalidPin: 'PIN ต้องเป็นตัวเลข 4 หลัก',
            language: 'English',
          }
        : {
            eyebrow: 'PRODX POS · OPERATOR CONSOLE',
            title: 'Ready for your shift',
            subtitle: 'Sign in to open this register and start operating.',
            pin: 'Staff PIN',
            password: 'Password',
            identity: 'Employee ID or email',
            identityPlaceholder: 'e.g. cashier@prodx.co',
            secretPin: '4-digit PIN',
            secretPassword: 'Password',
            signIn: 'Sign in',
            signingIn: 'Verifying access…',
            terminal: 'Terminal',
            ready: 'Ready',
            setup: 'Setup required',
            organization: 'Organization',
            store: 'Store',
            register: 'Register',
            edit: 'Edit',
            done: 'Done',
            security: 'Access is verified by the server',
            verified: 'Server verified',
            clear: 'Clear',
            serverNote: 'Account · store · terminal are checked before a session opens.',
            failed: 'Sign-in failed. Check your details and try again.',
            required: 'Complete the required fields.',
            invalidPin: 'PIN must contain exactly 4 digits.',
            language: 'ไทย',
          },
    [isThai],
  );

  const terminalReady = Boolean(
    organizationSlug.trim() && storeCode.trim() && registerId.trim(),
  );
  const canSubmit =
    terminalReady &&
    Boolean(identity.trim()) &&
    (mode === 'pin' ? /^\d{4}$/.test(secret) : Boolean(secret));

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
    window.localStorage.setItem(STORAGE.organization, organizationSlug.trim());
    window.localStorage.setItem(STORAGE.store, storeCode.trim());
    window.localStorage.setItem(STORAGE.register, registerId.trim());
  };

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isLoading) return;

    if (!terminalReady || !identity.trim() || !secret) {
      setTerminalOpen(true);
      addToast({ title: copy.setup, message: copy.required, type: 'error' });
      return;
    }
    if (mode === 'pin' && !/^\d{4}$/.test(secret)) {
      addToast({ title: copy.secretPin, message: copy.invalidPin, type: 'error' });
      return;
    }

    try {
      persistTerminal();
      await login({
        organizationSlug: organizationSlug.trim(),
        storeCode: storeCode.trim(),
        registerId: registerId.trim(),
        emailOrPin: identity.trim(),
        passwordOrPin: secret,
      });
    } catch {
      setSecret('');
      addToast({ title: copy.title, message: copy.failed, type: 'error' });
    }
  };

  const addDigit = (digit: string) => {
    if (secret.length < 4) setSecret((value) => value + digit);
  };

  return (
    <main className="min-h-[100svh] bg-white text-slate-950">
      <div className="grid min-h-[100svh] lg:grid-cols-[56%_44%]">
        <section className="relative hidden overflow-hidden bg-[#06101c] text-white lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(255,103,22,.18),transparent_25%),radial-gradient(circle_at_70%_80%,rgba(17,94,163,.24),transparent_34%),linear-gradient(135deg,#06101c,#081827_55%,#030912)]" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '52px 52px' }} />

          <div className="relative z-10 flex min-h-[100svh] w-full flex-col px-10 py-9 xl:px-14">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-black tracking-[-0.08em] text-slate-950">
                    P<span className="text-[#ff6b1a]">.</span>
                  </div>
                  <div>
                    <div className="text-[23px] font-black tracking-[-0.055em]">PRODX<span className="font-medium text-slate-300">POS</span></div>
                    <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400">People · Process · Progress</div>
                  </div>
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Production Terminal
              </div>
            </div>

            <div className="my-auto grid grid-cols-[minmax(0,1fr)_190px] items-center gap-8 xl:gap-12">
              <div className="max-w-2xl">
                <div className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-[#ff7a2a]">
                  {copy.verified}
                </div>
                <h1 className="max-w-xl text-5xl font-black leading-[0.98] tracking-[-0.055em] xl:text-[4.25rem]">
                  {isThai ? (
                    <>เปิดกะให้ไว.<span className="block text-[#ff6b1a]">ขายได้ทันที.</span></>
                  ) : (
                    <>Streamline<span className="block text-[#ff6b1a]">store operations.</span></>
                  )}
                </h1>
                <p className="mt-6 max-w-lg text-sm leading-6 text-slate-400">
                  {isThai
                    ? 'ระบบปฏิบัติการหน้าร้านสำหรับการขาย สินค้าคงคลัง ลูกค้า และงานประจำวันของสาขา'
                    : 'A focused operating workspace for sales, inventory, customers, and daily store operations.'}
                </p>

                <div className="mt-8 flex items-center gap-2 text-[11px] font-bold text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />
                  {copy.security}
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { icon: UserRound, title: isThai ? 'People' : 'People', sub: isThai ? 'Operator access' : 'Operator access' },
                  { icon: Monitor, title: isThai ? 'Store Operations' : 'Store Operations', sub: isThai ? 'Register control' : 'Register control' },
                  { icon: ShieldCheck, title: isThai ? 'Security' : 'Security', sub: isThai ? 'Server authority' : 'Server authority' },
                  { icon: Wifi, title: isThai ? 'Live System' : 'Live System', sub: isThai ? 'Connected terminal' : 'Connected terminal' },
                ].map(({ icon: Icon, title, sub }) => (
                  <div key={title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 backdrop-blur">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                      <Icon className="h-5 w-5 text-[#ff8a45]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{title}</div>
                      <div className="mt-0.5 text-[10px] font-medium text-slate-500">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-2 h-32 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-[#02060b]">
              <div className="absolute inset-x-0 bottom-0 h-10 bg-[linear-gradient(90deg,transparent,rgba(255,107,26,.28),transparent)] blur-xl" />
              <div className="absolute bottom-4 left-10 flex items-end gap-3">
                {[68,84,58,92,76].map((height, index) => (
                  <div key={index} className="relative w-16 rounded-t-lg border border-slate-600 bg-gradient-to-b from-slate-700 to-slate-950 shadow-[0_0_30px_rgba(255,107,26,.08)]" style={{ height }}>
                    <div className="absolute inset-x-2 top-3 space-y-1.5">
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
              <div className="absolute bottom-5 right-8 flex h-16 w-24 items-center justify-center rounded-2xl border border-[#ff6b1a]/30 bg-[#ff6b1a]/10 shadow-[0_0_35px_rgba(255,107,26,.12)]">
                <div className="h-9 w-12 rounded-lg border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_25px_rgba(34,211,238,.12)]" />
              </div>
              <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff6b1a]/70 to-transparent" />
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.035]">
              {[
                { icon: ShieldCheck, title: isThai ? 'Secure' : 'Secure', sub: isThai ? 'Server verified' : 'Server verified' },
                { icon: Monitor, title: isThai ? 'Touch ready' : 'Touch ready', sub: isThai ? 'Built for registers' : 'Built for registers' },
                { icon: CheckCircle2, title: isThai ? 'Reliable' : 'Reliable', sub: isThai ? 'Production flow' : 'Production flow' },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex items-center gap-3 px-4 py-3.5">
                  <Icon className="h-5 w-5 text-[#ff7a2a]" />
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,107,26,.05),transparent_24%)]" />
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
              <button type="button" onClick={() => setLanguage(isThai ? 'en' : 'th')} className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 transition hover:border-[#ff6b1a] hover:text-[#e85d0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a]/30">
                <Globe2 className="h-3.5 w-3.5" />
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
                <h2 className="text-4xl font-black leading-none tracking-[-0.055em] text-[#0b1a2a] sm:text-[3.25rem]">
                  {isThai ? 'เข้าสู่ระบบ' : 'Operator Access'}
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
                  {copy.subtitle}
                </p>
              </div>

              <button type="button" onClick={() => setTerminalOpen((value) => !value)} className="mb-5 flex w-full items-center gap-3 border-b border-slate-200 pb-4 text-left">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${terminalReady ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {terminalReady ? <Check className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-slate-900">{copy.terminal} <span className={terminalReady ? 'text-emerald-600' : 'text-amber-600'}>· {terminalReady ? copy.ready : copy.setup}</span></div>
                  <div className="truncate text-[11px] font-medium text-slate-400">{terminalReady ? `${storeCode} · ${registerId}` : copy.serverNote}</div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{terminalOpen ? copy.done : copy.edit}</span>
              </button>

              {terminalOpen && (
                <div className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
                  {[
                    { icon: Building2, label: copy.organization, value: organizationSlug, set: setOrganizationSlug },
                    { icon: Store, label: copy.store, value: storeCode, set: setStoreCode },
                    { icon: Monitor, label: copy.register, value: registerId, set: setRegisterId },
                  ].map(({ icon: Icon, label, value, set }) => (
                    <label key={label} className="block">
                      <span className="mb-1.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-500"><Icon className="h-3 w-3" />{label}</span>
                      <input value={value} onChange={(event) => set(event.target.value)} autoComplete="off" maxLength={256} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none transition focus:border-[#ff6b1a] focus:ring-4 focus:ring-[#ff6b1a]/10" />
                    </label>
                  ))}
                </div>
              )}

              <form onSubmit={submit}>
                <div className="mb-5 flex items-center gap-1 border-b border-slate-200">
                  {[
                    { id: 'pin' as const, icon: KeyRound, label: copy.pin },
                    { id: 'password' as const, icon: Lock, label: copy.password },
                  ].map(({ id, icon: Icon, label }) => (
                    <button key={id} type="button" onClick={() => { setMode(id); setSecret(''); setShowSecret(false); }} className={`relative flex h-11 flex-1 items-center justify-center gap-2 text-xs font-black transition ${mode === id ? 'text-[#e85d0c]' : 'text-slate-400 hover:text-slate-700'}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                      {mode === id && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#ff6b1a]" />}
                    </button>
                  ))}
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-700">{copy.identity}</span>
                  <span className="relative block">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={identity} onChange={(event) => setIdentity(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={256} placeholder={copy.identityPlaceholder} className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[#ff6b1a] focus:ring-4 focus:ring-[#ff6b1a]/10" />
                  </span>
                </label>

                {mode === 'pin' ? (
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700">{copy.secretPin}</span>
                      <span className="font-mono text-[10px] font-bold text-slate-400">{secret.length}/4</span>
                    </div>
                    <div className="mb-3 flex h-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                      <span className="font-mono text-xl font-black tracking-[0.55em] text-slate-900">{'•'.repeat(secret.length)}<span className="text-slate-300">{'•'.repeat(4 - secret.length)}</span></span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['1','2','3','4','5','6','7','8','9'].map((digit) => (
                        <button key={digit} type="button" onClick={() => addDigit(digit)} disabled={isLoading || secret.length >= 4} className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,.04)] transition hover:border-[#ff6b1a]/40 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a]/30 disabled:opacity-40">{digit}</button>
                      ))}
                      <button type="button" onClick={() => setSecret('')} disabled={isLoading || !secret} className="h-11 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black text-slate-500 disabled:opacity-40">{copy.clear}</button>
                      <button type="button" onClick={() => addDigit('0')} disabled={isLoading || secret.length >= 4} className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,.04)] transition hover:border-[#ff6b1a]/40 hover:bg-orange-50 disabled:opacity-40">0</button>
                      <button type="button" onClick={() => setSecret((value) => value.slice(0, -1))} disabled={isLoading || !secret} aria-label={isThai ? 'ลบตัวเลขล่าสุด' : 'Delete last digit'} className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 disabled:opacity-40"><Delete className="h-4 w-4" /></button>
                    </div>
                  </div>
                ) : (
                  <label className="mt-5 block">
                    <span className="mb-2 block text-xs font-black text-slate-700">{copy.secretPassword}</span>
                    <span className="relative block">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input value={secret} onChange={(event) => setSecret(event.target.value)} type={showSecret ? 'text' : 'password'} autoComplete="current-password" maxLength={256} className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-medium outline-none transition placeholder:text-slate-300 focus:border-[#ff6b1a] focus:ring-4 focus:ring-[#ff6b1a]/10" />
                      <button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50" aria-label={showSecret ? 'Hide password' : 'Show password'}>{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </span>
                  </label>
                )}

                <button type="submit" disabled={!canSubmit || isLoading} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ff6b1a] px-5 text-sm font-black text-white shadow-[0_10px_25px_rgba(255,107,26,.20)] transition hover:bg-[#eb5b0c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ff6b1a]/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isLoading ? copy.signingIn : copy.signIn}
                </button>
              </form>

              <div className="mt-7 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#ff6b1a]" />
                  <div>
                    <div className="text-xs font-black text-slate-800">{isThai ? 'Secure. Controlled. Auditable.' : 'Secure. Controlled. Auditable.'}</div>
                    <div className="mt-1 text-[10px] leading-4 text-slate-500">{copy.serverNote}</div>
                  </div>
                  <div className="ml-auto flex gap-1.5">
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[8px] font-black text-slate-400">SERVER</span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[8px] font-black text-slate-400">POS</span>
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
