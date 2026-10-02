import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { ProdxLogo } from '../../components/common/ProdxLogo';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  QrCode,
  ScanFace,
  Settings2,
  ShieldCheck,
  User as UserIcon,
  Zap,
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
import { IS_DEV_BUILD, STAFF_ACCOUNTS, type StaffAccount, type StaffId } from './staffAccounts';
import { AuthModeTabs, type AuthMode } from './components/AuthModeTabs';
import { LoginBackdrop } from './components/LoginBackdrop';
import { LoginDialog } from './components/LoginDialog';
import { PinPad } from './components/PinPad';
import { ShowcasePanel } from './components/ShowcasePanel';
import { StaffPicker } from './components/StaffPicker';

const PIN_LENGTH = 4;
const STORE_CODE = 'STR-01';
const REGISTER_ID = 'REG-01';
const LOGO_ON_DARK = { '--text-color': '#F8FAFC', '--text-muted': '#A1A1AA' } as React.CSSProperties;

const formatClock = () =>
  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const SECONDARY_BUTTON =
  'flex h-12 items-center justify-center gap-2 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] px-4 text-[13px] font-semibold text-neutral-200 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.07)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 disabled:pointer-events-none disabled:opacity-40';

const PRIMARY_BUTTON =
  'flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-violet-400 to-violet-600 text-[15px] font-semibold text-neutral-50 shadow-[0_14px_36px_-12px_rgba(139,92,246,0.85),inset_0_1px_0_0_rgba(255,255,255,0.28)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-10px_rgba(139,92,246,0.95),inset_0_1px_0_0_rgba(255,255,255,0.28)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80 disabled:pointer-events-none disabled:opacity-50';

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { language: lang, setLanguage: setLang } = useLanguage();
  const { addToast } = useToast();
  const language: 'th' | 'en' = lang === 'th' ? 'th' : 'en';
  const t = (th: string, en: string) => (language === 'th' ? th : en);

  const [authMode, setAuthMode] = useState<AuthMode>('pin');
  const [username, setUsername] = useState('john.doe@prodx.io');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeStaffId, setActiveStaffId] = useState<StaffId>('john');
  const isSubmittingPin = useRef(false);

  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [biometricFeedback, setBiometricFeedback] = useState('');
  const [capability, setCapability] = useState<WebAuthnCapability | null>(null);
  const [enrolledPasskeys, setEnrolledPasskeys] = useState<PasskeyCredentialRecord[]>([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrStatus, setQrStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  const [showAccountPasswordModal, setShowAccountPasswordModal] = useState(false);
  const [showPasswordPolicyGuide, setShowPasswordPolicyGuide] = useState(false);

  const [currentTime, setCurrentTime] = useState(formatClock);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(formatClock()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeStaff: StaffAccount = STAFF_ACCOUNTS.find((a) => a.id === activeStaffId) ?? STAFF_ACCOUNTS[0];

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

  const executePinLogin = useCallback(
    async (completedPin: string, account: StaffAccount) => {
      if (isSubmittingPin.current) return;
      isSubmittingPin.current = true;
      try {
        await login({
          organizationSlug: 'prodx',
          storeCode: STORE_CODE,
          registerId: REGISTER_ID,
          emailOrPin: account.email,
          passwordOrPin: completedPin,
        });
        playScannerSound('success');
        addToast({
          title: t('เข้าสู่ระบบสำเร็จ', 'Login Successful'),
          message: t(`ยินดีต้อนรับ ${account.name} (${account.role})`, `Welcome, ${account.name}`),
          type: 'success',
        });
      } catch {
        playScannerSound('error');
        setPinError(true);
        addToast({
          title: t('รหัส PIN ไม่ถูกต้อง', 'Invalid PIN'),
          message: IS_DEV_BUILD
            ? t(
                `รหัส PIN สำหรับ ${account.name} ไม่ถูกต้อง (ทดสอบ: ${account.defaultPin})`,
                `Incorrect PIN for ${account.name} (Default: ${account.defaultPin})`
              )
            : t(`รหัส PIN สำหรับ ${account.name} ไม่ถูกต้อง`, `Incorrect PIN for ${account.name}`),
          type: 'error',
        });
        setTimeout(() => {
          setPinError(false);
          setPin('');
        }, 520);
      } finally {
        isSubmittingPin.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [login, addToast, language]
  );

  const handlePinDigit = useCallback(
    (digit: string) => {
      if (isLoading || pinError || isSubmittingPin.current || pin.length >= PIN_LENGTH) return;
      playScannerSound('click');
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === PIN_LENGTH) {
        void executePinLogin(nextPin, activeStaff);
      }
    },
    [isLoading, pinError, pin, activeStaff, executePinLogin]
  );

  const handlePinDelete = useCallback(() => {
    if (pinError) return;
    playScannerSound('click');
    setPin((prev) => prev.slice(0, -1));
  }, [pinError]);

  const handlePinClear = useCallback(() => {
    if (pinError) return;
    playScannerSound('click');
    setPin('');
  }, [pinError]);

  const isModalOpen = show2FA || showQrScanner || showEnrollModal || showAccountPasswordModal;

  useEffect(() => {
    if (authMode !== 'pin' || isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
  }, [authMode, isModalOpen, handlePinDigit, handlePinDelete, handlePinClear]);

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
          storeCode: STORE_CODE,
          registerId: REGISTER_ID,
          emailOrPin: 'john.doe@prodx.io',
          passwordOrPin: 'token-qr-auth',
        }).catch((err: Error) => {
          setQrStatus('failed');
          addToast({
            title: t('สแกน QR ไม่ผ่าน', 'QR Scan Failed'),
            message: err.message || 'Authentication failed',
            type: 'error',
          });
        });
      }, 500);
    }, 1200);
  };

  const handlePasskeyLogin = async () => {
    if (biometricStatus === 'scanning' || biometricStatus === 'success') return;
    setBiometricStatus('scanning');
    playScannerSound('click');
    setBiometricFeedback(
      t('กำลังเชื่อมต่อเซนเซอร์ Touch ID / Face ID / Windows Hello...', 'Connecting to hardware biometric sensor...')
    );

    try {
      const result = await authenticatePasskey({
        id: activeStaff.userId,
        email: activeStaff.email,
        name: activeStaff.name,
      });

      if (result.success && result.credential) {
        setBiometricStatus('success');
        playScannerSound('supervisor_authorized');
        setBiometricFeedback(
          t(
            `ยืนยันชีวมิติสำเร็จ! กำลังเข้าสู่ระบบ: ${result.credential.userName}`,
            `Biometric verified! Authorizing ${result.credential.userName}`
          )
        );

        await login({
          organizationSlug: 'prodx',
          storeCode: STORE_CODE,
          registerId: REGISTER_ID,
          emailOrPin: result.credential.userEmail,
          passwordOrPin: result.credential.id,
        });

        addToast({
          title: t('เข้าสู่ระบบสำเร็จ', 'Authentication Successful'),
          message: t(
            `เปิดกะการขายเรียบร้อย ยินดีต้อนรับ ${result.credential.userName}`,
            `Fast shift takeover complete for ${result.credential.userName}`
          ),
          type: 'success',
        });
      } else {
        setBiometricStatus('failed');
        playScannerSound('error');
        setBiometricFeedback(result.error || t('การยืนยันชีวมิติล้มเหลว', 'Biometric verification cancelled'));
        addToast({
          title: t('ชีวมิติไม่ผ่าน', 'Biometric Cancelled'),
          message: result.error || 'Authentication rejected or cancelled',
          type: 'error',
        });
        setTimeout(() => setBiometricStatus('idle'), 2500);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setBiometricStatus('failed');
      playScannerSound('error');
      setBiometricFeedback(message);
      addToast({ title: t('เกิดข้อผิดพลาด', 'Error'), message, type: 'error' });
      setTimeout(() => setBiometricStatus('idle'), 2500);
    }
  };

  const passwordAnalysis = analyzePassword(password, { email: username });

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      addToast({
        title: t('ข้อมูลไม่ครบถ้วน', 'Missing Information'),
        message: t('กรุณากรอกอีเมลและรหัสผ่าน', 'Please enter email and password'),
        type: 'error',
      });
      return;
    }

    if (!passwordAnalysis.isPolicyCompliant) {
      addToast({
        title: t('คำแนะนำความปลอดภัยรหัสผ่าน', 'Password Security Advisory'),
        message: t(
          'รหัสผ่านยังไม่ตรงตามเกณฑ์ความปลอดภัยองค์กร (PCI-DSS & NIST) แนะนำให้อัปเดตผ่านปุ่ม "จัดการ / รีเซ็ตรหัสผ่าน"',
          'Password does not meet enterprise security criteria. You can update it anytime via "Manage / Reset".'
        ),
        type: 'warning',
      });
    }

    setShow2FA(true);
  };

  const submit2FA = async () => {
    if (twoFactorCode.length < 6) {
      addToast({
        title: t('รหัสไม่ครบ', 'Incomplete Code'),
        message: t('กรุณากรอกรหัสความปลอดภัย 6 หลัก', 'Please enter 6-digit code'),
        type: 'error',
      });
      return;
    }
    setIsVerifying2FA(true);
    try {
      await login({
        organizationSlug: 'prodx',
        storeCode: STORE_CODE,
        registerId: REGISTER_ID,
        emailOrPin: username,
        passwordOrPin: password,
      });
      setShow2FA(false);
    } catch (err) {
      addToast({
        title: t('การยืนยันล้มเหลว', 'Verification Failed'),
        message: err instanceof Error ? err.message : 'Authentication failed',
        type: 'error',
      });
      setTwoFactorCode('');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const selectStaff = (id: StaffId) => {
    setActiveStaffId(id);
    setPin('');
    setPinError(false);
  };

  const quickSignIn = (account: StaffAccount) => {
    setActiveStaffId(account.id);
    setPin(account.defaultPin);
    void executePinLogin(account.defaultPin, account);
  };

  const changeMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setPin('');
    setPinError(false);
    if (mode === 'biometric') setBiometricStatus('idle');
  };

  const openQrScanner = () => {
    setQrStatus('idle');
    setShowQrScanner(true);
  };

  const BiometricIcon = capability?.biometricLabel?.toLowerCase().includes('face') ? ScanFace : Fingerprint;

  return (
    <div className="relative flex min-h-dvh w-full bg-[#07070c] text-neutral-100 selection:bg-violet-500/40">
      <LoginBackdrop />
      <ShowcasePanel language={language} storeCode={STORE_CODE} registerId={REGISTER_ID} />

      <main className="relative z-10 flex min-w-0 flex-1 justify-center px-5 pb-10 pt-5 sm:px-8 lg:items-center lg:px-12">
        <div className="flex w-full max-w-[480px] flex-col gap-6">
          <header className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
              <span className="login-glass inline-flex items-center gap-2.5 rounded-full py-1.5 pl-3 pr-3.5 text-xs font-medium text-neutral-300">
                <span className="relative flex h-2 w-2">
                  <span className="login-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono">
                  {STORE_CODE} · {REGISTER_ID}
                </span>
                <span className="text-emerald-300">{t('ออนไลน์', 'Online')}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="login-glass inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-mono text-xs text-neutral-300">
                  <Clock className="h-3.5 w-3.5 text-neutral-500" strokeWidth={1.75} />
                  {currentTime}
                </span>
                <button
                  type="button"
                  onClick={() => setLang(language === 'th' ? 'en' : 'th')}
                  aria-label={t('เปลี่ยนเป็นภาษาอังกฤษ', 'Switch to Thai')}
                  className="login-glass inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-neutral-200 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
                >
                  <Globe className="h-3.5 w-3.5 text-violet-300" strokeWidth={1.75} />
                  {language === 'th' ? 'ไทย' : 'EN'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:hidden" style={LOGO_ON_DARK}>
              <ProdxLogo variant="horizontal" size="md" showTagline={false} />
            </div>

            <div className="space-y-2">
              <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-neutral-50">
                {t('เข้าสู่ระบบสถานีขาย', 'Sign in to terminal')}
              </h1>
              <p className="text-[15px] leading-relaxed text-neutral-400">
                {t('เลือกพนักงานและยืนยันตัวตนเพื่อเริ่มกะขาย', 'Choose your profile and verify to start your shift.')}
              </p>
            </div>
          </header>

          <AuthModeTabs mode={authMode} onChange={changeMode} language={language} />

          <section
            key={authMode}
            role="tabpanel"
            className="login-glass login-sheet-in rounded-[28px] p-5 sm:p-6"
          >
            {authMode === 'pin' && (
              <div className="space-y-7">
                <StaffPicker
                  accounts={STAFF_ACCOUNTS}
                  selectedId={activeStaffId}
                  onSelect={selectStaff}
                  language={language}
                  legend={t('1 · เลือกพนักงาน', '1 · Select staff')}
                />
                <div className="space-y-4">
                  <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                    {t(`2 · กรอก PIN ${PIN_LENGTH} หลัก`, `2 · Enter ${PIN_LENGTH}-digit PIN`)}
                  </p>
                  <PinPad
                    pin={pin}
                    length={PIN_LENGTH}
                    hasError={pinError}
                    disabled={isLoading}
                    language={language}
                    onDigit={handlePinDigit}
                    onDelete={handlePinDelete}
                    onClear={handlePinClear}
                  />
                </div>
              </div>
            )}

            {authMode === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-[13px] font-semibold text-neutral-300">
                    {t('อีเมลองค์กร', 'Enterprise email')}
                  </label>
                  <div className="relative">
                    <UserIcon
                      className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                      strokeWidth={1.75}
                    />
                    <input
                      id="login-email"
                      type="email"
                      inputMode="email"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="user@prodx.io"
                      className="login-field h-14 w-full rounded-2xl pl-11 pr-4 text-[15px] transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="login-password" className="text-[13px] font-semibold text-neutral-300">
                      {t('รหัสผ่าน', 'Password')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAccountPasswordModal(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200 focus-visible:outline-none focus-visible:underline"
                    >
                      <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {t('จัดการ / รีเซ็ต', 'Manage / Reset')}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                      strokeWidth={1.75}
                    />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('กรอกรหัสผ่านองค์กร', 'Enter enterprise password')}
                      className="login-field h-14 w-full rounded-2xl pl-11 pr-14 text-[15px] transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t('ซ่อนรหัสผ่าน', 'Hide password') : t('แสดงรหัสผ่าน', 'Show password')}
                      className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      )}
                    </button>
                  </div>

                  {password.length > 0 ? (
                    <div className="pt-1">
                      <PasswordStrengthMeter
                        analysis={passwordAnalysis}
                        language={language}
                        showCriteriaList={true}
                        showEntropyInfo={true}
                        compact={false}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPasswordPolicyGuide((v) => !v)}
                      aria-expanded={showPasswordPolicyGuide}
                      className="flex items-center gap-1.5 pt-1 text-xs text-neutral-500 transition-colors hover:text-violet-300 focus-visible:outline-none focus-visible:underline"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {showPasswordPolicyGuide
                        ? t('ซ่อนเกณฑ์ความปลอดภัย', 'Hide security criteria')
                        : t('ดูเกณฑ์ความปลอดภัยรหัสผ่าน (NIST & PCI-DSS)', 'View password criteria (NIST & PCI-DSS)')}
                    </button>
                  )}

                  {password.length === 0 && showPasswordPolicyGuide && (
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] p-3.5 text-xs text-neutral-400">
                      <li>{t('อย่างน้อย 8 ตัวอักษร', 'Minimum 8 characters')}</li>
                      <li>{t('ตัวพิมพ์ใหญ่ (A-Z)', 'Uppercase (A-Z)')}</li>
                      <li>{t('ตัวพิมพ์เล็ก (a-z)', 'Lowercase (a-z)')}</li>
                      <li>{t('ตัวเลข (0-9)', 'Digit (0-9)')}</li>
                      <li>{t('อักขระพิเศษ (!@#$)', 'Symbol (!@#$)')}</li>
                      <li>{t('ไม่มีรูปแบบคาดเดาง่าย', 'No guessable patterns')}</li>
                    </ul>
                  )}
                </div>

                <label className="flex cursor-pointer select-none items-center gap-3 text-sm text-neutral-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-5 w-5 rounded-md border-neutral-600 bg-transparent accent-violet-500"
                  />
                  {t('จดจำอุปกรณ์นี้', 'Remember this terminal')}
                </label>

                <button type="submit" disabled={isLoading} className={PRIMARY_BUTTON}>
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {t('เข้าสู่ระบบ', 'Sign in')}
                      <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </>
                  )}
                </button>
              </form>
            )}

            {authMode === 'biometric' && (
              <div className="space-y-7">
                <StaffPicker
                  accounts={STAFF_ACCOUNTS}
                  selectedId={activeStaffId}
                  onSelect={setActiveStaffId}
                  language={language}
                  legend={t('เลือกบัญชีพนักงาน', 'Select staff')}
                />

                <div className="flex flex-col items-center gap-5 text-center">
                  <div className="relative flex h-40 w-40 items-center justify-center">
                    {biometricStatus === 'scanning' && (
                      <>
                        <span className="login-ring absolute inset-4 rounded-full border border-violet-300/50" />
                        <span
                          className="login-ring absolute inset-4 rounded-full border border-violet-300/40"
                          style={{ animationDelay: '-1.1s' }}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handlePasskeyLogin}
                      disabled={biometricStatus === 'scanning' || biometricStatus === 'success' || isLoading}
                      aria-label={t('สแกนชีวมิติ', 'Scan biometrics')}
                      className={`relative flex h-28 w-28 items-center justify-center rounded-full border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/80 disabled:pointer-events-none ${
                        biometricStatus === 'success'
                          ? 'border-emerald-300/60 bg-emerald-400/15 text-emerald-300 shadow-[0_0_60px_-6px_rgba(52,211,153,0.6)]'
                          : biometricStatus === 'failed'
                            ? 'border-rose-300/60 bg-rose-400/15 text-rose-300 shadow-[0_0_60px_-6px_rgba(251,113,133,0.55)]'
                            : 'border-violet-300/40 bg-violet-400/15 text-violet-200 shadow-[0_0_60px_-10px_rgba(139,92,246,0.8)] hover:border-violet-200/70'
                      }`}
                    >
                      {biometricStatus === 'scanning' ? (
                        <Loader2 className="h-12 w-12 animate-spin" strokeWidth={1.25} />
                      ) : biometricStatus === 'success' ? (
                        <CheckCircle2 className="h-12 w-12" strokeWidth={1.25} />
                      ) : (
                        <BiometricIcon className="h-12 w-12" strokeWidth={1.25} />
                      )}
                    </button>
                  </div>

                  <div className="space-y-1" role="status" aria-live="polite">
                    <p className="text-[15px] font-semibold text-neutral-100">
                      {biometricFeedback || t('แตะเพื่อสแกนลายนิ้วมือหรือใบหน้า', 'Tap to scan fingerprint or face')}
                    </p>
                    <p className="font-mono text-xs text-neutral-500">
                      {capability?.biometricLabel || 'WebAuthn · FIDO2'}
                      {enrolledPasskeys.length > 0 && ` · ${enrolledPasskeys.length} ${t('คีย์', 'keys')}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handlePasskeyLogin}
                    disabled={biometricStatus === 'scanning' || biometricStatus === 'success' || isLoading}
                    className={PRIMARY_BUTTON}
                  >
                    <Fingerprint className="h-5 w-5" strokeWidth={1.75} />
                    {t('ยืนยันตัวตนด้วยชีวมิติ', 'Authenticate with biometrics')}
                  </button>
                  <button type="button" onClick={() => setShowEnrollModal(true)} className={`${SECONDARY_BUTTON} w-full`}>
                    <Settings2 className="h-4 w-4 text-violet-300" strokeWidth={1.75} />
                    {t('จัดการ Passkeys', 'Manage passkeys')}
                  </button>
                </div>
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={openQrScanner} className={SECONDARY_BUTTON}>
              <QrCode className="h-4 w-4 text-violet-300" strokeWidth={1.75} />
              {t('สแกนบัตรพนักงาน', 'Scan staff badge')}
            </button>
            <button
              type="button"
              onClick={() => changeMode(authMode === 'pin' ? 'biometric' : 'pin')}
              className={SECONDARY_BUTTON}
            >
              {authMode === 'pin' ? (
                <>
                  <Fingerprint className="h-4 w-4 text-violet-300" strokeWidth={1.75} />
                  {t('ใช้ Passkey', 'Use passkey')}
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 text-violet-300" strokeWidth={1.75} />
                  {t('ใช้ PIN แทน', 'Use PIN instead')}
                </>
              )}
            </button>
          </div>

          {IS_DEV_BUILD && authMode !== 'biometric' && (
            <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.12)] p-3.5">
              <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                <Zap className="h-3.5 w-3.5 text-amber-300" strokeWidth={1.75} />
                {t('ทางลัดสำหรับนักพัฒนา', 'Developer quick sign-in')}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {STAFF_ACCOUNTS.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      if (authMode === 'pin') {
                        quickSignIn(account);
                      } else {
                        setUsername(account.email);
                        setPassword(getStoredStaffPasswords()[account.userId] ?? '');
                      }
                    }}
                    className="flex min-h-12 flex-col items-start justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.18)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 disabled:opacity-40"
                  >
                    <span className="text-[13px] font-semibold text-neutral-200">{account.firstName}</span>
                    <span className="font-mono text-[10px] text-neutral-500">PIN {account.defaultPin}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <footer className="flex items-center justify-between gap-3 px-1 pt-1 text-[11px] text-neutral-600">
            <span className="font-mono uppercase tracking-widest">PRODX POS · v4.2</span>
            <span className="font-mono uppercase tracking-widest">Developed by Thodsawat</span>
          </footer>
        </div>
      </main>

      {showEnrollModal && (
        <PasskeyEnrollModal
          isOpen={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          onPasskeysUpdated={refreshPasskeys}
        />
      )}

      {show2FA && (
        <LoginDialog
          title={t('ยืนยันตัวตนสองขั้นตอน', 'Two-factor authentication')}
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.75} />}
          closeLabel={t('ปิด', 'Close')}
          onClose={() => setShow2FA(false)}
        >
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-neutral-400">
              {t('กรอกรหัสความปลอดภัย 6 หลักจากแอป Authenticator', 'Enter the 6-digit code from your authenticator app.')}
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="000000"
              aria-label={t('รหัส 6 หลัก', '6-digit code')}
              autoFocus
              className="login-field h-16 w-full rounded-2xl text-center font-mono text-3xl tracking-[0.4em]"
            />
            {IS_DEV_BUILD && (
              <p className="text-center font-mono text-[11px] text-neutral-600">
                {t('โหมดทดสอบ: กรอกเลขใดก็ได้ 6 หลัก', 'Dev mode: any 6 digits are accepted')}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShow2FA(false)} className={SECONDARY_BUTTON}>
                {t('ยกเลิก', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={submit2FA}
                disabled={isVerifying2FA || twoFactorCode.length < 6}
                className={`${PRIMARY_BUTTON} !h-12 !rounded-xl !text-sm`}
              >
                {isVerifying2FA ? <Loader2 className="h-5 w-5 animate-spin" /> : t('ยืนยัน', 'Verify')}
              </button>
            </div>
          </div>
        </LoginDialog>
      )}

      {showQrScanner && (
        <LoginDialog
          title={t('สแกนบัตรพนักงาน', 'Scan staff badge')}
          icon={<QrCode className="h-5 w-5" strokeWidth={1.75} />}
          closeLabel={t('ปิด', 'Close')}
          onClose={() => setShowQrScanner(false)}
        >
          <div className="space-y-5">
            <div
              className="relative mx-auto flex aspect-square w-52 flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-dashed border-violet-300/40 bg-[rgba(139,92,246,0.06)]"
              role="status"
              aria-live="polite"
            >
              {qrStatus === 'scanning' ? (
                <>
                  <span className="absolute inset-x-6 top-1/2 h-0.5 animate-bounce rounded-full bg-violet-300 shadow-[0_0_20px_4px_rgba(167,139,250,0.8)]" />
                  <Loader2 className="h-10 w-10 animate-spin text-violet-300" strokeWidth={1.5} />
                  <span className="font-mono text-xs text-violet-200">{t('กำลังสแกน...', 'Scanning...')}</span>
                </>
              ) : qrStatus === 'success' ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-emerald-300" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-emerald-300">{t('ยืนยันบัตรแล้ว', 'Badge verified')}</span>
                </>
              ) : (
                <>
                  <QrCode className="h-14 w-14 text-neutral-500" strokeWidth={1.25} />
                  <span className="px-4 text-center text-xs text-neutral-400">
                    {t('วางบัตรหน้ากล้องเพื่อสแกน', 'Hold your badge in front of the scanner')}
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleQrScan}
              disabled={qrStatus === 'scanning' || qrStatus === 'success'}
              className={PRIMARY_BUTTON}
            >
              <Zap className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {t('จำลองการสแกนบัตร', 'Simulate badge scan')}
            </button>
          </div>
        </LoginDialog>
      )}

      {showAccountPasswordModal && (
        <AccountPasswordModal
          isOpen={showAccountPasswordModal}
          onClose={() => setShowAccountPasswordModal(false)}
          language={language}
          onPasswordUpdated={(userId, newPass) => {
            const staff = STAFF_ACCOUNTS.find((s) => s.userId === userId);
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
