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
    return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#070b12] text-slate-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-32 h-[34rem] w-[34rem] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[1500px] items-center px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-[0_40px_120px_rgba(0,0,0,.45)] backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_minmax(440px,520px)]">
          <section className="relative hidden min-h-[760px] flex-col justify-between p-10 text-white lg:flex xl:p-14">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-950 shadow-xl shadow-black/20">
                  P
                </div>
                <div>
                  <div className="text-lg font-black tracking-tight">PRODX POS</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Retail Operating System
                  </div>
                </div>
              </div>

              <div className="mt-24 max-w-xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.9)]" />
                  {copy.verified}
                </div>
                <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.055em] xl:text-7xl">
                  {isThai ? (
                    <>
                      เปิดกะให้ไว.
                      <span className="mt-2 block text-slate-400">ขายได้ทันที.</span>
                    </>
                  ) : (
                    <>
                      Start the shift.
                      <span className="mt-2 block text-slate-400">Run the store.</span>
                    </>
                  )}
                </h1>
                <p className="mt-7 max-w-md text-sm font-medium leading-6 text-slate-400">
                  {isThai
                    ? 'เข้าสู่ระบบจากเครื่องขายนี้ เพื่อเปิดเซสชันและเริ่มงานของสาขาอย่างปลอดภัย'
                    : 'Sign in from this register to open a secure operator session for the store.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: ShieldCheck, label: isThai ? 'Server authority' : 'Server authority' },
                { icon: Monitor, label: isThai ? 'Touch ready' : 'Touch ready' },
                { icon: Wifi, label: isThai ? 'Live connection' : 'Live connection' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <Icon className="h-4 w-4 text-blue-300" />
                  <div className="mt-3 text-xs font-bold text-slate-300">{label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#f6f8fb] p-3 sm:p-5 lg:p-3">
            <div className="flex min-h-[calc(100svh-40px)] flex-col rounded-[25px] bg-white shadow-[0_24px_80px_rgba(15,23,42,.18)] lg:min-h-[736px]">
              <header className="flex items-center justify-between px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                    P
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-950">PRODX POS</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Operator</div>
                  </div>
                </div>
                <div className="hidden text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 lg:block">
                  {copy.eyebrow}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="hidden h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-500 sm:flex">
                    <Clock3 className="h-3.5 w-3.5" />
                    {clock}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLanguage(isThai ? 'en' : 'th')}
                    className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <Globe2 className="h-3.5 w-3.5 text-blue-600" />
                    {copy.language}
                  </button>
                </div>
              </header>

              <div className="flex flex-1 items-center px-5 pb-7 sm:px-8 sm:pb-10">
                <div className="mx-auto w-full max-w-[410px]">
                  <div className="mb-7">
                    <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                      {isThai ? 'Operator sign in' : 'Operator sign in'}
                    </div>
                    <h2 className="text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-[2.6rem]">
                      {copy.title}
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{copy.subtitle}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTerminalOpen((value) => !value)}
                    className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${terminalReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {terminalReady ? <Check className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                        {copy.terminal}
                        <span className={terminalReady ? 'text-emerald-600' : 'text-amber-600'}>
                          · {terminalReady ? copy.ready : copy.setup}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                        {terminalReady ? `${storeCode} · ${registerId}` : copy.serverNote}
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-blue-700">{terminalOpen ? copy.done : copy.edit}</span>
                  </button>

                  {terminalOpen && (
                    <div className="mb-5 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                      {[
                        { icon: Building2, label: copy.organization, value: organizationSlug, set: setOrganizationSlug },
                        { icon: Store, label: copy.store, value: storeCode, set: setStoreCode },
                        { icon: Monitor, label: copy.register, value: registerId, set: setRegisterId },
                      ].map(({ icon: Icon, label, value, set }) => (
                        <label key={label} className="block">
                          <span className="mb-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </span>
                          <input
                            value={value}
                            onChange={(event) => set(event.target.value)}
                            autoComplete="off"
                            maxLength={256}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  <form onSubmit={submit}>
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
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
                          className={`flex h-11 items-center justify-center gap-2 rounded-lg text-xs font-black transition ${mode === id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>

                    <label className="mt-5 block">
                      <span className="mb-2 block text-xs font-black text-slate-700">{copy.identity}</span>
                      <span className="relative block">
                        <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={identity}
                          onChange={(event) => setIdentity(event.target.value)}
                          autoComplete="username"
                          autoCapitalize="none"
                          spellCheck={false}
                          maxLength={256}
                          placeholder={copy.identityPlaceholder}
                          className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10"
                        />
                      </span>
                    </label>

                    {mode === 'pin' ? (
                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-black text-slate-700">{copy.secretPin}</span>
                          <span className="font-mono text-[10px] font-bold text-slate-400">{secret.length}/4</span>
                        </div>
                        <div className="mb-3 flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                          <span className="font-mono text-xl font-black tracking-[0.55em] text-slate-950">
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
                              className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-px hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-40"
                            >
                              {digit}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setSecret('')}
                            disabled={isLoading || !secret}
                            className="h-11 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
                          >
                            {copy.clear}
                          </button>
                          <button
                            type="button"
                            onClick={() => addDigit('0')}
                            disabled={isLoading || secret.length >= 4}
                            className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-px hover:border-blue-300 hover:bg-blue-50 disabled:opacity-40"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={() => setSecret((value) => value.slice(0, -1))}
                            disabled={isLoading || !secret}
                            aria-label={isThai ? 'ลบตัวเลขล่าสุด' : 'Delete last digit'}
                            className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
                          >
                            <Delete className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="mt-5 block">
                        <span className="mb-2 block text-xs font-black text-slate-700">{copy.secretPassword}</span>
                        <span className="relative block">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            value={secret}
                            onChange={(event) => setSecret(event.target.value)}
                            type={showSecret ? 'text' : 'password'}
                            autoComplete="current-password"
                            maxLength={256}
                            className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm font-bold outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret((value) => !value)}
                            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                            aria-label={showSecret ? 'Hide password' : 'Show password'}
                          >
                            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </span>
                      </label>
                    )}

                    <button
                      type="submit"
                      disabled={!canSubmit || isLoading}
                      className="group mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white shadow-[0_12px_30px_rgba(15,23,42,.20)] transition hover:-translate-y-px hover:bg-blue-700 hover:shadow-blue-700/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
                      {isLoading ? copy.signingIn : copy.signIn}
                    </button>
                  </form>

                  <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{copy.security}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
