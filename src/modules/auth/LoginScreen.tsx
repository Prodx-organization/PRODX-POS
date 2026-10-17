import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Lock,
  Monitor,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  getSystemConfigCatalog,
  getBranches,
  getTerminals,
} from '../../services/systemConfigService';
import { Organization, Branch, Terminal } from '../settings/types';
import { OrganizationLoginContext } from '../../adapters/types';

const STORAGE = {
  organization: 'prodx.terminal.organization',
  store: 'prodx.terminal.store',
  register: 'prodx.terminal.register',
} as const;

const readTerminalValue = (key: string, env?: string) => {
  if (typeof window === 'undefined') return env?.trim() ?? '';
  try {
    return window.localStorage.getItem(key)?.trim() || env?.trim() || '';
  } catch {
    return env?.trim() ?? '';
  }
};

export interface LoginScreenProps {
  onOpenAdminLogin?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOpenAdminLogin }) => {
  const { login, forgotPin, isLoading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { addToast } = useToast();
  const isThai = language === 'th';

  // All component state declarations up front to prevent temporal dead zone issues
  const [organizationSlug, setOrganizationSlug] = useState(() =>
    readTerminalValue(STORAGE.organization, import.meta.env.VITE_PRODX_ORGANIZATION_SLUG || 'prodx'),
  );
  const [storeCode, setStoreCode] = useState(() =>
    readTerminalValue(STORAGE.store, import.meta.env.VITE_PRODX_STORE_CODE || 'STR-01'),
  );
  const [registerId, setRegisterId] = useState(() =>
    readTerminalValue(STORAGE.register, import.meta.env.VITE_PRODX_REGISTER_ID || 'Terminal-001'),
  );
  const [identity, setIdentity] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loginMode, setLoginMode] = useState<'pin' | 'email' | 'qr'>('pin');
  const [pin, setPin] = useState('');
  const [clock, setClock] = useState('');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [allTerminals, setAllTerminals] = useState<Terminal[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [touched, setTouched] = useState<{
    organization: boolean;
    store: boolean;
    register: boolean;
  }>({
    organization: false,
    store: false,
    register: false,
  });

  const navigateToAdminLogin = () => {
    if (onOpenAdminLogin) {
      onOpenAdminLogin();
      return;
    }
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/admin/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const copy = useMemo(
    () =>
      isThai
        ? {
            eyebrow: 'PRODX POS · OPERATOR CONSOLE',
            title: 'พร้อมเริ่มกะ',
            subtitle: 'เลือกองค์กร สาขา และเครื่อง POS จากระบบฐานข้อมูลก่อนยืนยันตัวตนเพื่อเข้าทำงาน',
            password: 'รหัสผ่าน',
            identity: 'อีเมลบัญชี',
            identityPlaceholder: 'เช่น cashier@prodx.co',
            secretPassword: 'รหัสผ่าน',
            signIn: 'เข้าสู่ระบบพนักงาน POS',
            signingIn: 'กำลังตรวจสอบสิทธิ์…',
            terminal: '1. เลือกองค์กร สาขา และเครื่อง POS (Firestore)',
            ready: 'พร้อมใช้งาน',
            setup: 'ต้องตั้งค่า',
            organization: 'องค์กร',
            store: 'สาขา',
            register: 'เครื่อง POS',
            security: 'ยืนยันสิทธิ์กับระบบหลัก',
            verified: 'Secure Enterprise Login',
            serverNote: 'ข้อมูลองค์กร สาขา และเครื่องขายจาก Firestore จะกำหนดบริบทของการเข้าสู่ระบบ',
            failed: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง',
            required: 'กรุณาเลือกองค์กร สาขา และเครื่อง POS ให้ครบทุกช่องก่อนเข้าสู่ระบบ',
            language: 'English',
            selectOrg: 'เลือกองค์กร',
            selectBranch: 'เลือกสาขา',
            selectTerminal: 'เลือกเครื่อง POS',
            credentials: '2. ยืนยันตัวตนพนักงานขาย (Operator Authentication)',
            orgRequiredMsg: 'กรุณาเลือกองค์กรก่อนดำเนินการต่อ',
            branchRequiredMsg: 'กรุณาเลือกสาขาที่สังกัดองค์กรนี้',
            terminalRequiredMsg: 'กรุณาเลือกเครื่อง POS ประจำจุดขาย',
            validationReady: 'เลือกองค์กร สาขา และเครื่อง POS ครบถ้วนแล้ว พร้อมสำหรับยืนยันตัวตน',
            validationPending: 'บังคับเลือกองค์กร สาขา และเครื่อง POS ให้ครบทั้ง 3 ส่วนก่อนจึงจะป้อนข้อมูลเข้าสู่ระบบได้',
            syncCatalog: 'ซิงค์ข้อมูลจาก Firestore',
            orgContextLabel: 'บริบทองค์กรสำหรับการเข้าสู่ระบบ (Active Sign-In Context)',
            adminLoginBtn: 'Admin Login',
            adminPortalNote: 'สำหรับผู้ดูแลระบบระดับองค์กร (RBAC Admin):',
            adminPortalLink: 'เข้าสู่ระบบผ่านช่องทาง Admin Login แยกเฉพาะ',
          }
        : {
            eyebrow: 'PRODX POS · OPERATOR CONSOLE',
            title: 'Ready for your shift',
            subtitle: 'Select your Organization, Branch, and POS Terminal from Firestore before authenticating.',
            password: 'Password',
            identity: 'Account email',
            identityPlaceholder: 'e.g. cashier@prodx.co',
            secretPassword: 'Password',
            signIn: 'Sign in to POS Terminal',
            signingIn: 'Verifying access…',
            terminal: '1. Organization, Branch & Terminal Selection (Firestore)',
            ready: 'Ready',
            setup: 'Setup required',
            organization: 'Organization',
            store: 'Store / Branch',
            register: 'POS Terminal',
            security: 'Server-side verification',
            verified: 'Secure Enterprise Login',
            serverNote: 'Firestore organization, branch, and terminal selections determine your sign-in context.',
            failed: 'Verification failed. Please check and try again.',
            required: 'Please select an organization, branch, and POS terminal before authenticating.',
            language: 'ไทย',
            selectOrg: 'Select Organization',
            selectBranch: 'Select Branch',
            selectTerminal: 'Select Terminal',
            credentials: '2. Operator Credentials',
            orgRequiredMsg: 'Please select an organization to continue.',
            branchRequiredMsg: 'Please select a branch for this organization.',
            terminalRequiredMsg: 'Please select an active POS terminal.',
            validationReady: 'Organization, branch, and terminal context verified for sign-in.',
            validationPending: 'Select Organization, Branch, and POS Terminal above before entering credentials.',
            syncCatalog: 'Sync from Firestore',
            orgContextLabel: 'Active Organization Sign-In Context',
            adminLoginBtn: 'Admin Login',
            adminPortalNote: 'Enterprise Administrator (RBAC Admin Role):',
            adminPortalLink: 'Use Dedicated Admin Login Path (/admin/login)',
          },
    [isThai],
  );

  // Reactive selected Organization, filtered Branches, selected Branch, filtered Terminals, and selected Terminal
  const selectedOrganization = useMemo(
    () => orgs.find((o) => o.slug === organizationSlug) ?? null,
    [orgs, organizationSlug],
  );

  const branches = useMemo(() => {
    if (!selectedOrganization) return [];
    return allBranches.filter((b) => b.orgId === selectedOrganization.id);
  }, [allBranches, selectedOrganization]);

  const selectedBranch = useMemo(
    () => branches.find((b) => b.name === storeCode) ?? null,
    [branches, storeCode],
  );

  const terminals = useMemo(() => {
    if (!selectedBranch) return [];
    return allTerminals.filter((t) => t.branchId === selectedBranch.id);
  }, [allTerminals, selectedBranch]);

  const selectedTerminal = useMemo(
    () => terminals.find((t) => t.code === registerId) ?? null,
    [terminals, registerId],
  );

  // Reactive Organization Context for the subsequent sign-in attempt
  const organizationContext = useMemo<OrganizationLoginContext | null>(() => {
    if (!selectedOrganization || !selectedBranch || !selectedTerminal) return null;
    return {
      organizationId: selectedOrganization.id,
      organizationName: selectedOrganization.name,
      organizationSlug: selectedOrganization.slug,
      branchId: selectedBranch.id,
      branchName: selectedBranch.name,
      branchAddress: selectedBranch.address,
      terminalId: selectedTerminal.id,
      terminalName: selectedTerminal.name,
      terminalCode: selectedTerminal.code,
    };
  }, [selectedOrganization, selectedBranch, selectedTerminal]);

  // Reactive validation for Organization, Branch, and Terminal
  const isOrgValid = useMemo(() => {
    if (!organizationSlug.trim()) return false;
    if (orgs.length === 0) return false;
    return Boolean(selectedOrganization);
  }, [organizationSlug, orgs.length, selectedOrganization]);

  const isBranchValid = useMemo(() => {
    if (!isOrgValid || !storeCode.trim()) return false;
    if (branches.length === 0) return false;
    return Boolean(selectedBranch);
  }, [isOrgValid, storeCode, branches.length, selectedBranch]);

  const isTerminalValid = useMemo(() => {
    if (!isBranchValid || !registerId.trim()) return false;
    if (terminals.length === 0) return false;
    return Boolean(selectedTerminal);
  }, [isBranchValid, registerId, terminals.length, selectedTerminal]);

  const terminalReady = isOrgValid && isBranchValid && isTerminalValid && Boolean(organizationContext);

  const validationErrors = useMemo(
    () => ({
      organization: !isOrgValid ? copy.orgRequiredMsg : null,
      store: isOrgValid && !isBranchValid ? copy.branchRequiredMsg : null,
      register: isOrgValid && isBranchValid && !isTerminalValid ? copy.terminalRequiredMsg : null,
    }),
    [isOrgValid, isBranchValid, isTerminalValid, copy],
  );

  const canSubmit =
    terminalReady &&
    !isFetching &&
    (loginMode === 'qr' ||
      (loginMode === 'pin' ? pin.length >= 4 : Boolean(identity.trim()) && Boolean(secret)));

  // Fetch organizations, branches, and terminals from Firestore on mount
  const loadFirestoreCatalog = useCallback(
    async (preferred?: { orgSlug?: string; branchName?: string; terminalCode?: string }) => {
      setIsFetching(true);
      try {
        const catalog = await getSystemConfigCatalog();
        setOrgs(catalog.organizations);
        setAllBranches(catalog.branches);
        setAllTerminals(catalog.terminals);

        const targetOrgSlug = preferred?.orgSlug ?? organizationSlug;
        const matchedOrg =
          catalog.organizations.find((o) => o.slug === targetOrgSlug) ||
          catalog.organizations[0] ||
          null;

        if (!matchedOrg) {
          setOrganizationSlug('');
          setStoreCode('');
          setRegisterId('');
          return;
        }

        setOrganizationSlug(matchedOrg.slug);

        const orgBranches = catalog.branches.filter((b) => b.orgId === matchedOrg.id);
        const targetBranchName = preferred?.branchName ?? storeCode;
        const matchedBranch =
          orgBranches.find((b) => b.name === targetBranchName) || orgBranches[0] || null;

        if (!matchedBranch) {
          setStoreCode('');
          setRegisterId('');
          return;
        }

        setStoreCode(matchedBranch.name);

        const branchTerminals = catalog.terminals.filter((t) => t.branchId === matchedBranch.id);
        const targetTerminalCode = preferred?.terminalCode ?? registerId;
        const matchedTerminal =
          branchTerminals.find((t) => t.code === targetTerminalCode) ||
          branchTerminals[0] ||
          null;

        setRegisterId(matchedTerminal ? matchedTerminal.code : '');
      } catch {
        addToast({
          title: 'Error',
          message: 'Failed to load system configuration from Firestore.',
          type: 'error',
        });
      } finally {
        setIsFetching(false);
      }
    },
    [organizationSlug, storeCode, registerId, addToast],
  );

  useEffect(() => {
    void loadFirestoreCatalog();
  }, []);

  // Reactive handler when user selects a different Organization
  const handleOrganizationChange = async (nextOrgSlug: string) => {
    setOrganizationSlug(nextOrgSlug);
    setTouched((prev) => ({
      ...prev,
      organization: true,
      store: false,
      register: false,
    }));

    if (!nextOrgSlug) {
      setStoreCode('');
      setRegisterId('');
      return;
    }

    const nextOrg = orgs.find((o) => o.slug === nextOrgSlug);
    if (!nextOrg) {
      setStoreCode('');
      setRegisterId('');
      return;
    }

    // Immediately compute from cached Firestore branches, then refresh from Firestore
    const cachedOrgBranches = allBranches.filter((b) => b.orgId === nextOrg.id);
    const initialBranch =
      cachedOrgBranches.find((b) => b.name === storeCode) || cachedOrgBranches[0] || null;
    const nextBranchName = initialBranch ? initialBranch.name : '';
    setStoreCode(nextBranchName);

    if (initialBranch) {
      const cachedBranchTerminals = allTerminals.filter((t) => t.branchId === initialBranch.id);
      const initialTerminal =
        cachedBranchTerminals.find((t) => t.code === registerId) ||
        cachedBranchTerminals[0] ||
        null;
      setRegisterId(initialTerminal ? initialTerminal.code : '');
    } else {
      setRegisterId('');
    }

    try {
      const freshBranches = await getBranches(nextOrg.id);
      setAllBranches((prev) => {
        const others = prev.filter((b) => b.orgId !== nextOrg.id);
        return [...others, ...freshBranches];
      });
      const resolvedBranch =
        freshBranches.find((b) => b.name === nextBranchName) || freshBranches[0] || null;
      if (resolvedBranch) {
        setStoreCode(resolvedBranch.name);
        const freshTerminals = await getTerminals(resolvedBranch.id);
        setAllTerminals((prev) => {
          const others = prev.filter((t) => t.branchId !== resolvedBranch.id);
          return [...others, ...freshTerminals];
        });
        const resolvedTerminal =
          freshTerminals.find((t) => t.code === registerId) || freshTerminals[0] || null;
        setRegisterId(resolvedTerminal ? resolvedTerminal.code : '');
      } else {
        setStoreCode('');
        setRegisterId('');
      }
    } catch {
      // Retain cached selection on network hiccup
    }
  };

  // Reactive handler when user selects a different Branch
  const handleBranchChange = async (nextStoreCode: string) => {
    setStoreCode(nextStoreCode);
    setTouched((prev) => ({
      ...prev,
      store: true,
      register: false,
    }));

    if (!nextStoreCode || !selectedOrganization) {
      setRegisterId('');
      return;
    }

    const nextBranch = branches.find((b) => b.name === nextStoreCode);
    if (!nextBranch) {
      setRegisterId('');
      return;
    }

    const cachedTerminals = allTerminals.filter((t) => t.branchId === nextBranch.id);
    const initialTerminal =
      cachedTerminals.find((t) => t.code === registerId) || cachedTerminals[0] || null;
    setRegisterId(initialTerminal ? initialTerminal.code : '');

    try {
      const freshTerminals = await getTerminals(nextBranch.id);
      setAllTerminals((prev) => {
        const others = prev.filter((t) => t.branchId !== nextBranch.id);
        return [...others, ...freshTerminals];
      });
      const resolvedTerminal =
        freshTerminals.find((t) => t.code === registerId) || freshTerminals[0] || null;
      setRegisterId(resolvedTerminal ? resolvedTerminal.code : '');
    } catch {
      // Retain cached selection on network hiccup
    }
  };

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
    if (!organizationContext) return;
    try {
      window.localStorage.setItem(STORAGE.organization, organizationContext.organizationSlug);
      window.localStorage.setItem(STORAGE.store, organizationContext.branchName);
      window.localStorage.setItem(STORAGE.register, organizationContext.terminalCode);
    } catch {
      // Ignore storage write error
    }
  };

  const handleScan = async (result: any) => {
    if (!result || isLoading) return;
    if (!terminalReady || !organizationContext) {
      setTouched({ organization: true, store: true, register: true });
      addToast({ title: copy.setup, message: copy.required, type: 'error' });
      return;
    }
    const decodedText = result[0]?.rawValue;
    if (!decodedText) return;
    try {
      let credentials: { identity: string; secret: string };
      try {
        const parsed = JSON.parse(decodedText);
        if (parsed.id && parsed.key) {
          credentials = { identity: parsed.id, secret: parsed.key };
        } else {
          throw new Error('Invalid badge format');
        }
      } catch {
        if (decodedText.includes('@') || decodedText.length >= 4) {
          credentials = { identity: decodedText, secret: decodedText };
        } else {
          addToast({ title: 'QR Scan', message: 'Unknown badge format', type: 'error' });
          return;
        }
      }
      await login({
        organizationSlug: organizationContext.organizationSlug,
        storeCode: organizationContext.branchName,
        registerId: organizationContext.terminalCode,
        emailOrPin: credentials.identity,
        passwordOrPin: credentials.secret,
        organizationContext,
      });
      persistTerminal();
    } catch {
      addToast({
        title: 'Sign-in failed',
        message: 'Badge could not be verified.',
        type: 'error',
      });
    }
  };

  const handlePinInput = (digit: string) => {
    if (!terminalReady) {
      setTouched({ organization: true, store: true, register: true });
      addToast({ title: copy.setup, message: copy.required, type: 'error' });
      return;
    }
    if (pin.length < 6) setPin((prev) => prev + digit);
  };

  const handleForgotPin = async () => {
    if (!terminalReady || !organizationContext) {
      setTouched({ organization: true, store: true, register: true });
      addToast({ title: copy.setup, message: copy.required, type: 'error' });
      return;
    }
    const targetEmail = identity.trim();
    if (!targetEmail) {
      setLoginMode('email');
      addToast({
        title: isThai ? 'กรอกอีเมล' : 'Enter Email',
        message: isThai
          ? 'กรุณากรอกอีเมลในช่องบัญชีเพื่อขอรับลิงก์รีเซ็ต'
          : 'Please enter your account email to request a PIN reset.',
        type: 'info',
      });
      return;
    }
    try {
      await forgotPin(
        targetEmail,
        organizationContext.organizationSlug,
        organizationContext.branchName,
        organizationContext.terminalCode,
      );
      addToast({
        title: isThai ? 'ส่งแล้ว' : 'Sent',
        message: isThai ? 'ลิงก์รีเซ็ตถูกส่งไปยังอีเมลแล้ว' : 'Reset link sent.',
        type: 'success',
      });
    } catch {
      addToast({ title: 'Error', message: 'Failed to send request.', type: 'error' });
    }
  };

  const handlePinClear = () => setPin('');
  const handlePinDelete = () => setPin((prev) => prev.slice(0, -1));

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isLoading) return;

    setTouched({ organization: true, store: true, register: true });

    const finalIdentity = loginMode === 'pin' ? pin : identity.trim();
    const finalSecret = loginMode === 'pin' ? pin : secret;

    if (!terminalReady || !organizationContext) {
      addToast({ title: copy.setup, message: copy.required, type: 'error' });
      return;
    }

    if (!finalIdentity || !finalSecret) {
      addToast({ title: copy.setup, message: copy.required, type: 'error' });
      return;
    }

    try {
      await login({
        organizationSlug: organizationContext.organizationSlug,
        storeCode: organizationContext.branchName,
        registerId: organizationContext.terminalCode,
        emailOrPin: finalIdentity,
        passwordOrPin: finalSecret,
        organizationContext,
      });
      persistTerminal();
    } catch {
      setPin('');
      setSecret('');
      addToast({ title: copy.title, message: copy.failed, type: 'error' });
    }
  };

  return (
    <main className="min-h-[100svh] bg-white text-slate-950 font-sans">
      <div className="grid min-h-[100svh] lg:grid-cols-[48%_52%]">
        {/* Visual Sidebar */}
        <section className="relative hidden overflow-hidden bg-[#07111f] text-white lg:flex flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,107,26,0.12),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(16,91,145,0.2),transparent_40%)]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 flex flex-col h-full p-12 xl:p-16">
            <header className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-black text-[#08111d] shadow-xl">
                P<span className="text-[#ff6b1a]">.</span>
              </div>
              <div>
                <div className="text-3xl font-black tracking-tighter">
                  PRODX<span className="font-light text-slate-400">POS</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500 opacity-80">
                  Enterprise Solution
                </div>
              </div>
            </header>

            <div className="mt-auto mb-auto max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 mb-6">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {copy.verified}
                </span>
              </div>
              <h1 className="text-5xl xl:text-6xl font-black leading-[0.95] tracking-tight mb-6">
                {isThai ? (
                  <>
                    ระบบขายหน้าร้าน
                    <br />
                    <span className="text-primary">ระดับโลก.</span>
                  </>
                ) : (
                  <>
                    World-class
                    <br />
                    <span className="text-primary">Point of Sale.</span>
                  </>
                )}
              </h1>
              <p className="text-base text-slate-400 leading-relaxed max-w-md">
                {isThai
                  ? 'ยกระดับการจัดการสาขา สินค้าคงคลัง และพนักงาน ด้วยระบบที่ออกแบบมาเพื่อธุรกิจขนาดใหญ่'
                  : 'Empowering enterprises with unified sales, real-time inventory, and intelligent retail operations.'}
              </p>

              {/* Live Organization Context Preview on Desktop Sidebar */}
              {organizationContext && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 max-w-md">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff6b1a] mb-3">
                    {copy.orgContextLabel}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 font-bold">{copy.organization}:</span>
                      <span className="font-black text-white">
                        {organizationContext.organizationName} ({organizationContext.organizationSlug})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 font-bold">{copy.store}:</span>
                      <span className="font-black text-white">
                        {organizationContext.branchName}
                        {organizationContext.branchAddress
                          ? ` · ${organizationContext.branchAddress}`
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 font-bold">{copy.register}:</span>
                      <span className="font-black text-emerald-400">
                        {organizationContext.terminalName} ({organizationContext.terminalCode})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <footer className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    Status
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-white">System Online</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    Node
                  </span>
                  <span className="text-xs font-bold text-white">Global-Edge-01</span>
                </div>
              </div>
              <div className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">
                © 2024 PRODX Technologies
              </div>
            </footer>
          </div>
        </section>

        {/* Login Panel */}
        <section className="relative flex flex-col bg-white overflow-y-auto">
          <header className="flex items-center justify-between p-6 sm:px-10 sm:pt-8 sm:pb-4">
            <div className="lg:hidden flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white font-black">
                P
              </div>
              <div className="font-black text-xl tracking-tighter">
                PRODX<span className="text-primary">POS</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-bold text-slate-500">
                <Clock3 className="w-3.5 h-3.5" />
                {clock}
              </div>
              <button
                type="button"
                onClick={() => void loadFirestoreCatalog()}
                disabled={isFetching}
                title={copy.syncCatalog}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-black text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{copy.syncCatalog}</span>
              </button>
              <button
                type="button"
                onClick={navigateToAdminLogin}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-[11px] font-black hover:bg-slate-800 transition-all shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#ff6b1a]" />
                {copy.adminLoginBtn}
              </button>
              <button
                type="button"
                onClick={() => setLanguage(isThai ? 'en' : 'th')}
                className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-black text-slate-700 hover:border-primary hover:text-primary transition-all"
              >
                <Globe2 className="w-3.5 h-3.5" />
                {copy.language}
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 xl:px-16 pb-10 max-w-[680px] mx-auto w-full">
            {/* Context Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">
                <span>{copy.eyebrow}</span>
                {organizationContext && (
                  <>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-500">{organizationContext.organizationSlug}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-500">{organizationContext.branchName}</span>
                  </>
                )}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
                {copy.title}
              </h2>
              <p className="mt-2 text-slate-500 text-sm leading-relaxed">{copy.subtitle}</p>

              {/* Reactive Terminal Readiness & Organization Context Banner */}
              <div
                role="status"
                aria-live="polite"
                className={`mt-4 rounded-xl border p-3.5 transition-all ${
                  terminalReady
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                    : 'border-amber-200 bg-amber-50/70 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  {terminalReady ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>{terminalReady ? copy.validationReady : copy.validationPending}</span>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {[
                    {
                      label: copy.organization,
                      valid: isOrgValid,
                      value: selectedOrganization
                        ? `${selectedOrganization.name} (${selectedOrganization.slug})`
                        : organizationSlug,
                    },
                    {
                      label: copy.store,
                      valid: isBranchValid,
                      value: selectedBranch ? selectedBranch.name : storeCode,
                    },
                    {
                      label: copy.register,
                      valid: isTerminalValid,
                      value: selectedTerminal ? selectedTerminal.code : registerId,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold border ${
                        item.valid
                          ? 'bg-white border-emerald-200 text-emerald-700'
                          : 'bg-white/60 border-slate-200 text-slate-400'
                      }`}
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          item.valid ? 'text-emerald-500' : 'text-slate-300'
                        }`}
                      />
                      <span className="truncate">{item.valid ? item.value : item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 1: Dynamic Firestore-Backed Selection Fields for Organization, Branch, and Terminal */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {copy.terminal}
                </h3>
                {isFetching && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Firestore Sync…
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Organization Select */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-org-select"
                    className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" /> {copy.organization}
                    </span>
                    {isOrgValid && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </label>
                  <div className="relative">
                    <select
                      id="login-org-select"
                      value={organizationSlug}
                      onChange={(e) => void handleOrganizationChange(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, organization: true }))}
                      disabled={isFetching}
                      aria-invalid={!isOrgValid}
                      className={`w-full h-11 bg-white border-2 rounded-xl px-3 pr-8 text-xs font-bold text-slate-900 appearance-none outline-none transition-all disabled:opacity-50 ${
                        !isOrgValid && touched.organization
                          ? 'border-rose-300 focus:border-rose-500'
                          : isOrgValid
                          ? 'border-emerald-200 focus:border-primary'
                          : 'border-slate-200 focus:border-primary'
                      }`}
                    >
                      <option value="">{copy.selectOrg}</option>
                      {orgs.map((o) => (
                        <option key={o.id} value={o.slug}>
                          {o.name} ({o.slug})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                    </div>
                  </div>
                  {validationErrors.organization && (
                    <p role="alert" className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {validationErrors.organization}
                    </p>
                  )}
                </div>

                {/* Branch Select */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-branch-select"
                    className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-primary" /> {copy.store}
                    </span>
                    {isBranchValid && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </label>
                  <div className="relative">
                    <select
                      id="login-branch-select"
                      value={storeCode}
                      onChange={(e) => void handleBranchChange(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, store: true }))}
                      disabled={!isOrgValid || isFetching}
                      aria-invalid={isOrgValid && !isBranchValid}
                      className={`w-full h-11 bg-white border-2 rounded-xl px-3 pr-8 text-xs font-bold text-slate-900 appearance-none outline-none transition-all disabled:opacity-50 ${
                        isOrgValid && !isBranchValid && touched.store
                          ? 'border-rose-300 focus:border-rose-500'
                          : isBranchValid
                          ? 'border-emerald-200 focus:border-primary'
                          : 'border-slate-200 focus:border-primary'
                      }`}
                    >
                      <option value="">{copy.selectBranch}</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name} {b.address ? `— ${b.address}` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                    </div>
                  </div>
                  {validationErrors.store && (
                    <p role="alert" className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {validationErrors.store}
                    </p>
                  )}
                </div>

                {/* Terminal Select */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-terminal-select"
                    className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-primary" /> {copy.register}
                    </span>
                    {isTerminalValid && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </label>
                  <div className="relative">
                    <select
                      id="login-terminal-select"
                      value={registerId}
                      onChange={(e) => {
                        setRegisterId(e.target.value);
                        setTouched((prev) => ({ ...prev, register: true }));
                      }}
                      onBlur={() => setTouched((prev) => ({ ...prev, register: true }))}
                      disabled={!isBranchValid || isFetching}
                      aria-invalid={isBranchValid && !isTerminalValid}
                      className={`w-full h-11 bg-white border-2 rounded-xl px-3 pr-8 text-xs font-bold text-slate-900 appearance-none outline-none transition-all disabled:opacity-50 ${
                        isBranchValid && !isTerminalValid && touched.register
                          ? 'border-rose-300 focus:border-rose-500'
                          : isTerminalValid
                          ? 'border-emerald-200 focus:border-primary'
                          : 'border-slate-200 focus:border-primary'
                      }`}
                    >
                      <option value="">{copy.selectTerminal}</option>
                      {terminals.map((t) => (
                        <option key={t.id} value={t.code}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                    </div>
                  </div>
                  {validationErrors.register && (
                    <p role="alert" className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {validationErrors.register}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Operator Authentication (Enforced by terminalReady) */}
            <div
              className={`relative rounded-2xl border p-5 transition-all ${
                terminalReady
                  ? 'border-slate-200 bg-white'
                  : 'border-amber-200 bg-slate-50/80 opacity-65'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  {copy.credentials}
                </h3>
                {organizationContext ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    {organizationContext.organizationSlug} / {organizationContext.branchName} /{' '}
                    {organizationContext.terminalCode}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    {copy.setup}
                  </span>
                )}
              </div>

              {/* Login Mode Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                {(['pin', 'qr', 'email'] as const).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    disabled={!terminalReady}
                    onClick={() => {
                      setLoginMode(mode);
                      setPin('');
                    }}
                    className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all capitalize disabled:cursor-not-allowed ${
                      loginMode === mode
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {mode === 'qr' ? (
                      <div className="flex items-center justify-center gap-2">
                        <QrCode className="w-3.5 h-3.5" /> {isThai ? 'สแกนบัตร' : 'Badge'}
                      </div>
                    ) : mode === 'pin' ? (
                      isThai ? (
                        'รหัส PIN'
                      ) : (
                        'PIN'
                      )
                    ) : (
                      'Email'
                    )}
                  </button>
                ))}
              </div>

              {/* PIN Mode */}
              {loginMode === 'pin' && (
                <div className="space-y-6">
                  <div className="flex justify-center gap-2.5">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-11 h-14 sm:w-12 sm:h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${
                          pin.length > i
                            ? 'border-primary bg-primary/5 text-primary scale-105'
                            : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        {pin.length > i ? (
                          <div className="w-3 h-3 rounded-full bg-primary" />
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <button
                        type="button"
                        key={digit}
                        disabled={!terminalReady || isLoading}
                        onClick={() => handlePinInput(digit.toString())}
                        className="h-14 sm:h-16 rounded-2xl bg-white border-2 border-slate-100 text-xl font-black text-slate-900 hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-[0.95] transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={!terminalReady || isLoading}
                      onClick={handlePinClear}
                      className="h-14 sm:h-16 rounded-2xl bg-slate-50 text-slate-400 font-black text-xs uppercase hover:bg-rose-50 hover:text-rose-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      disabled={!terminalReady || isLoading}
                      onClick={() => handlePinInput('0')}
                      className="h-14 sm:h-16 rounded-2xl bg-white border-2 border-slate-100 text-xl font-black text-slate-900 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      disabled={!terminalReady || isLoading}
                      onClick={handlePinDelete}
                      className="h-14 sm:h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!terminalReady || pin.length < 4 || isLoading}
                    onClick={() => submit()}
                    className="w-full h-14 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-xl shadow-primary/20"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span>{copy.signIn}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleForgotPin}
                    className="w-full text-center text-xs font-bold text-slate-400 hover:text-primary transition-colors"
                  >
                    {copy.password}?
                  </button>
                </div>
              )}

              {/* QR Mode */}
              {loginMode === 'qr' && (
                <div className="space-y-5">
                  <div className="relative rounded-3xl border-4 border-slate-50 bg-slate-900 overflow-hidden aspect-square max-w-[280px] mx-auto shadow-2xl">
                    {terminalReady ? (
                      <Scanner
                        onScan={handleScan}
                        onError={(e: any) => console.log(e?.message)}
                        components={{ finder: true, torch: true }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-6 text-center text-xs text-slate-400">
                        {copy.required}
                      </div>
                    )}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-40 h-40 border-2 border-white/20 rounded-3xl flex items-center justify-center">
                        <div className="w-full h-0.5 bg-primary/60 absolute animate-scan-pulse shadow-[0_0_15px_rgba(255,107,26,0.8)]" />
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-primary font-black text-xs uppercase tracking-[0.2em] mb-1">
                      <Camera className="w-4 h-4" /> Ready to Scan
                    </div>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      {isThai
                        ? 'วางบัตรพนักงานหน้ากล้องเพื่อตรวจสอบสิทธิ์'
                        : 'Place your operator badge in front of the camera.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Email Mode */}
              {loginMode === 'email' && (
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      {copy.identity}
                    </label>
                    <div className="relative">
                      <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={identity}
                        disabled={!terminalReady || isLoading}
                        onChange={(e) => setIdentity(e.target.value)}
                        placeholder={copy.identityPlaceholder}
                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      {copy.password}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={secret}
                        disabled={!terminalReady || isLoading}
                        onChange={(e) => setSecret(e.target.value)}
                        className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-14 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                      />
                      <button
                        type="button"
                        disabled={!terminalReady || isLoading}
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showSecret ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!canSubmit || isLoading}
                    className="w-full h-14 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-xl shadow-primary/20"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span>{copy.signIn}</span>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Dedicated Admin Login Path Callout */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-[#ff6b1a] shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                    {copy.adminPortalNote}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    {copy.serverNote}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={navigateToAdminLogin}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors shrink-0"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#ff6b1a]" />
                <span>{copy.adminPortalLink}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Tailwind Animations */}
      <style>{`
        @keyframes scan-pulse {
            0% { top: 0; }
            50% { top: 100%; }
            100% { top: 0; }
        }
        .animate-scan-pulse {
            animation: scan-pulse 3s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
};
