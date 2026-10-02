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
};import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { ProdxLogo } from '../../components/common/ProdxLogo';
import {
  Globe,
  ChevronDown,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Fingerprint,
  ScanFace,
  Loader2,
  X,
  Delete,
  CheckCircle2,
  QrCode,
  KeyRound,
  Terminal,
  Cpu,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Settings2,
  ShieldAlert,
  Clock,
  Wifi,
  Users,
} from 'lucide-react';
import { playScannerSound } from '../../services/soundService';
import { PasskeyEnrollModal } from '../../components/auth/PasskeyEnrollModal';
import { analyzePassword } from '../../utils/passwordSecurity';
import { PasswordStrengthMeter } from '../../components/auth/PasswordStrengthMeter';
import { AccountPasswordModal } from '../../components/auth/AccountPasswordModal';
import { getStoredStaffPasswords } from '../../domain/auth';
import {
  authenticatePasskey,
  checkWebAuthnCapability,
  getRegisteredPasskeys,
  PasskeyCredentialRecord,
  WebAuthnCapability,
} from '../../services/webauthnService';

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { language: lang, setLanguage: setLang } = useLanguage();
  const { addToast } = useToast();

  // Mode: Default to 'pin' for standard retail POS workflow
  const [authMode, setAuthMode] = useState<'pin' | 'credentials' | 'biometric'>('pin');
  const [username, setUsername] = useState('john.doe@prodx.io');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Terminal telemetry
  const storeCode = 'STR-01';
  const registerId = 'REG-01';

  // PIN state
  const [pin, setPin] = useState('');
  const [activeStaffPreset, setActiveStaffPreset] = useState<'john' | 'sarah' | 'alex'>('john');

  // WebAuthn Passkeys & Biometric state
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [biometricFeedback, setBiometricFeedback] = useState<string>('');
  const [capability, setCapability] = useState<WebAuthnCapability | null>(null);
  const [enrolledPasskeys, setEnrolledPasskeys] = useState<PasskeyCredentialRecord[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false);

  // QR Badge Scanner state
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrStatus, setQrStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  // Account Password Management & Policy State
  const [showAccountPasswordModal, setShowAccountPasswordModal] = useState(false);
  const [showPasswordPolicyGuide, setShowPasswordPolicyGuide] = useState(false);

  // Realtime clock
  const [currentTime, setCurrentTime] = useState<string>(() =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Staff accounts with passkey and PIN capability
  const staffAccounts = [
    {
      id: 'john' as const,
      userId: 'usr-cashier-john',
      name: 'John Doe',
      role: 'Head Cashier',
      roleKey: 'cashier',
      email: 'john.doe@prodx.io',
      employeeCode: 'EMP-108',
      defaultPin: '0000',
      badgeColor: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
    {
      id: 'sarah' as const,
      userId: 'usr-manager-sarah',
      name: 'Sarah Connor',
      role: 'Shift Manager',
      roleKey: 'manager',
      email: 'sarah.connor@prodx.io',
      employeeCode: 'EMP-014',
      defaultPin: '5678',
      badgeColor: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    {
      id: 'alex' as const,
      userId: 'usr-admin-alex',
      name: 'Alex Vance',
      role: 'Store Lead & Admin',
      roleKey: 'admin',
      email: 'alex.vance@prodx.io',
      employeeCode: 'EMP-001',
      defaultPin: '1234',
      badgeColor: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    },
  ];

  const refreshPasskeys = async () => {
    const keys = getRegisteredPasskeys();
    setEnrolledPasskeys(keys);
    const cap = await checkWebAuthnCapability();
    setCapability(cap);
    return { keys, cap };
  };

  useEffect(() => {
    refreshPasskeys();
  }, []);

  // Keyboard shortcut listener for PIN entry
  useEffect(() => {
    if (authMode !== 'pin' || show2FA || showQrScanner || showEnrollModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlePinDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handlePinClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authMode, pin, activeStaffPreset, show2FA, showQrScanner, showEnrollModal]);

  const handleQrScan = () => {
    if (qrStatus === 'scanning' || qrStatus === 'success') return;
    setQrStatus('scanning');
    playScannerSound('click');
    setTimeout(() => {
      setQrStatus('success');
      playScannerSound('success');
      setTimeout(() => {
        login({
          organizationSlug: 'prodx',
          storeCode,
          registerId,
          emailOrPin: 'john.doe@prodx.io',
          passwordOrPin: 'token-qr-auth',
        }).catch((err: any) => {
          setQrStatus('failed');
          addToast({
            title: lang === 'th' ? 'สแกน QR ไม่ผ่าน' : 'QR Scan Failed',
            message: err.message || 'Authentication failed',
            type: 'error',
          });
        });
      }, 500);
    }, 1200);
  };

  /**
   * WebAuthn Passkeys Authentication Handler (Touch ID / Face ID / Windows Hello)
   */
  const handlePasskeyLogin = async (targetPreset?: (typeof staffAccounts)[0]) => {
    if (biometricStatus === 'scanning' || biometricStatus === 'success') return;
    setBiometricStatus('scanning');
    playScannerSound('click');
    setBiometricFeedback(
      lang === 'th'
        ? 'กำลังเชื่อมต่อเซนเซอร์ Touch ID / Face ID / Windows Hello...'
        : 'Connecting to hardware biometric sensor...'
    );

    try {
      const selectedPreset =
        targetPreset ||
        staffAccounts.find((a) => a.id === activeStaffPreset) ||
        staffAccounts[0];

      const result = await authenticatePasskey({
        id: selectedPreset.userId,
        email: selectedPreset.email,
        name: selectedPreset.name,
      });

      if (result.success && result.credential) {
        setBiometricStatus('success');
        playScannerSound('supervisor_authorized');
        setBiometricFeedback(
          lang === 'th'
            ? `ยืนยันชีวมิติสำเร็จ! กำลังเข้าสู่ระบบ: ${result.credential.userName}`
            : `Biometric verified! Authorizing ${result.credential.userName}`
        );

        await login({
          organizationSlug: 'prodx',
          storeCode,
          registerId,
          emailOrPin: result.credential.userEmail,
          passwordOrPin: result.credential.id,
        });

        addToast({
          title: lang === 'th' ? 'เข้าสู่ระบบสำเร็จ' : 'Authentication Successful',
          message:
            lang === 'th'
              ? `เปิดกะการขายเรียบร้อย ยินดีต้อนรับ ${result.credential.userName}`
              : `Fast shift takeover complete for ${result.credential.userName}`,
          type: 'success',
        });
      } else {
        setBiometricStatus('failed');
        playScannerSound('error');
        setBiometricFeedback(
          result.error || (lang === 'th' ? 'การยืนยันชีวมิติล้มเหลว' : 'Biometric verification cancelled')
        );
        addToast({
          title: lang === 'th' ? 'ชีวมิติไม่ผ่าน' : 'Biometric Cancelled',
          message: result.error || 'Authentication rejected or cancelled',
          type: 'error',
        });
        setTimeout(() => setBiometricStatus('idle'), 2500);
      }
    } catch (err: any) {
      setBiometricStatus('failed');
      playScannerSound('error');
      setBiometricFeedback(err.message || 'Authentication error');
      addToast({
        title: lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
        message: err.message || 'Authentication failed',
        type: 'error',
      });
      setTimeout(() => setBiometricStatus('idle'), 2500);
    }
  };

  const handleCredentialsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      addToast({
        title: lang === 'th' ? 'ข้อมูลไม่ครบถ้วน' : 'Missing Information',
        message: lang === 'th' ? 'กรุณากรอกอีเมลและรหัสผ่าน' : 'Please enter email and password',
        type: 'error',
      });
      return;
    }

    // Real-time security policy evaluation
    if (!passwordAnalysis.isPolicyCompliant) {
      addToast({
        title: lang === 'th' ? 'คำแนะนำความปลอดภัยรหัสผ่าน' : 'Password Security Advisory',
        message:
          lang === 'th'
            ? 'รหัสผ่านยังไม่ตรงตามเกณฑ์ความปลอดภัยองค์กร (PCI-DSS & NIST) แนะนำให้อัปเดตผ่านปุ่ม "จัดการ / รีเซ็ตรหัสผ่าน"'
            : 'Password does not meet enterprise security criteria. You can update it anytime via "Manage / Reset".',
        type: 'warning',
      });
    }

    setShow2FA(true);
  };

  const submit2FA = async () => {
    if (twoFactorCode.length < 6) {
      addToast({
        title: lang === 'th' ? 'รหัสไม่ครบ' : 'Incomplete Code',
        message: lang === 'th' ? 'กรุณากรอกรหัสความปลอดภัย 6 หลัก' : 'Please enter 6-digit code',
        type: 'error',
      });
      return;
    }
    setIsVerifying2FA(true);
    try {
      await login({
        organizationSlug: 'prodx',
        storeCode,
        registerId,
        emailOrPin: username,
        passwordOrPin: password,
      });
      setShow2FA(false);
    } catch (err: any) {
      addToast({
        title: lang === 'th' ? 'การยืนยันล้มเหลว' : 'Verification Failed',
        message: err.message || 'Authentication failed',
        type: 'error',
      });
      setTwoFactorCode('');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      playScannerSound('click');
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        executePinLogin(nextPin);
      }
    }
  };

  const handlePinDelete = () => {
    playScannerSound('click');
    setPin((prev) => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    playScannerSound('click');
    setPin('');
  };

  const executePinLogin = async (completedPin: string) => {
    const selectedAccount = staffAccounts.find((a) => a.id === activeStaffPreset) || staffAccounts[0];
    try {
      await login({
        organizationSlug: 'prodx',
        storeCode,
        registerId,
        emailOrPin: selectedAccount.email,
        passwordOrPin: completedPin,
      });
      playScannerSound('success');
      addToast({
        title: lang === 'th' ? 'เข้าสู่ระบบสำเร็จ' : 'Login Successful',
        message: lang === 'th' ? `ยินดีต้อนรับ ${selectedAccount.name} (${selectedAccount.role})` : `Welcome, ${selectedAccount.name}`,
        type: 'success',
      });
    } catch (err: any) {
      playScannerSound('error');
      addToast({
        title: lang === 'th' ? 'รหัส PIN ไม่ถูกต้อง' : 'Invalid PIN',
        message:
          lang === 'th'
            ? `รหัส PIN สำหรับ ${selectedAccount.name} ไม่ถูกต้อง (ทดสอบ: ${selectedAccount.defaultPin})`
            : `Incorrect PIN for ${selectedAccount.name} (Default: ${selectedAccount.defaultPin})`,
        type: 'error',
      });
      setPin('');
    }
  };

  // Quick 1-click demo filler
  const handleQuickDemoFill = (account: (typeof staffAccounts)[0]) => {
    setActiveStaffPreset(account.id);
    setPin(account.defaultPin);
    executePinLogin(account.defaultPin);
  };

  // Real-time enterprise password security analysis (NIST 800-63B & PCI-DSS)
  const passwordAnalysis = analyzePassword(password, { email: username });

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 text-text font-sans selection:bg-primary selection:text-white">
      {/* Top Global Utility Bar (Desktop only absolute, mobile integrated into header) */}
      <div className="hidden lg:flex absolute top-4 right-4 z-30 items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card/90 backdrop-blur-xs text-text text-xs font-semibold rounded-lg border border-border border-crisp shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-text/50" />
          <span className="font-mono text-[11px] font-bold">{currentTime}</span>
        </div>
        <button
          onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
          aria-label={lang === 'th' ? 'เปลี่ยนเป็นภาษาอังกฤษ' : 'Switch to Thai'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-slate-100 text-text text-xs font-bold rounded-lg border border-border border-crisp shadow-2xs transition-all cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
          <ChevronDown className="w-3 h-3 text-text/50" />
        </button>
      </div>

      {/* LEFT PANEL: Enterprise Architecture Showcase (Visible on lg+ screens) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-12 lg:p-14 bg-slate-950 text-white overflow-hidden border-r border-slate-800">
        {/* Subtle geometric grid backdrop */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(99, 102, 241, 0.5) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[7000ms]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 space-y-6">
          <ProdxLogo variant="horizontal" size="lg" showTagline={true} />

          <div className="space-y-3 pt-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/25 text-[11px] font-bold text-primary tracking-wide">
              <Sparkles className="w-3 h-3" />
              <span>ENTERPRISE POS WORKSTATION</span>
            </div>
            <h1 className="text-2xl xl:text-3xl font-black tracking-tight leading-tight text-slate-100">
              {lang === 'th'
                ? 'ระบบจัดการการขายและควบคุมสิทธิ์หน้าร้าน'
                : 'Mission-Critical Retail POS & RBAC Terminal'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
              {lang === 'th'
                ? 'สถาปัตยกรรมความปลอดภัยระดับองค์กร รองรับการทำงานออฟไลน์ การตรวจสอบสิทธิ์หลายระดับ (RBAC) และบันทึกประวัติการเงินอย่างแม่นยำ 100%'
                : 'Zero-downtime offline-first architecture with strict multi-role governance, granular permissions matrix, and hardware-grade security.'}
            </p>
          </div>

          {/* Enterprise RBAC Role Hierarchy Showcase */}
          <div className="pt-2 space-y-2 max-w-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {lang === 'th' ? 'ลำดับขั้นและสิทธิ์การเข้าถึงระบบ (Role Hierarchy)' : 'Role & Security Governance Matrix'}
            </span>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs">
                    ADM
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">Alex Vance (Administrator)</div>
                    <div className="text-[10px] text-slate-400">
                      {lang === 'th' ? 'ควบคุมทั้งระบบ ภาษี สต็อก รายงาน และนโยบายความปลอดภัย' : 'Full root access, fiscal tax rates & system governance'}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  ADMIN
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs">
                    MGR
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">Sarah Connor (Shift Manager)</div>
                    <div className="text-[10px] text-slate-400">
                      {lang === 'th' ? 'อนุมัติการยกเลิกบิล คืนเงิน ปรับราคา และสรุปยอดกะ Z-Report' : 'Supervisor overrides, void/refund & cash drawer reconciliation'}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  MANAGER
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                    CSH
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">John Doe (Head Cashier)</div>
                    <div className="text-[10px] text-slate-400">
                      {lang === 'th' ? 'คิดเงินหน้าร้าน สแกนบาร์โค้ด และจัดการข้อมูลสมาชิกลูกค้า' : 'Frontline POS register, barcode checkout & loyalty CRM'}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  CASHIER
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Realtime Monitor Grid */}
        <div className="relative z-10 py-6 border-t border-slate-800/80 my-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">TERMINAL NODE</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="font-mono text-xs font-bold text-slate-200 mt-1">STR-01 · REG-01</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Flagship Downtown</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SECURITY SUITE</span>
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="font-mono text-xs font-bold text-slate-200 mt-1">PCI-DSS · FIDO2</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Hardware Passkeys Ready</div>
            </div>
          </div>
        </div>

        {/* Telemetry Footer */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-500 pt-2">
          <div className="flex items-center gap-2 font-mono">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            <span>CORE V4.2.0 · RUNTIME OK</span>
          </div>
          <div className="font-mono text-[10px]">
            <span>OFFLINE DB READY</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Balanced & Cohesive Authentication Workstation */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center p-5 sm:p-10 lg:p-12 relative bg-slate-50">
        <div className="w-full max-w-md space-y-5 mx-auto">
          {/* Mobile Top Utility Bar & Brand Header (Prevents overlapping) */}
          <div className="flex lg:hidden flex-col space-y-3 pb-2 border-b border-slate-200/80">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono text-text/50 font-bold uppercase">TERMINAL REG-01</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-card text-text text-[11px] font-semibold rounded-lg border border-border shadow-2xs">
                  <Clock className="w-3 h-3 text-text/50" />
                  <span className="font-mono">{currentTime}</span>
                </div>
                <button
                  onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-card hover:bg-slate-100 text-text text-xs font-bold rounded-lg border border-border shadow-2xs transition-all cursor-pointer"
                >
                  <Globe className="w-3 h-3 text-primary" />
                  <span>{lang === 'th' ? 'ไทย' : 'EN'}</span>
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center text-center pt-1">
              <ProdxLogo variant="horizontal" size="md" showTagline={true} />
              <p className="text-xs text-text/60 mt-1 font-medium">
                {lang === 'th' ? 'เข้าสู่ระบบสถานีขายหน้าร้าน' : 'Sign in to Terminal Station'}
              </p>
            </div>
          </div>

          {/* Desktop Terminal Header */}
          <div className="hidden lg:block text-left space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {lang === 'th' ? 'เข้าสู่ระบบแคชเชียร์' : 'Terminal Station Sign In'}
              </h2>
              <span className="text-[11px] font-mono font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                REG-01 · ONLINE
              </span>
            </div>
            <p className="text-xs text-text/60">
              {lang === 'th'
                ? 'เลือกรหัส PIN พนักงาน รหัสผ่านองค์กร หรือสแกนลายนิ้วมือเพื่อเริ่มกะ'
                : 'Authenticate using Staff PIN, Enterprise Password, or Biometric Passkey'}
            </p>
          </div>

          {/* Segmented Mode Switcher Tabs */}
          <div className="p-1 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('pin');
                setPin('');
              }}
              className={`flex-1 min-h-[40px] flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                authMode === 'pin'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-text/70 hover:text-text hover:bg-white/50'
              }`}
            >
              <KeyRound className={`w-3.5 h-3.5 ${authMode === 'pin' ? 'text-primary' : ''}`} />
              <span>{lang === 'th' ? 'PIN พนักงาน' : 'Staff PIN'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('credentials')}
              className={`flex-1 min-h-[40px] flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                authMode === 'credentials'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-text/70 hover:text-text hover:bg-white/50'
              }`}
            >
              <UserIcon className={`w-3.5 h-3.5 ${authMode === 'credentials' ? 'text-primary' : ''}`} />
              <span>{lang === 'th' ? 'รหัสผ่าน' : 'Password'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('biometric');
                setBiometricStatus('idle');
              }}
              className={`flex-1 min-h-[40px] flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                authMode === 'biometric'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-text/70 hover:text-text hover:bg-white/50'
              }`}
            >
              <Fingerprint className={`w-3.5 h-3.5 ${authMode === 'biometric' ? 'text-emerald-600' : ''}`} />
              <span>{lang === 'th' ? 'ชีวมิติ (Passkey)' : 'Passkey'}</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* MODE 1: STAFF PIN KEYPAD (PRIMARY POS INTERFACE)        */}
          {/* ======================================================== */}
          {authMode === 'pin' && (
            <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4 animate-in fade-in duration-150">
              {/* Staff Member Avatar Selector */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text/50 flex justify-between items-center">
                  <span>{lang === 'th' ? '1. เลือกพนักงานที่เริ่มกะ' : '1. Select Staff Member'}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {lang === 'th' ? 'กดตัวเลขเพื่อใส่ PIN' : 'Keypad / Keyboard enabled'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {staffAccounts.map((account) => {
                    const isSelected = activeStaffPreset === account.id;
                    const initials = account.name.split(' ').map((n) => n[0]).join('');
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => {
                          setActiveStaffPreset(account.id);
                          setPin('');
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between min-h-[72px] transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-slate-950 font-bold ring-2 ring-primary/30 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/70 text-text/70 hover:border-slate-300 hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                              isSelected ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {initials}
                          </span>
                          <span
                            className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded ${account.badgeColor}`}
                          >
                            {account.roleKey}
                          </span>
                        </div>
                        <div className="mt-1.5 min-w-0">
                          <div className="text-[11px] font-black leading-tight truncate text-slate-900">
                            {account.name}
                          </div>
                          <div className="text-[9px] text-text/50 font-medium truncate mt-0.5">
                            {account.employeeCode}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PIN Bead Indicator */}
              <div className="py-1 flex flex-col items-center justify-center space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text/50">
                  {lang === 'th' ? '2. กรอกรหัส PIN (4 หลัก)' : '2. Enter 4-Digit PIN'}
                </div>
                <div className="flex items-center gap-3.5 pt-1">
                  {[0, 1, 2, 3].map((idx) => {
                    const isFilled = pin.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                          isFilled
                            ? 'bg-primary border-primary scale-110 shadow-xs'
                            : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Tactical Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinDigit(num)}
                    disabled={isLoading}
                    className="h-12 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 active:scale-95 text-lg font-mono font-black text-slate-800 transition-all cursor-pointer select-none flex items-center justify-center shadow-2xs disabled:opacity-50"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinClear}
                  disabled={isLoading || pin.length === 0}
                  className="h-12 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 active:scale-95 transition-all cursor-pointer flex items-center justify-center uppercase shadow-2xs disabled:opacity-40"
                >
                  {lang === 'th' ? 'ล้าง' : 'Clear'}
                </button>
                <button
                  type="button"
                  onClick={() => handlePinDigit('0')}
                  disabled={isLoading}
                  className="h-12 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 active:scale-95 text-lg font-mono font-black text-slate-800 transition-all cursor-pointer select-none flex items-center justify-center shadow-2xs disabled:opacity-50"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinDelete}
                  disabled={isLoading || pin.length === 0}
                  className="h-12 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-2xs disabled:opacity-40"
                  title="Backspace"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Demo 1-Click Login Shortcuts */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-text/50 font-bold uppercase tracking-wider">
                  <span>{lang === 'th' ? 'เข้าสู่ระบบทดสอบทันที (1-Click Demo)' : 'Quick 1-Click Demo Fill'}</span>
                  <span className="font-mono text-primary font-semibold">Ready</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {staffAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleQuickDemoFill(acc)}
                      disabled={isLoading}
                      className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-slate-200/80 text-left text-[11px] font-bold text-slate-700 transition-all cursor-pointer flex flex-col"
                    >
                      <span className="truncate">{acc.name.split(' ')[0]}</span>
                      <span className="text-[9px] font-mono text-text/50 font-normal">
                        PIN: {acc.defaultPin}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 2: ENTERPRISE CREDENTIALS & 2FA                     */}
          {/* ======================================================== */}
          {authMode === 'credentials' && (
            <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4 animate-in fade-in duration-150">
              <form onSubmit={handleCredentialsSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {lang === 'th' ? 'อีเมลองค์กร' : 'Enterprise Email'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text/40">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="user@prodx.io"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-text text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all placeholder:text-text/40 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      {lang === 'th' ? 'รหัสผ่าน' : 'Password'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAccountPasswordModal(true)}
                      className="text-[11px] font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer flex items-center gap-1 hover:underline"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>{lang === 'th' ? 'จัดการ / รีเซ็ตรหัสผ่าน' : 'Manage / Reset'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text/40">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={lang === 'th' ? 'กรอกรหัสผ่านองค์กร' : 'Enter enterprise password'}
                      className="w-full h-10 pl-9 pr-9 rounded-lg border border-slate-200 bg-slate-50 text-text text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all placeholder:text-text/40 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-text/40 hover:text-text cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Real-time Password Strength Meter & Validation Criteria */}
                  {password.length > 0 ? (
                    <div className="mt-2.5">
                      <PasswordStrengthMeter
                        analysis={passwordAnalysis}
                        language={lang}
                        showCriteriaList={true}
                        showEntropyInfo={true}
                        compact={false}
                      />
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-text/50 font-mono">
                      <button
                        type="button"
                        onClick={() => setShowPasswordPolicyGuide(!showPasswordPolicyGuide)}
                        className="hover:text-primary underline cursor-pointer text-left transition-colors"
                      >
                        {showPasswordPolicyGuide
                          ? (lang === 'th' ? 'ซ่อนเกณฑ์ความปลอดภัย' : 'Hide security criteria')
                          : (lang === 'th' ? 'ดูเกณฑ์ความปลอดภัยรหัสผ่าน (NIST & PCI-DSS)' : 'View password criteria (NIST & PCI-DSS)')}
                      </button>
                      <span className="text-primary font-bold">256-BIT CRYPTO</span>
                    </div>
                  )}

                  {/* Expandable Criteria Preview when password is empty */}
                  {password.length === 0 && showPasswordPolicyGuide && (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1 animate-in fade-in duration-150">
                      <div className="font-bold text-slate-900 text-xs mb-1 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        <span>{lang === 'th' ? 'เกณฑ์ความปลอดภัยรหัสผ่านที่กำหนด:' : 'Enterprise Password Policy:'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <div>• {lang === 'th' ? 'ความยาวอย่างน้อย 8 ตัวอักษร' : 'Minimum 8 characters'}</div>
                        <div>• {lang === 'th' ? 'ตัวพิมพ์ใหญ่ (A-Z)' : 'Uppercase letter (A-Z)'}</div>
                        <div>• {lang === 'th' ? 'ตัวพิมพ์เล็ก (a-z)' : 'Lowercase letter (a-z)'}</div>
                        <div>• {lang === 'th' ? 'ตัวเลข (0-9)' : 'Numeric digit (0-9)'}</div>
                        <div>• {lang === 'th' ? 'อักขระพิเศษ (!@#$...)' : 'Special symbol (!@#$...)'}</div>
                        <div>• {lang === 'th' ? 'ไม่มีรูปแบบคาดเดาได้' : 'No keyboard walk or patterns'}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-text/70">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary bg-slate-50"
                    />
                    <span className="text-[11px]">{lang === 'th' ? 'จดจำอุปกรณ์' : 'Remember terminal'}</span>
                  </label>
                  <span className="text-slate-400 font-mono text-[10px]">2FA SECURED</span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{lang === 'th' ? 'เข้าสู่ระบบด้วยรหัสผ่าน' : 'Sign In with Password'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Fill Credentials Chips */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text/50">
                    {lang === 'th' ? 'เลือกบัญชีทดสอบด่วน (รหัสผ่านความปลอดภัยสูง)' : 'Quick Demo Accounts (Secure)'}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-mono font-bold">100% PCI-DSS</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {staffAccounts.map((acc) => {
                    const storedPasswords = getStoredStaffPasswords();
                    const userPass = storedPasswords[acc.userId] ?? '';
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setUsername(acc.email);
                          setPassword(userPass);
                        }}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left text-[11px] transition-all cursor-pointer group"
                      >
                        <div className="font-bold text-slate-800 truncate group-hover:text-primary">{acc.name.split(' ')[0]}</div>
                        <div className="text-[9px] text-text/50 uppercase">{acc.roleKey}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Options */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('biometric')}
                  className="h-9 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Fingerprint className="w-3.5 h-3.5 text-primary" />
                  <span>Passkey</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQrStatus('idle');
                    setShowQrScanner(true);
                  }}
                  className="h-9 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <QrCode className="w-3.5 h-3.5 text-primary" />
                  <span>Scan QR Badge</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 3: WEBAUTHN BIOMETRIC PASSKEYS                      */}
          {/* ======================================================== */}
          {authMode === 'biometric' && (
            <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4 animate-in fade-in duration-150">
              {/* Cashier Target Selector */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text/50 flex justify-between items-center">
                  <span>{lang === 'th' ? 'เลือกบัญชีพนักงาน' : 'Select Target Staff'}</span>
                  <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    FIDO2
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {staffAccounts.map((account) => {
                    const isSelected = activeStaffPreset === account.id;
                    const initials = account.name.split(' ').map((n) => n[0]).join('');
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => setActiveStaffPreset(account.id)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between min-h-[68px] transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/50 text-slate-950 font-bold ring-2 ring-emerald-500/30'
                            : 'border-slate-200 bg-slate-50/70 text-text/70 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                              isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {initials}
                          </span>
                          <span className="text-[8px] font-mono text-emerald-800 font-bold">READY</span>
                        </div>
                        <div className="mt-1 min-w-0">
                          <div className="text-[11px] font-black leading-tight truncate text-slate-900">
                            {account.name}
                          </div>
                          <div className="text-[9px] text-text/50 font-medium truncate">
                            {account.roleKey}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Centered Biometric Sensor Pod */}
              <div className="py-3 flex flex-col items-center justify-center text-center space-y-3">
                <button
                  type="button"
                  onClick={() => handlePasskeyLogin()}
                  disabled={biometricStatus === 'scanning' || isLoading}
                  className={`w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${
                    biometricStatus === 'scanning'
                      ? 'border-primary bg-primary/10 text-primary ring-4 ring-primary/20 scale-105'
                      : biometricStatus === 'success'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600 scale-105'
                      : biometricStatus === 'failed'
                      ? 'border-rose-500 bg-rose-50 text-rose-600'
                      : 'border-emerald-500/60 bg-gradient-to-b from-white to-emerald-50/30 text-emerald-700 ring-4 ring-emerald-100 hover:border-emerald-600 hover:scale-102'
                  }`}
                >
                  {biometricStatus === 'scanning' ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : biometricStatus === 'success' ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  ) : capability?.biometricLabel?.toLowerCase().includes('face') ? (
                    <ScanFace className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <Fingerprint className="w-8 h-8 text-emerald-600" />
                  )}
                  <span className="text-[9px] font-mono font-black uppercase tracking-wider">
                    {biometricStatus === 'scanning'
                      ? 'SCANNING'
                      : biometricStatus === 'success'
                      ? 'VERIFIED'
                      : 'TOUCH SENSOR'}
                  </span>
                </button>

                <div className="text-center px-4 space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">
                    {biometricFeedback ||
                      (lang === 'th'
                        ? 'แตะเซนเซอร์ลายนิ้วมือหรือคลิกเพื่อเริ่มสแกน'
                        : 'Touch hardware sensor or click above to authenticate')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {capability?.biometricLabel || 'W3C WebAuthn Level 3 Standard'}
                  </p>
                </div>
              </div>

              {/* Main Action Button */}
              <button
                type="button"
                onClick={() => handlePasskeyLogin()}
                disabled={biometricStatus === 'scanning' || isLoading}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {biometricStatus === 'scanning' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>
                      {lang === 'th'
                        ? 'ยืนยันตัวตนด้วยชีวมิติ'
                        : 'Authenticate with Biometrics'}
                    </span>
                  </>
                )}
              </button>

              {/* Passkey Management Link */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(true)}
                  className="text-text/70 hover:text-primary transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5 text-primary" />
                  <span>{lang === 'th' ? 'จัดการ Passkeys' : 'Manage Passkeys'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMode('pin')}
                  className="text-slate-400 hover:text-slate-600 transition-colors font-medium cursor-pointer"
                >
                  {lang === 'th' ? 'ใช้รหัส PIN แทน' : 'Use PIN instead'}
                </button>
              </div>
            </div>
          )}

          {/* Bottom Footer Info with Developed By */}
          <div className="pt-3 border-t border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-text/40 font-mono uppercase tracking-wider px-1">
              <span>PRODX POS · ENTERPRISE RUNTIME v4.2</span>
              <div className="flex items-center gap-1">
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>OFFLINE MESH READY</span>
              </div>
            </div>
            <div className="text-center pt-1 pb-1">
              <span className="text-[10px] font-mono font-black tracking-widest text-slate-500 uppercase bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs inline-block">
                DEVELOPED BY THODSAWAT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* WEBAUTHN PASSKEYS ENROLLMENT MODAL */}
      {showEnrollModal && (
        <PasskeyEnrollModal
          isOpen={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          onPasskeysUpdated={refreshPasskeys}
        />
      )}

      {/* 2-FACTOR AUTHENTICATION MODAL */}
      {show2FA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {lang === 'th' ? 'การยืนยันตัวตนสองขั้นตอน (2FA)' : 'Two-Factor Authentication'}
              </h3>
              <p className="text-xs text-text/60 mt-1">
                {lang === 'th'
                  ? 'กรอกรหัสความปลอดภัย 6 หลักจาก Authenticator App'
                  : 'Enter 6-digit security code (Demo: any 6 digits e.g. 123456)'}
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full text-center tracking-[0.5em] font-mono text-xl font-black h-12 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-[10px] text-text/50 font-mono">
                {lang === 'th' ? 'โหมดทดสอบ: กรอกเลขใดก็ได้ 6 หลัก' : 'Demo bypass: Type any 6 digits'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShow2FA(false)}
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer"
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={submit2FA}
                disabled={isVerifying2FA || twoFactorCode.length < 6}
                className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isVerifying2FA ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{lang === 'th' ? 'ยืนยัน' : 'Verify'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR BADGE SCANNER MODAL */}
      {showQrScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 text-center">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <QrCode className="w-4 h-4 text-primary" />
                <span>{lang === 'th' ? 'สแกนบัตรพนักงาน (QR Badge)' : 'Scan Staff Badge'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQrScanner(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-square w-48 mx-auto rounded-xl border-2 border-dashed border-primary/50 bg-slate-50 flex flex-col items-center justify-center p-4 overflow-hidden">
              {qrStatus === 'scanning' ? (
                <>
                  <div className="absolute inset-x-0 h-0.5 bg-primary animate-bounce shadow-md" />
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <span className="text-[11px] font-mono text-primary font-bold mt-2">SCANNING BADGE...</span>
                </>
              ) : qrStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce" />
                  <span className="text-xs font-bold text-emerald-600 mt-2">BADGE VERIFIED!</span>
                </>
              ) : (
                <>
                  <QrCode className="w-14 h-14 text-slate-400" />
                  <span className="text-[11px] text-slate-500 font-medium mt-2">
                    {lang === 'th' ? 'วางบัตรหน้ากล้องสแกน' : 'Place badge in front of scanner'}
                  </span>
                </>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleQrScan}
                disabled={qrStatus === 'scanning' || qrStatus === 'success'}
                className="w-full h-10 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'จำลองการสแกนบัตรพนักงาน' : 'Simulate Badge Scan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Password Management Modal */}
      {showAccountPasswordModal && (
        <AccountPasswordModal
          isOpen={showAccountPasswordModal}
          onClose={() => setShowAccountPasswordModal(false)}
          language={lang}
          onPasswordUpdated={(userId, newPass) => {
            const staff = staffAccounts.find((s) => s.userId === userId);
            if (staff) {
              setUsername(staff.email);
              setPassword(newPass);
            }
          }}
        />
      )}
    </div>
  );
};
