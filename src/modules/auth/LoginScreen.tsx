import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Delete,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Store,
  User,
  Wifi,
} from "lucide-react";
import { ProdxLogo } from "../../components/common/ProdxLogo";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { PosTerminalIllustration } from "./PosTerminalIllustration";

type AuthMode = "pin" | "password";

const TERMINAL_STORAGE_KEYS = {
  organization: "prodx.terminal.organization",
  store: "prodx.terminal.store",
  register: "prodx.terminal.register",
} as const;

const initialTerminalValue = (
  storageKey: string,
  environmentValue?: string,
): string => {
  if (typeof window === "undefined") return environmentValue?.trim() ?? "";
  return (
    window.localStorage.getItem(storageKey)?.trim() ||
    environmentValue?.trim() ||
    ""
  );
};

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { addToast } = useToast();
  const isThai = language === "th";

  const [authMode, setAuthMode] = useState<AuthMode>("pin");
  const [organizationSlug, setOrganizationSlug] = useState(() =>
    initialTerminalValue(
      TERMINAL_STORAGE_KEYS.organization,
      import.meta.env.VITE_PRODX_ORGANIZATION_SLUG,
    ),
  );
  const [storeCode, setStoreCode] = useState(() =>
    initialTerminalValue(
      TERMINAL_STORAGE_KEYS.store,
      import.meta.env.VITE_PRODX_STORE_CODE,
    ),
  );
  const [registerId, setRegisterId] = useState(() =>
    initialTerminalValue(
      TERMINAL_STORAGE_KEYS.register,
      import.meta.env.VITE_PRODX_REGISTER_ID,
    ),
  );
  const [identity, setIdentity] = useState("");
  const [secret, setSecret] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [terminalSettingsOpen, setTerminalSettingsOpen] = useState(
    !organizationSlug || !storeCode || !registerId,
  );
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Intl.DateTimeFormat(isThai ? "th-TH" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      );
    };
    updateClock();
    const timer = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(timer);
  }, [isThai]);

  const copy = useMemo(
    () =>
      isThai
        ? {
            title: "เข้าสู่ระบบ",
            subtitle: "เริ่มกะการขายอย่างปลอดภัยด้วยบัญชีของคุณ",
            pinTab: "PIN พนักงาน",
            passwordTab: "รหัสผ่าน",
            identity: "รหัสพนักงานหรืออีเมล",
            identityPlaceholder: "เช่น cashier@prodx.co",
            pin: "รหัส PIN 4 หลัก",
            password: "รหัสผ่าน",
            signIn: "เข้าสู่ระบบ",
            signingIn: "กำลังตรวจสอบ...",
            terminal: "ข้อมูลเครื่องขาย",
            terminalReady: "เครื่องพร้อมใช้งาน",
            terminalSetup: "ต้องตั้งค่าเครื่อง",
            organization: "องค์กร",
            store: "สาขา",
            register: "เครื่องขาย",
            missingTerminal: "กรุณากรอกข้อมูลองค์กร สาขา และเครื่องขายให้ครบ",
            missingCredentials: "กรุณากรอกข้อมูลเข้าสู่ระบบให้ครบ",
            invalidPin: "กรุณากรอก PIN 4 หลัก",
            authFailed:
              "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง",
            securityNote:
              "ระบบจะตรวจสอบบัญชี สิทธิ์สาขา และสถานะเครื่องกับเซิร์ฟเวอร์",
            heroTitle: "ขายได้เร็วขึ้น\nควบคุมได้มั่นใจขึ้น",
            heroBody:
              "PRODX POS เชื่อมการขาย สินค้าคงคลัง และการปฏิบัติงานไว้ในระบบเดียวที่ปลอดภัย",
            serverVerified: "ตรวจสอบสิทธิ์กับเซิร์ฟเวอร์",
            touchReady: "ออกแบบสำหรับจอสัมผัส",
            sessionProtected: "เซสชันได้รับการปกป้อง",
            languageLabel: "เปลี่ยนเป็นภาษาอังกฤษ",
            openTerminal: "แก้ไขข้อมูลเครื่อง",
            closeTerminal: "ซ่อนข้อมูลเครื่อง",
            clearPin: "ล้าง PIN",
            deleteDigit: "ลบตัวเลขล่าสุด",
            showPassword: "แสดงรหัสผ่าน",
            hidePassword: "ซ่อนรหัสผ่าน",
          }
        : {
            title: "Welcome back",
            subtitle: "Start your shift securely with your account",
            pinTab: "Staff PIN",
            passwordTab: "Password",
            identity: "Employee ID or email",
            identityPlaceholder: "e.g. cashier@prodx.co",
            pin: "4-digit PIN",
            password: "Password",
            signIn: "Sign in",
            signingIn: "Verifying...",
            terminal: "Terminal details",
            terminalReady: "Terminal ready",
            terminalSetup: "Terminal setup required",
            organization: "Organization",
            store: "Store",
            register: "Register",
            missingTerminal:
              "Enter the organization, store, and register details.",
            missingCredentials: "Enter your account details to continue.",
            invalidPin: "Enter a 4-digit PIN.",
            authFailed: "Sign-in failed. Check your details and try again.",
            securityNote:
              "The server verifies your account, store access, and terminal status.",
            heroTitle: "Move faster.\nStay in control.",
            heroBody:
              "PRODX POS brings sales, inventory, and store operations together in one secure workspace.",
            serverVerified: "Server-verified access",
            touchReady: "Touch-first workflow",
            sessionProtected: "Protected sessions",
            languageLabel: "เปลี่ยนเป็นภาษาไทย",
            openTerminal: "Edit terminal details",
            closeTerminal: "Hide terminal details",
            clearPin: "Clear PIN",
            deleteDigit: "Delete last digit",
            showPassword: "Show password",
            hidePassword: "Hide password",
          },
    [isThai],
  );

  const terminalReady = Boolean(
    organizationSlug.trim() && storeCode.trim() && registerId.trim(),
  );
  const canSubmit =
    terminalReady &&
    Boolean(identity.trim()) &&
    (authMode === "pin" ? /^\d{4}$/.test(secret) : Boolean(secret));

  const changeMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setSecret("");
    setShowPassword(false);
  };

  const updatePin = (value: string) => {
    setSecret(value.replace(/\D/g, "").slice(0, 4));
  };

  const persistTerminalIdentity = () => {
    window.localStorage.setItem(
      TERMINAL_STORAGE_KEYS.organization,
      organizationSlug.trim(),
    );
    window.localStorage.setItem(TERMINAL_STORAGE_KEYS.store, storeCode.trim());
    window.localStorage.setItem(
      TERMINAL_STORAGE_KEYS.register,
      registerId.trim(),
    );
  };

  const submitLogin = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isLoading) return;

    if (!terminalReady) {
      setTerminalSettingsOpen(true);
      addToast({
        title: copy.terminalSetup,
        message: copy.missingTerminal,
        type: "error",
      });
      return;
    }
    if (!identity.trim() || !secret) {
      addToast({
        title: copy.title,
        message: copy.missingCredentials,
        type: "error",
      });
      return;
    }
    if (authMode === "pin" && !/^\d{4}$/.test(secret)) {
      addToast({ title: copy.pin, message: copy.invalidPin, type: "error" });
      return;
    }

    try {
      persistTerminalIdentity();
      await login({
        organizationSlug: organizationSlug.trim(),
        storeCode: storeCode.trim(),
        registerId: registerId.trim(),
        emailOrPin: identity.trim(),
        passwordOrPin: secret,
      });
    } catch {
      setSecret("");
      addToast({ title: copy.title, message: copy.authFailed, type: "error" });
    }
  };

  return (
    <main
      className="min-h-[100svh] bg-[#f8fafc] text-slate-950 selection:bg-blue-600 selection:text-white"
      style={{ colorScheme: "light" }}
    >
      <div className="grid min-h-[100svh] lg:grid-cols-[minmax(360px,0.84fr)_minmax(560px,1.16fr)]">
        <section className="relative hidden overflow-hidden border-r border-slate-800 bg-slate-950 px-10 py-10 text-white lg:flex lg:flex-col xl:px-14 xl:py-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(148,163,184,.8) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 bottom-16 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

          <header className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-black shadow-lg shadow-blue-950/40">
              P
            </div>
            <div>
              <div className="text-lg font-black tracking-tight">PRODX POS</div>
              <div className="text-sm font-medium text-slate-400">
                Retail operating system
              </div>
            </div>
          </header>

          <div className="relative z-10 my-auto py-10">
            <div className="mx-auto max-w-lg">
              <PosTerminalIllustration
                className="mx-auto mb-3 max-w-[420px]"
                size="lg"
              />
              <h1 className="whitespace-pre-line text-4xl font-black leading-[1.08] tracking-tight xl:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
                {copy.heroBody}
              </p>
              <ul className="mt-8 grid gap-3 text-sm font-semibold text-slate-200 xl:grid-cols-2">
                {[
                  copy.serverVerified,
                  copy.touchReady,
                  copy.sessionProtected,
                ].map((label) => (
                  <li key={label} className="flex min-h-11 items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-400" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <footer className="relative z-10 flex items-center justify-between border-t border-slate-800 pt-5 text-sm text-slate-400">
            <span>PRODX POS</span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Secure authentication
            </span>
          </footer>
        </section>

        <section className="relative flex min-h-[100svh] flex-col px-4 py-4 sm:px-8 sm:py-6 lg:px-12 xl:px-16">
          <header className="mx-auto flex w-full max-w-xl items-center justify-between">
            <ProdxLogo variant="horizontal" size="sm" className="lg:hidden" />
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden min-h-11 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#ffffff] px-3 text-sm font-semibold text-slate-600 sm:flex">
                <Clock3 className="h-4 w-4" />
                <span>{currentTime}</span>
              </div>
              <button
                type="button"
                onClick={() => setLanguage(isThai ? "en" : "th")}
                aria-label={copy.languageLabel}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#ffffff] px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-[#f1f5f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <Globe className="h-4 w-4 text-blue-600" />
                {isThai ? "ไทย" : "EN"}
              </button>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-xl flex-1 items-center py-8">
            <div className="w-full">
              <div className="mb-7">
                <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                  <ShieldCheck className="h-4 w-4" />
                  {copy.sessionProtected}
                </div>
                <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  {copy.title}
                </h2>
                <p className="mt-2 text-base leading-7 text-slate-600">
                  {copy.subtitle}
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#ffffff] shadow-[0_1px_2px_rgba(15,23,42,.05),0_12px_32px_rgba(15,23,42,.06)]">
                <div className="border-b border-[#e2e8f0] bg-[#f8fafc]/80 px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() => setTerminalSettingsOpen((open) => !open)}
                    aria-expanded={terminalSettingsOpen}
                    className="flex min-h-11 w-full items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          terminalReady
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        <Wifi className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-slate-900">
                          {terminalReady
                            ? copy.terminalReady
                            : copy.terminalSetup}
                        </span>
                        <span className="block truncate text-sm text-slate-500">
                          {terminalReady
                            ? `${organizationSlug} · ${storeCode} · ${registerId}`
                            : copy.terminal}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-blue-700">
                      {terminalSettingsOpen
                        ? copy.closeTerminal
                        : copy.openTerminal}
                    </span>
                  </button>

                  {terminalSettingsOpen && (
                    <div className="mt-4 grid gap-3 border-t border-[#e2e8f0] pt-4 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                          <Building2 className="h-4 w-4" />
                          {copy.organization}
                        </span>
                        <input
                          value={organizationSlug}
                          onChange={(event) =>
                            setOrganizationSlug(event.target.value)
                          }
                          autoComplete="off"
                          maxLength={256}
                          className="h-12 w-full rounded-lg border border-[#cbd5e1] bg-[#ffffff] px-3 text-base font-semibold outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                          <Store className="h-4 w-4" />
                          {copy.store}
                        </span>
                        <input
                          value={storeCode}
                          onChange={(event) => setStoreCode(event.target.value)}
                          autoComplete="off"
                          maxLength={256}
                          className="h-12 w-full rounded-lg border border-[#cbd5e1] bg-[#ffffff] px-3 text-base font-semibold outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                          <KeyRound className="h-4 w-4" />
                          {copy.register}
                        </span>
                        <input
                          value={registerId}
                          onChange={(event) =>
                            setRegisterId(event.target.value)
                          }
                          autoComplete="off"
                          maxLength={256}
                          className="h-12 w-full rounded-lg border border-[#cbd5e1] bg-[#ffffff] px-3 text-base font-semibold outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <form onSubmit={submitLogin} className="p-5 sm:p-6">
                  <div
                    className="grid grid-cols-2 gap-1 rounded-lg bg-[#f1f5f9] p-1"
                    role="tablist"
                    aria-label={copy.title}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={authMode === "pin"}
                      onClick={() => changeMode("pin")}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        authMode === "pin"
                          ? "bg-[#ffffff] text-blue-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-950"
                      }`}
                    >
                      <KeyRound className="h-4 w-4" />
                      {copy.pinTab}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={authMode === "password"}
                      onClick={() => changeMode("password")}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        authMode === "password"
                          ? "bg-[#ffffff] text-blue-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-950"
                      }`}
                    >
                      <Lock className="h-4 w-4" />
                      {copy.passwordTab}
                    </button>
                  </div>

                  <label className="mt-5 block">
                    <span className="mb-2 block text-sm font-bold text-slate-800">
                      {copy.identity}
                    </span>
                    <span className="relative block">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={identity}
                        onChange={(event) => setIdentity(event.target.value)}
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={256}
                        placeholder={copy.identityPlaceholder}
                        className="h-12 w-full rounded-lg border border-[#cbd5e1] bg-[#ffffff] pl-11 pr-3 text-base font-semibold outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                      />
                    </span>
                  </label>

                  {authMode === "pin" ? (
                    <div className="mt-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">
                          {copy.pin}
                        </span>
                        <span
                          className="text-sm font-semibold text-slate-500"
                          aria-live="polite"
                        >
                          {secret.length}/4
                        </span>
                      </div>
                      <input
                        value={secret}
                        onChange={(event) => updatePin(event.target.value)}
                        type="password"
                        inputMode="numeric"
                        autoComplete="current-password"
                        aria-label={copy.pin}
                        className="mb-4 h-12 w-full rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-4 text-center text-2xl font-black tracking-[0.5em] outline-none transition focus:border-blue-600 focus:bg-[#ffffff] focus:ring-2 focus:ring-blue-600/20"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                          (digit) => (
                            <button
                              key={digit}
                              type="button"
                              onClick={() => updatePin(secret + digit)}
                              disabled={isLoading || secret.length >= 4}
                              className="min-h-12 rounded-lg border border-[#e2e8f0] bg-[#ffffff] text-xl font-black text-slate-900 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                            >
                              {digit}
                            </button>
                          ),
                        )}
                        <button
                          type="button"
                          onClick={() => setSecret("")}
                          disabled={isLoading || !secret}
                          aria-label={copy.clearPin}
                          className="min-h-12 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] text-sm font-bold text-slate-600 transition hover:bg-[#f1f5f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {isThai ? "ล้าง" : "Clear"}
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePin(secret + "0")}
                          disabled={isLoading || secret.length >= 4}
                          className="min-h-12 rounded-lg border border-[#e2e8f0] bg-[#ffffff] text-xl font-black text-slate-900 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSecret((value) => value.slice(0, -1))
                          }
                          disabled={isLoading || !secret}
                          aria-label={copy.deleteDigit}
                          className="flex min-h-12 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#f8fafc] text-slate-600 transition hover:bg-[#f1f5f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Delete className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="mt-5 block">
                      <span className="mb-2 block text-sm font-bold text-slate-800">
                        {copy.password}
                      </span>
                      <span className="relative block">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                          value={secret}
                          onChange={(event) => setSecret(event.target.value)}
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          maxLength={256}
                          className="h-12 w-full rounded-lg border border-[#cbd5e1] bg-[#ffffff] pl-11 pr-12 text-base font-semibold outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((visible) => !visible)}
                          aria-label={
                            showPassword ? copy.hidePassword : copy.showPassword
                          }
                          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-[#f1f5f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={!canSubmit || isLoading}
                    className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-base font-black text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 motion-reduce:transition-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
                        {copy.signingIn}
                      </>
                    ) : (
                      <>
                        {copy.signIn}
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {copy.securityNote}
              </p>
            </div>
          </div>

          <footer className="mx-auto flex w-full max-w-xl items-center justify-between border-t border-[#e2e8f0] py-4 text-sm text-slate-500">
            <span>© {new Date().getFullYear()} PRODX</span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {copy.serverVerified}
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
};
