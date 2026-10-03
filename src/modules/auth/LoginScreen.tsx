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
    <main className="min-h-[100svh] overflow-hidden bg-slate-950 text-slate-950">
      <div className="min-h-[100svh] lg:grid lg:grid-cols-[0.72fr_1.28fr]">
        <section className="relative hidden min-h-[100svh] overflow-hidden border-r border-white/10 lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,.42),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(6,182,212,.18),transparent_30%),linear-gradient(145deg,#020617,#0f172a_55%,#111827)]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.35) 1px,transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />

          <div className="relative z-10 flex h-full flex-col p-10 xl:p-14">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black shadow-2xl shadow-blue-950/60">
                P
              </div>
              <div>
                <div className="text-lg font-black tracking-tight text-white">PRODX POS</div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Retail Operating System
                </div>
              </div>
            </div>

            <div className="my-auto max-w-xl py-12">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.8)]" />
                {copy.verified}
              </div>

              <h1 className="max-w-lg text-5xl font-black leading-[1.02] tracking-[-0.04em] text-white xl:text-6xl">
                Run the store.
                <span className="block text-blue-400">Keep control.</span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
                {isThai
                  ? 'พื้นที่ทำงานเดียวสำหรับการขาย สินค้าคงคลัง ลูกค้า และการปฏิบัติงานของสาขา'
                  : 'One focused workspace for sales, inventory, customers, and daily store operations.'}
              </p>

              <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
                {[
                  { icon: ShieldCheck, label: isThai ? 'ปลอดภัย' : 'Secure' },
                  { icon: Monitor, label: isThai ? 'Touch-first' : 'Touch-first' },
                  { icon: Wifi, label: isThai ? 'เชื่อมต่อจริง' : 'Connected' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
                    <Icon className="h-5 w-5 text-blue-300" />
                    <div className="mt-3 text-sm font-bold text-white">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-5 text-xs font-semibold text-slate-500">
              <span>PRODX · Production Terminal</span>
              <span className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                {copy.security}
              </span>
            </div>
          </div>
        </section>

        <section className="relative min-h-[100svh] bg-slate-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(59,130,246,.12),transparent_28%),linear-gradient(180deg,#f8fafc,#eef2f7)]" />

          <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 xl:px-12">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">P</div>
              <span className="font-black text-slate-950">PRODX POS</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm sm:flex">
                <Clock3 className="h-4 w-4 text-slate-400" />
                {clock}
              </div>
              <button
                type="button"
                onClick={() => setLanguage(isThai ? 'en' : 'th')}
                className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Globe2 className="h-4 w-4 text-blue-600" />
                {copy.language}
              </button>
            </div>
          </header>

          <div className="relative z-10 mx-auto flex min-h-[calc(100svh-80px)] w-full max-w-2xl items-center px-4 pb-8 sm:px-8 xl:px-12">
            <div className="w-full">
              <div className="mb-6">
                <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                  {copy.eyebrow}
                </div>
                <h2 className="text-4xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
                  {copy.title}
                </h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">{copy.subtitle}</p>
              </div>

              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,.10)]">
                <button
                  type="button"
                  onClick={() => setTerminalOpen((value) => !value)}
                  className="flex w-full items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4 text-left sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${terminalReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {terminalReady ? <Check className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900">
                        {copy.terminal} · {terminalReady ? copy.ready : copy.setup}
                      </div>
                      <div className="truncate text-xs font-semibold text-slate-500">
                        {terminalReady ? `${storeCode} · ${registerId}` : copy.serverNote}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-black text-blue-700">{terminalOpen ? copy.done : copy.edit}</span>
                </button>

                {terminalOpen && (
                  <div className="grid gap-3 border-b border-slate-200 bg-white p-5 sm:grid-cols-3 sm:p-6">
                    {[
                      { icon: Building2, label: copy.organization, value: organizationSlug, set: setOrganizationSlug },
                      { icon: Store, label: copy.store, value: storeCode, set: setStoreCode },
                      { icon: Monitor, label: copy.register, value: registerId, set: setRegisterId },
                    ].map(({ icon: Icon, label, value, set }) => (
                      <label key={label} className="block">
                        <span className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-600">
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                        <input
                          value={value}
                          onChange={(event) => set(event.target.value)}
                          autoComplete="off"
                          maxLength={256}
                          className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10"
                        />
                      </label>
                    ))}
                  </div>
                )}

                <form onSubmit={submit} className="p-5 sm:p-7">
                  <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
                    {[
                      { id: 'pin' as const, icon: KeyRound, label: copy.pin },
                      { id: 'password' as const, icon: Lock, label: copy.password },
                    ].map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setMode(id);
                          setSecret('');
                          setShowSecret(false);
                        }}
                        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-black transition ${mode === id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  <label className="mt-6 block">
                    <span className="mb-2 block text-sm font-black text-slate-800">{copy.identity}</span>
                    <span className="relative block">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={identity}
                        onChange={(event) => setIdentity(event.target.value)}
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={256}
                        placeholder={copy.identityPlaceholder}
                        className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-base font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                      />
                    </span>
                  </label>

                  {mode === 'pin' ? (
                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-black text-slate-800">{copy.secretPin}</span>
                        <span className="font-mono text-xs font-bold text-slate-400">{secret.length}/4</span>
                      </div>
                      <div className="mb-3 flex h-14 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50">
                        <span className="font-mono text-2xl font-black tracking-[0.65em] text-slate-900">
                          {'•'.repeat(secret.length)}
                          <span className="text-slate-300">{'•'.repeat(4 - secret.length)}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {['1','2','3','4','5','6','7','8','9'].map((digit) => (
                          <button
                            key={digit}
                            type="button"
                            onClick={() => addDigit(digit)}
                            disabled={isLoading || secret.length >= 4}
                            className="min-h-12 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-40"
                          >
                            {digit}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setSecret('')}
                          disabled={isLoading || !secret}
                          className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                        >
                          {copy.clear}
                        </button>
                        <button
                          type="button"
                          onClick={() => addDigit('0')}
                          disabled={isLoading || secret.length >= 4}
                          className="min-h-12 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-40"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={() => setSecret((value) => value.slice(0, -1))}
                          disabled={isLoading || !secret}
                          aria-label={isThai ? 'ลบตัวเลขล่าสุด' : 'Delete last digit'}
                          className="flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                        >
                          <Delete className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="mt-6 block">
                      <span className="mb-2 block text-sm font-black text-slate-800">{copy.secretPassword}</span>
                      <span className="relative block">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                          value={secret}
                          onChange={(event) => setSecret(event.target.value)}
                          type={showSecret ? 'text' : 'password'}
                          autoComplete="current-password"
                          maxLength={256}
                          className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-12 text-base font-bold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret((value) => !value)}
                          className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                          aria-label={showSecret ? 'Hide password' : 'Show password'}
                        >
                          {showSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={!canSubmit || isLoading}
                    className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-base font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    {isLoading ? copy.signingIn : copy.signIn}
                  </button>
                </form>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-slate-200 bg-white/70 p-4 text-xs font-semibold leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{copy.serverNote}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
