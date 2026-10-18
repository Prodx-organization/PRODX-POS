import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Fingerprint,
  Globe2,
  KeyRound,
  Loader2,
  Lock,
  Monitor,
  Plus,
  QrCode,
  RefreshCw,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserRound,
  WifiOff,
  X,
} from 'lucide-react';
import { auditService } from '../../services/auditService';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  getOrganizations,
  getBranches,
  getTerminals,
} from '../../services/organizationService';
import { Organization, Branch, Terminal } from '../settings/types';
import { OperationalScope } from '../../domain/auth';
import { OrganizationLoginContext } from '../../adapters/types';
import { TERMINAL_SCOPE_STORAGE_KEYS } from './OrganizationSelection';
import { Skeleton } from '../../components/common/Skeleton';
import { ProdxVectorMark } from '../../components/common/ProdxLogo';
import {
  checkWebAuthnCapability,
  getRegisteredPasskeys,
  PasskeyCredentialRecord,
  WebAuthnCapability,
} from '../../services/webauthnService';
import { PasskeyEnrollModal } from '../../components/auth/PasskeyEnrollModal';

const BIOMETRIC_REMEMBER_STORAGE_KEY = 'prodx.auth.remember_biometrics';
const BIOMETRIC_REMEMBER_PASSKEY_ID_KEY = 'prodx.auth.remembered_passkey_id';

const readTerminalValue = (key: string, env?: string) => {
  if (typeof window === 'undefined') return env?.trim() ?? '';
  try {
    return window.localStorage.getItem(key)?.trim() || env?.trim() || '';
  } catch {
    return env?.trim() ?? '';
  }
};

const readRememberBiometricsPreference = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(BIOMETRIC_REMEMBER_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const dropdownShakeVariants: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -10, 10, -8, 8, -4, 4, 0],
    transition: { duration: 0.45, ease: 'easeInOut' },
  },
};

export interface LoginScreenProps {
  onOpenAdminLogin?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOpenAdminLogin }) => {
  const { login, loginWithBiometrics, forgotPin, isLoading, operationalScope, setOperationalScope } =
    useAuth();
  const { language, setLanguage } = useLanguage();
  const { addToast } = useToast();
  const isThai = language === 'th';

  // Dropdown selection IDs for Organization, Branch, and Terminal
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    () => operationalScope?.organizationId || readTerminalValue(TERMINAL_SCOPE_STORAGE_KEYS.organization),
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    () => operationalScope?.branchId || readTerminalValue(TERMINAL_SCOPE_STORAGE_KEYS.store),
  );
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>(
    () => operationalScope?.terminalId || readTerminalValue(TERMINAL_SCOPE_STORAGE_KEYS.register),
  );

  // Firestore-fetched catalog data & granular loading states
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [syncStage, setSyncStage] = useState<'organizations' | 'branches' | 'terminals' | 'ready'>(
    'organizations',
  );
  const [isFetchingBranches, setIsFetchingBranches] = useState<boolean>(false);
  const [isFetchingTerminals, setIsFetchingTerminals] = useState<boolean>(false);

  // Error shake triggers and touched states
  const [errorShakeCount, setErrorShakeCount] = useState<number>(0);
  const [touched, setTouched] = useState<{
    organization: boolean;
    store: boolean;
    register: boolean;
  }>({
    organization: false,
    store: false,
    register: false,
  });

  // Operator Credential state
  const [rememberBiometrics, setRememberBiometrics] = useState<boolean>(() =>
    readRememberBiometricsPreference(),
  );
  const [identity, setIdentity] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [loginMode, setLoginMode] = useState<'pin' | 'biometric' | 'email' | 'qr'>(() =>
    readRememberBiometricsPreference() ? 'biometric' : 'pin',
  );
  const [pin, setPin] = useState('');
  const [clock, setClock] = useState('');

  // WebAuthn / Biometric Passkey state
  const [webauthnCapability, setWebauthnCapability] = useState<WebAuthnCapability | null>(null);
  const [enrolledPasskeys, setEnrolledPasskeys] = useState<PasskeyCredentialRecord[]>(() =>
    getRegisteredPasskeys(),
  );
  const [selectedPasskeyId, setSelectedPasskeyId] = useState<string>(() => {
    const keys = getRegisteredPasskeys();
    const rememberedId = readTerminalValue(BIOMETRIC_REMEMBER_PASSKEY_ID_KEY);
    if (rememberedId && keys.some((k) => k.id === rememberedId)) {
      return rememberedId;
    }
    return keys[0]?.id || '';
  });
  const [isBiometricVerifying, setIsBiometricVerifying] = useState<boolean>(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false);
  const hasAutoInitiatedBiometricRef = useRef<boolean>(false);

  type LoginErrorType = 'network' | 'credentials' | 'mapping' | null;

  interface LoginErrorInfo {
    type: LoginErrorType;
    title: string;
    message: string;
  }

  const [loginError, setLoginError] = useState<LoginErrorInfo | null>(null);

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
            title: 'พร้อมเริ่มกะการขาย',
            subtitle:
              'กรุณาเลือกองค์กร สาขา และเครื่อง POS จากฐานข้อมูล Firestore ให้ครบถ้วนก่อนป้อนข้อมูลยืนยันตัวตน',
            password: 'รหัสผ่าน',
            identity: 'อีเมลบัญชี',
            identityPlaceholder: 'เช่น cashier@prodx.co',
            signIn: 'เข้าสู่ระบบพนักงาน POS',
            terminal: '1. เลือกขอบเขตการปฏิบัติงาน (Organization, Branch & Terminal — บังคับเลือก)',
            setup: 'ต้องเลือกขอบเขตก่อน',
            organization: 'องค์กร',
            store: 'สาขา',
            register: 'เครื่องขาย POS',
            security: 'ยืนยันสิทธิ์กับระบบหลัก',
            verified: 'Secure Enterprise Login',
            serverNote:
              'ข้อมูลองค์กร สาขา และเครื่องขายจาก Firestore ถูกบันทึกใน AuthContext เพื่อแยกแยะข้อมูลระดับระเบียน (Record-Level Isolation)',
            failed: 'ข้อมูลยืนยันตัวตนไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง',
            required: 'กรุณาเลือกองค์กร สาขา และเครื่อง POS ให้ครบทุกช่องก่อนป้อนรหัสผ่านหรือ PIN',
            language: 'English',
            selectOrg: '-- เลือกองค์กร (บังคับ) --',
            selectBranch: '-- เลือกสาขา (บังคับ) --',
            selectTerminal: '-- เลือกเครื่อง POS (บังคับ) --',
            credentials: '2. ยืนยันตัวตนพนักงานขาย (Operator Credentials)',
            orgRequiredMsg: 'กรุณาเลือกองค์กรก่อนดำเนินการต่อ',
            branchRequiredMsg: 'กรุณาเลือกสาขาที่ต้องการปฏิบัติการ',
            terminalRequiredMsg: 'กรุณาเลือกเครื่องขาย POS ประจำจุดชำระเงิน',
            validationReady:
              'บันทึกขอบเขตการปฏิบัติงาน (Operational Scope) ใน AuthContext เรียบร้อยแล้ว พร้อมป้อนรหัสยืนยันตัวตน',
            validationPending:
              'บังคับเลือกองค์กร สาขา และเครื่อง POS ให้ครบทั้ง 3 ช่องเพื่อปลดล็อกการเข้าสู่ระบบ',
            syncCatalog: 'ซิงค์ Firestore',
            orgContextLabel: 'ขอบเขตการปฏิบัติงานที่บันทึกใน AuthContext',
            adminLoginBtn: 'Admin Login',
            adminPortalNote: 'สำหรับผู้ดูแลระบบระดับองค์กร (Admin Role):',
            adminPortalLink: 'เข้าสู่ระบบผ่าน Admin Login แยกเฉพาะ (/admin/login)',
            focusMissingBtn: 'เลือกช่องที่ยังขาดอยู่',
          }
        : {
            eyebrow: 'PRODX POS · OPERATOR CONSOLE',
            title: 'Ready for your shift',
            subtitle:
              'Select your mandatory Organization, Branch, and POS Terminal from Firestore before entering credentials.',
            password: 'Password',
            identity: 'Account email',
            identityPlaceholder: 'e.g. cashier@prodx.co',
            signIn: 'Sign in to POS Terminal',
            terminal: '1. Operational Scope Selection (Firestore — Mandatory)',
            setup: 'Scope Required',
            organization: 'Organization',
            store: 'Store Branch',
            register: 'POS Terminal',
            security: 'Server-side verification',
            verified: 'Secure Enterprise Login',
            serverNote:
              'Your Firestore Organization, Branch, and Terminal selection is saved in AuthContext for record-level security.',
            failed: 'Verification failed. Please check credentials and try again.',
            required: 'Please select an organization, branch, and POS terminal before entering credentials.',
            language: 'ไทย',
            selectOrg: '-- Select Organization (Required) --',
            selectBranch: '-- Select Branch (Required) --',
            selectTerminal: '-- Select Terminal (Required) --',
            credentials: '2. Operator Credentials',
            orgRequiredMsg: 'Please select an organization to continue.',
            branchRequiredMsg: 'Please select a store branch for this organization.',
            terminalRequiredMsg: 'Please select an active POS terminal station.',
            validationReady:
              'Operational scope saved in AuthContext. Credential entry is unlocked.',
            validationPending:
              'Select Organization, Branch, and POS Terminal above before entering credentials.',
            syncCatalog: 'Sync Firestore',
            orgContextLabel: 'Saved AuthContext Operational Scope',
            adminLoginBtn: 'Admin Login',
            adminPortalNote: 'Enterprise Administrator (Admin Role):',
            adminPortalLink: 'Use Dedicated Admin Login Path (/admin/login)',
            focusMissingBtn: 'Select Missing Scope Field',
          },
    [isThai],
  );

  // Derived selected Organization, Branch, and Terminal entities
  const selectedOrganization = useMemo(
    () => orgs.find((o) => o.id === selectedOrgId || o.slug === selectedOrgId) ?? null,
    [orgs, selectedOrgId],
  );

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId || b.name === selectedBranchId) ?? null,
    [branches, selectedBranchId],
  );

  const selectedTerminal = useMemo(
    () => terminals.find((t) => t.id === selectedTerminalId || t.code === selectedTerminalId) ?? null,
    [terminals, selectedTerminalId],
  );

  // Reactive Operational Scope
  const organizationContext = useMemo<OrganizationLoginContext | null>(() => {
    if (!selectedOrganization || !selectedBranch || !selectedTerminal) return null;
    return {
      organizationId: selectedOrganization.id,
      organizationName: selectedOrganization.name,
      organizationSlug: selectedOrganization.slug,
      branchId: selectedBranch.id,
      branchName: selectedBranch.name,
      branchCode: selectedBranch.code || '',
      branchAddress: selectedBranch.address || '',
      terminalId: selectedTerminal.id,
      terminalName: selectedTerminal.name,
      terminalCode: selectedTerminal.code,
    };
  }, [selectedOrganization, selectedBranch, selectedTerminal]);

  // Mandatory field validation flags
  const isOrgValid = Boolean(selectedOrgId && selectedOrganization);
  const isBranchValid = Boolean(isOrgValid && selectedBranchId && selectedBranch);
  const isTerminalValid = Boolean(isBranchValid && selectedTerminalId && selectedTerminal);
  const terminalReady = isOrgValid && isBranchValid && isTerminalValid && Boolean(organizationContext);

  const validationErrors = useMemo(
    () => ({
      organization: !isOrgValid ? copy.orgRequiredMsg : null,
      store: isOrgValid && !isBranchValid ? copy.branchRequiredMsg : null,
      register: isOrgValid && isBranchValid && !isTerminalValid ? copy.terminalRequiredMsg : null,
    }),
    [isOrgValid, isBranchValid, isTerminalValid, copy],
  );

  /**
   * Diagnostic log script to trace the exact lifecycle of the authentication request.
   * Validates that selected organization, branch, and terminal IDs from dropdowns
   * are correctly captured and matched before the credential check.
   */
  const traceLoginLifecycle = useCallback(
    (
      stage:
        | 'INIT'
        | 'ORG_SELECT'
        | 'BRANCH_SELECT'
        | 'TERMINAL_SELECT'
        | 'BIOMETRIC_REMEMBER'
        | 'SUBMIT'
        | 'SUCCESS'
        | 'ERROR',
      data: any,
    ) => {
      const timestamp = Date.now();
      const traceId = `trace-${timestamp}-${Math.random().toString(36).substring(2, 9)}`;

      const logPayload = {
        traceId,
        stage,
        timestamp: new Date(timestamp).toISOString(),
        operationalScope: {
          selectedOrgId: selectedOrgId || '',
          selectedBranchId: selectedBranchId || '',
          selectedTerminalId: selectedTerminalId || '',
          orgName: selectedOrganization?.name || null,
          branchName: selectedBranch?.name || null,
          branchCode: selectedBranch?.code || null,
          terminalName: selectedTerminal?.name || null,
          terminalCode: selectedTerminal?.code || null,
        },
        authContextReady: terminalReady,
        loginMode,
        ...data,
      };

      console.log(`%c[AUTH_TRACE][${stage}]`, 'color: #ff6b1a; font-weight: bold;', logPayload);

      // Buffer into auditService for remote diagnostics if possible
      auditService.logDiagnosticEvent({
        category: 'system',
        level: stage === 'ERROR' ? 'ERROR' : 'DEBUG',
        event: `AUTH_LIFECYCLE_${stage}`,
        message: `Tracing login stage: ${stage}`,
        orgId: selectedOrganization?.id,
        branchId: selectedBranch?.id,
        terminalId: selectedTerminal?.id,
        metadata: logPayload,
      });

      return traceId;
    },
    [
      selectedOrgId,
      selectedBranchId,
      selectedTerminalId,
      selectedOrganization,
      selectedBranch,
      selectedTerminal,
      terminalReady,
      loginMode,
    ],
  );

  // Load organizations from Firestore on mount, and restore branch/terminal if previously saved
  const loadFirestoreCatalog = useCallback(async () => {
    setIsFetching(true);
    setIsInitialLoading(true);
    setSyncStage('organizations');
    try {
      const fetchedOrgs = await getOrganizations();
      setOrgs(fetchedOrgs);

      // Verify and restore active organization if one was already saved, or default to first organization
      const activeOrgId = selectedOrgId || operationalScope?.organizationId;
      const targetOrg =
        (activeOrgId && fetchedOrgs.find((o) => o.id === activeOrgId || o.slug === activeOrgId)) ||
        fetchedOrgs[0];

      if (targetOrg) {
        setSelectedOrgId(targetOrg.id);

        setSyncStage('branches');
        const fetchedBranches = await getBranches(targetOrg.id);
        setBranches(fetchedBranches);

        const activeBranchId = selectedBranchId || operationalScope?.branchId;
        const targetBranch =
          (activeBranchId &&
            fetchedBranches.find(
              (b) => b.id === activeBranchId || b.name === activeBranchId || b.code === activeBranchId,
            )) ||
          fetchedBranches[0];

        if (targetBranch) {
          setSelectedBranchId(targetBranch.id);

          setSyncStage('terminals');
          const fetchedTerminals = await getTerminals(targetBranch.id, targetOrg.id);
          setTerminals(fetchedTerminals);

          const activeTerminalId = selectedTerminalId || operationalScope?.terminalId;
          const targetTerminal =
            (activeTerminalId &&
              fetchedTerminals.find(
                (t) => t.id === activeTerminalId || t.code === activeTerminalId,
              )) ||
            fetchedTerminals[0];

          if (targetTerminal) {
            setSelectedTerminalId(targetTerminal.id);

            const scope: OperationalScope = {
              organizationId: targetOrg.id,
              organizationName: targetOrg.name,
              organizationSlug: targetOrg.slug,
              branchId: targetBranch.id,
              branchName: targetBranch.name,
              branchCode: targetBranch.code || targetBranch.name,
              branchAddress: targetBranch.address || '',
              terminalId: targetTerminal.id,
              terminalName: targetTerminal.name,
              terminalCode: targetTerminal.code,
            };
            setOperationalScope(scope);
          }
        }
      }
      setSyncStage('ready');
    } catch (err) {
      console.error('Failed to load Firestore catalog:', err);
      addToast({
        title: isThai ? 'เกิดข้อผิดพลาด' : 'Error',
        message: isThai ? 'ไม่สามารถดึงข้อมูลองค์กรจาก Firestore ได้' : 'Failed to load organization catalog.',
        type: 'error',
      });
    } finally {
      setIsFetching(false);
      setIsInitialLoading(false);
    }
  }, [selectedOrgId, selectedBranchId, selectedTerminalId, operationalScope, isThai, addToast, setOperationalScope]);

  const initialMountFetchRef = useRef(false);
  useEffect(() => {
    if (initialMountFetchRef.current) return;
    initialMountFetchRef.current = true;
    void loadFirestoreCatalog();
  }, [loadFirestoreCatalog]);

  // Synchronize operationalScope into AuthContext whenever terminalReady or organizationContext changes
  useEffect(() => {
    if (isFetching) return;
    if (terminalReady && organizationContext) {
      setOperationalScope(organizationContext);
    } else {
      setOperationalScope(null);
      setPin('');
      setSecret('');
    }
  }, [isFetching, terminalReady, organizationContext, setOperationalScope]);

  // Handler when user selects Organization dropdown
  const handleOrganizationChange = async (nextOrgId: string) => {
    traceLoginLifecycle('ORG_SELECT', { nextOrgId });
    setSelectedOrgId(nextOrgId);
    setSelectedBranchId('');
    setSelectedTerminalId('');
    setBranches([]);
    setTerminals([]);
    setOperationalScope(null);
    setTouched((prev) => ({
      ...prev,
      organization: true,
      store: false,
      register: false,
    }));

    if (!nextOrgId) {
      try {
        window.localStorage.removeItem(TERMINAL_SCOPE_STORAGE_KEYS.organization);
        window.localStorage.removeItem(TERMINAL_SCOPE_STORAGE_KEYS.store);
        window.localStorage.removeItem(TERMINAL_SCOPE_STORAGE_KEYS.register);
      } catch {}
      return;
    }

    const nextOrg = orgs.find((o) => o.id === nextOrgId || o.slug === nextOrgId);
    if (!nextOrg) return;

    setIsFetching(true);
    setIsFetchingBranches(true);
    try {
      const freshBranches = await getBranches(nextOrg.id);
      setBranches(freshBranches);
    } catch (err) {
      console.error('Failed to load branches from Firestore:', err);
      addToast({
        title: isThai ? 'เกิดข้อผิดพลาด' : 'Error',
        message: isThai ? 'ไม่สามารถดึงข้อมูลสาขาจาก Firestore ได้' : 'Could not fetch branches.',
        type: 'error',
      });
    } finally {
      setIsFetching(false);
      setIsFetchingBranches(false);
    }
  };

  // Handler when user selects Branch dropdown
  const handleBranchChange = async (nextBranchId: string) => {
    traceLoginLifecycle('BRANCH_SELECT', { nextBranchId, currentOrgId: selectedOrgId });
    setSelectedBranchId(nextBranchId);
    setSelectedTerminalId('');
    setTerminals([]);
    setOperationalScope(null);
    setTouched((prev) => ({
      ...prev,
      store: true,
      register: false,
    }));

    if (!nextBranchId || !selectedOrganization) {
      try {
        window.localStorage.removeItem(TERMINAL_SCOPE_STORAGE_KEYS.store);
        window.localStorage.removeItem(TERMINAL_SCOPE_STORAGE_KEYS.register);
      } catch {}
      return;
    }

    const nextBranch = branches.find((b) => b.id === nextBranchId || b.name === nextBranchId);
    if (!nextBranch) return;

    setIsFetching(true);
    setIsFetchingTerminals(true);
    try {
      const freshTerminals = await getTerminals(nextBranch.id, selectedOrganization.id);
      setTerminals(freshTerminals);
    } catch (err) {
      console.error('Failed to load terminals from Firestore:', err);
      addToast({
        title: isThai ? 'เกิดข้อผิดพลาด' : 'Error',
        message: isThai ? 'ไม่สามารถดึงข้อมูลเครื่องขายจาก Firestore ได้' : 'Could not fetch terminals.',
        type: 'error',
      });
    } finally {
      setIsFetching(false);
      setIsFetchingTerminals(false);
    }
  };

  // Handler when user selects Terminal dropdown
  const handleTerminalChange = (nextTerminalId: string) => {
    traceLoginLifecycle('TERMINAL_SELECT', { nextTerminalId, currentBranchId: selectedBranchId });
    setSelectedTerminalId(nextTerminalId);
    setTouched((prev) => ({
      ...prev,
      register: true,
    }));

    if (!nextTerminalId) {
      setOperationalScope(null);
      try {
        window.localStorage.removeItem(TERMINAL_SCOPE_STORAGE_KEYS.register);
      } catch {}
      return;
    }

    const nextTerminal = terminals.find((t) => t.id === nextTerminalId || t.code === nextTerminalId);
    if (nextTerminal && selectedOrganization && selectedBranch) {
      const scope: OperationalScope = {
        organizationId: selectedOrganization.id,
        organizationName: selectedOrganization.name,
        organizationSlug: selectedOrganization.slug,
        branchId: selectedBranch.id,
        branchName: selectedBranch.name,
        branchCode: selectedBranch.code || '',
        branchAddress: selectedBranch.address || '',
        terminalId: nextTerminal.id,
        terminalName: nextTerminal.name,
        terminalCode: nextTerminal.code,
      };
      setOperationalScope(scope);
      try {
        window.localStorage.setItem(TERMINAL_SCOPE_STORAGE_KEYS.organization, selectedOrganization.id);
        window.localStorage.setItem(TERMINAL_SCOPE_STORAGE_KEYS.store, selectedBranch.id);
        window.localStorage.setItem(TERMINAL_SCOPE_STORAGE_KEYS.register, nextTerminal.id);
      } catch {}
      addToast({
        title: isThai ? 'บันทึกขอบเขตใน AuthContext สำเร็จ' : 'Saved to AuthContext',
        message: `${selectedOrganization.name} › ${selectedBranch.name} › ${nextTerminal.name} (${nextTerminal.code})`,
        type: 'success',
      });
    }
  };

  // Trigger visual error states & shake animation with framer-motion when user attempts to proceed without branch or terminal
  const triggerMissingScopeError = (targetField?: 'organization' | 'store' | 'register') => {
    setTouched({ organization: true, store: true, register: true });
    setErrorShakeCount((prev) => prev + 1);

    const missing =
      targetField ||
      (!isOrgValid
        ? 'organization'
        : !isBranchValid
        ? 'store'
        : 'register');

    const targetId =
      missing === 'organization'
        ? 'login-org-select'
        : missing === 'store'
        ? 'login-branch-select'
        : 'login-terminal-select';

    const el = document.getElementById(targetId);
    el?.focus();

    addToast({
      title: isThai ? 'ต้องระบุข้อมูลให้ครบ' : 'Selection Required',
      message:
        missing === 'organization'
          ? copy.orgRequiredMsg
          : missing === 'store'
          ? copy.branchRequiredMsg
          : copy.terminalRequiredMsg,
      type: 'warning',
    });
  };

  const canSubmit =
    terminalReady &&
    !isFetching &&
    (loginMode === 'qr' ||
      loginMode === 'biometric' ||
      (loginMode === 'pin' ? pin.length >= 4 : Boolean(identity.trim()) && Boolean(secret)));

  const refreshPasskeysAndCapability = useCallback(async () => {
    const keys = getRegisteredPasskeys();
    setEnrolledPasskeys(keys);
    setSelectedPasskeyId((prev) =>
      keys.some((k) => k.id === prev) ? prev : keys[0]?.id || '',
    );
    const cap = await checkWebAuthnCapability();
    setWebauthnCapability(cap);
  }, []);

  useEffect(() => {
    void refreshPasskeysAndCapability();
  }, [refreshPasskeysAndCapability]);

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
    setOperationalScope(organizationContext);
    try {
      window.localStorage.setItem(
        TERMINAL_SCOPE_STORAGE_KEYS.organization,
        organizationContext.organizationId,
      );
      window.localStorage.setItem(
        TERMINAL_SCOPE_STORAGE_KEYS.store,
        organizationContext.branchId,
      );
      // Save full context for more reliable restoration
      window.localStorage.setItem(
        'prodx.terminal.organization_context',
        JSON.stringify(organizationContext)
      );
      window.localStorage.setItem(
        TERMINAL_SCOPE_STORAGE_KEYS.register,
        organizationContext.terminalId,
      );
    } catch {}
  };

  const handleScan = async (result: any) => {
    if (!result || isLoading) return;
    if (!terminalReady || !organizationContext) {
      triggerMissingScopeError();
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
      persistTerminal();
      await login({
        organizationSlug: organizationContext.organizationSlug,
        storeCode: organizationContext.branchName,
        registerId: organizationContext.terminalCode,
        emailOrPin: credentials.identity,
        passwordOrPin: credentials.secret,
        organizationContext,
      });
    } catch {
      addToast({
        title: 'Sign-in failed',
        message: 'Badge could not be verified.',
        type: 'error',
      });
    }
  };

  const handleToggleRememberBiometrics = useCallback(
    (checked: boolean) => {
      setRememberBiometrics(checked);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(BIOMETRIC_REMEMBER_STORAGE_KEY, checked ? 'true' : 'false');
          if (checked && selectedPasskeyId) {
            window.localStorage.setItem(BIOMETRIC_REMEMBER_PASSKEY_ID_KEY, selectedPasskeyId);
          } else if (!checked) {
            window.localStorage.removeItem(BIOMETRIC_REMEMBER_PASSKEY_ID_KEY);
          }
        }
      } catch {}

      traceLoginLifecycle('BIOMETRIC_REMEMBER', {
        field: 'rememberBiometrics',
        enabled: checked,
        selectedPasskeyId,
      });

      addToast({
        title: checked
          ? isThai
            ? 'เปิดใช้ Remember Me with Biometrics'
            : 'Remember Me with Biometrics Enabled'
          : isThai
          ? 'ปิดการสแกนชีวมิติอัตโนมัติ'
          : 'Auto-Biometric Challenge Disabled',
        message: checked
          ? isThai
            ? 'ระบบจะเรียกสแกนลายนิ้วมือ/ใบหน้าอัตโนมัติทันทีเมื่อเปิดหน้าจอ POS ครั้งถัดไป'
            : 'WebAuthn biometric challenge will automatically start when the POS loads.'
          : isThai
          ? 'คุณสามารถกดปุ่มสแกนลายนิ้วมือ/ใบหน้าด้วยตนเองได้ตามปกติ'
          : 'Biometric prompt will only start when manually triggered.',
        type: 'info',
      });
    },
    [selectedPasskeyId, isThai, addToast, traceLoginLifecycle],
  );

  const handleBiometricLogin = useCallback(
    async (targetRecord?: PasskeyCredentialRecord, options?: { autoInitiated?: boolean }) => {
      if (isLoading || isBiometricVerifying) return;
      if (!terminalReady || !organizationContext) {
        if (!options?.autoInitiated) {
          triggerMissingScopeError();
        }
        return;
      }

      const chosenPasskey =
        targetRecord ||
        enrolledPasskeys.find((k) => k.id === selectedPasskeyId) ||
        enrolledPasskeys[0];

      setIsBiometricVerifying(true);
      setLoginError(null);

      traceLoginLifecycle('SUBMIT', {
        authMethod: 'WEBAUTHN_BIOMETRIC',
        autoInitiated: Boolean(options?.autoInitiated),
        targetUser: chosenPasskey?.userEmail || identity.trim() || 'auto-detect',
        authenticatorType: chosenPasskey?.authenticatorType,
        organizationContext,
      });

      try {
        persistTerminal();

        const verification = await loginWithBiometrics({
          organizationSlug: organizationContext.organizationSlug,
          storeCode: organizationContext.branchName,
          registerId: organizationContext.terminalCode,
          organizationContext,
          targetUser: chosenPasskey
            ? {
                id: chosenPasskey.userId,
                email: chosenPasskey.userEmail,
                name: chosenPasskey.userName,
              }
            : identity.trim()
            ? { id: identity.trim(), email: identity.trim(), name: identity.trim() }
            : undefined,
        });

        if (!verification.verified || !verification.credential) {
          throw new Error(
            verification.error ||
              (isThai
                ? 'การยืนยันตัวตนด้วยลายนิ้วมือหรือใบหน้าไม่สำเร็จ'
                : 'Biometric challenge-response verification failed.'),
          );
        }

        const verifiedCred = verification.credential;

        if (rememberBiometrics && typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(BIOMETRIC_REMEMBER_STORAGE_KEY, 'true');
            window.localStorage.setItem(BIOMETRIC_REMEMBER_PASSKEY_ID_KEY, verifiedCred.id);
          } catch {}
        }

        traceLoginLifecycle('SUCCESS', {
          user: verifiedCred.userEmail,
          authMethod: verification.authMethod,
          credentialId: verifiedCred.id,
          challengeId: verification.challengeId,
          signCount: verification.signCount,
          userVerified: verification.userVerified,
          autoInitiated: Boolean(options?.autoInitiated),
        });

        addToast({
          title: isThai ? 'ยืนยันตัวตนชีวมิติสำเร็จ' : 'Biometric Sign-In Verified',
          message: isThai
            ? `เข้าสู่ระบบในชื่อ ${verifiedCred.userName} (${verifiedCred.deviceLabel})`
            : `Signed in as ${verifiedCred.userName} via ${verifiedCred.deviceLabel}`,
          type: 'success',
        });
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : String(err);
        setLoginError({
          type: 'credentials',
          title: isThai ? 'ยืนยันตัวตนชีวมิติไม่สำเร็จ' : 'Biometric Verification Failed',
          message: errMessage,
        });
        traceLoginLifecycle('ERROR', {
          reason: 'WEBAUTHN_BIOMETRIC_FAILED',
          autoInitiated: Boolean(options?.autoInitiated),
          error: errMessage,
        });
        addToast({
          title: isThai ? 'สแกนลายนิ้วมือ/ใบหน้าไม่สำเร็จ' : 'Biometric Error',
          message: errMessage,
          type: 'error',
        });
      } finally {
        setIsBiometricVerifying(false);
        void refreshPasskeysAndCapability();
      }
    },
    [
      isLoading,
      isBiometricVerifying,
      terminalReady,
      organizationContext,
      enrolledPasskeys,
      selectedPasskeyId,
      identity,
      isThai,
      rememberBiometrics,
      loginWithBiometrics,
      addToast,
      refreshPasskeysAndCapability,
      traceLoginLifecycle,
    ],
  );

  // Automatically initiate WebAuthn challenge when POS loads if 'Remember Me with Biometrics' is checked
  useEffect(() => {
    if (!rememberBiometrics) return;
    if (hasAutoInitiatedBiometricRef.current) return;
    if (!terminalReady || !organizationContext) return;
    if (isLoading || isBiometricVerifying || isFetching) return;
    if (enrolledPasskeys.length === 0) return;

    hasAutoInitiatedBiometricRef.current = true;
    setLoginMode('biometric');

    const timer = window.setTimeout(() => {
      void handleBiometricLogin(undefined, { autoInitiated: true });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    rememberBiometrics,
    terminalReady,
    organizationContext,
    isLoading,
    isBiometricVerifying,
    isFetching,
    enrolledPasskeys.length,
    handleBiometricLogin,
  ]);

  const handlePinInput = (digit: string) => {
    if (!terminalReady) {
      triggerMissingScopeError();
      return;
    }
    if (pin.length < 6) setPin((prev) => prev + digit);
  };

  const handleForgotPin = async () => {
    if (!terminalReady || !organizationContext) {
      triggerMissingScopeError();
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

  const handlePinClear = () => {
    if (!terminalReady) {
      triggerMissingScopeError();
      return;
    }
    setPin('');
  };

  const handlePinDelete = () => {
    if (!terminalReady) {
      triggerMissingScopeError();
      return;
    }
    setPin((prev) => prev.slice(0, -1));
  };

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isLoading) return;

    traceLoginLifecycle('SUBMIT', {
      identity: loginMode === 'pin' ? pin : identity.trim(),
      secret: loginMode === 'pin' ? pin : secret,
      terminalReady,
      organizationContext,
    });

    // VERBOSE DIAGNOSTIC: Log precise values before triggering the sign-in
    console.info('%c[LOGIN_SCREEN_DIAGNOSTIC] PRE-SUBMIT CHECK', 'color: #6366f1; font-weight: bold;', {
      selected: {
        orgId: selectedOrgId,
        branchId: selectedBranchId,
        terminalId: selectedTerminalId,
      },
      resolved: {
        orgSlug: selectedOrganization?.slug,
        branchCode: selectedBranch?.code,
        terminalCode: selectedTerminal?.code,
      },
      context: organizationContext,
      timestamp: new Date().toISOString()
    });

    if (!terminalReady || !organizationContext) {
      traceLoginLifecycle('ERROR', { reason: 'MISSING_SCOPE', terminalReady, organizationContext });
      triggerMissingScopeError();
      return;
    }

    setTouched({ organization: true, store: true, register: true });

    const finalIdentity = loginMode === 'pin' ? pin : identity.trim();
    const finalSecret = loginMode === 'pin' ? pin : secret;

    if (!finalIdentity || !finalSecret) {
      traceLoginLifecycle('ERROR', { reason: 'MISSING_CREDENTIALS' });
      addToast({ title: copy.setup, message: copy.required, type: 'error' });
      return;
    }

    try {
      persistTerminal();
      await login({
        organizationSlug: organizationContext.organizationSlug,
        storeCode: organizationContext.branchName,
        registerId: organizationContext.terminalCode,
        emailOrPin: finalIdentity,
        passwordOrPin: finalSecret,
        organizationContext,
      });
      traceLoginLifecycle('SUCCESS', { user: finalIdentity });
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      const isNetwork = errMessage.toLowerCase().includes('fetch') || errMessage.toLowerCase().includes('network') || errMessage.toLowerCase().includes('timeout') || errMessage.toLowerCase().includes('offline') || errMessage.toLowerCase().includes('connection') || errMessage.toLowerCase().includes('failed to fetch');
      const isMapping = errMessage.toLowerCase().includes('store') || errMessage.toLowerCase().includes('branch') || errMessage.toLowerCase().includes('terminal') || errMessage.toLowerCase().includes('organization') || errMessage.toLowerCase().includes('scope') || errMessage.toLowerCase().includes('rbac');

      const errorType: LoginErrorType = isNetwork ? 'network' : isMapping ? 'mapping' : 'credentials';
      
      const title = isNetwork
        ? (isThai ? 'เกิดข้อผิดพลาดด้านเครือข่าย' : 'Network Connection Error')
        : isMapping
        ? (isThai ? 'ข้อผิดพลาดในการจับคู่สาขา/เครื่อง POS' : 'Terminal / Store Mapping Error')
        : (isThai ? 'ข้อมูลยืนยันตัวตนไม่ถูกต้อง' : 'Invalid Credentials / Authentication Failed');

      const message = isNetwork
        ? (isThai ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์หรือฐานข้อมูล Firestore ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต' : 'Unable to connect to the authentication server or Firestore. Please verify your network connection or try again.')
        : isMapping
        ? (isThai ? 'ไม่พบข้อมูลองค์กร สาขา หรือรหัสเครื่อง POS ที่เลือกในระบบ กรุณาตรวจสอบการตั้งค่า Scope' : 'The selected organization, branch store code, or terminal register ID could not be matched against active database records.')
        : errMessage;

      setLoginError({ type: errorType, title, message });

      traceLoginLifecycle('ERROR', {
        reason: errorType.toUpperCase(),
        error: errMessage,
      });

      setPin('');
      setSecret('');
      addToast({ title, message, type: 'error' });
    }
  };

  return (
    <main className="min-h-[100svh] bg-white text-slate-950 font-sans">
      <div className="grid min-h-[100svh] lg:grid-cols-[46%_54%]">
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
              <ProdxVectorMark size={56} className="shadow-2xl rounded-2xl" />
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

              {/* Live Persisted Operational Scope Preview or Skeleton on Desktop Sidebar */}
              {isInitialLoading ? (
                <div
                  aria-busy="true"
                  className="mt-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 max-w-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-44 bg-white/15 rounded" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff6b1a] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {isThai ? 'กำลังซิงค์...' : 'Syncing...'}
                    </span>
                  </div>
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-16 bg-white/10 rounded" />
                      <Skeleton className="h-3.5 w-40 bg-white/15 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-14 bg-white/10 rounded" />
                      <Skeleton className="h-3.5 w-36 bg-white/15 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-20 bg-white/10 rounded" />
                      <Skeleton className="h-3.5 w-32 bg-emerald-400/20 rounded" />
                    </div>
                  </div>
                </div>
              ) : (
                organizationContext && (
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
                )
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
        <section className="relative flex flex-col bg-white overflow-y-auto min-w-0">
          <header className="flex flex-wrap items-center justify-between gap-2 p-3.5 sm:px-8 sm:pt-6 sm:pb-4 lg:px-10 lg:pt-8 border-b border-slate-100 sm:border-b-0">
            <div className="lg:hidden flex items-center gap-2.5 shrink-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-950 text-white font-black text-sm sm:text-base">
                P
              </div>
              <div className="font-black text-lg sm:text-xl tracking-tighter">
                PRODX<span className="text-primary">POS</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5 flex-wrap justify-end">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-[11px] font-bold text-slate-500">
                <Clock3 className="w-3.5 h-3.5" />
                {clock}
              </div>
              <button
                type="button"
                onClick={() => void loadFirestoreCatalog()}
                disabled={isFetching}
                title={copy.syncCatalog}
                className="min-h-[38px] sm:min-h-[40px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{copy.syncCatalog}</span>
              </button>
              <button
                type="button"
                onClick={navigateToAdminLogin}
                className="min-h-[38px] sm:min-h-[40px] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-[11px] font-black hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#ff6b1a] shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-none">{copy.adminLoginBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage(isThai ? 'en' : 'th')}
                className="min-h-[38px] sm:min-h-[40px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-slate-200 rounded-xl text-[11px] font-black text-slate-700 hover:border-primary hover:text-primary transition-all cursor-pointer"
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>{copy.language}</span>
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 md:px-12 xl:px-14 py-4 sm:py-6 pb-8 max-w-[720px] mx-auto w-full">
            {/* Context Header */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1.5 flex-wrap">
                <span>{copy.eyebrow}</span>
                {organizationContext && (
                  <>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-500">{organizationContext.organizationSlug}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-500">{organizationContext.branchName}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-500">{organizationContext.terminalCode}</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {copy.title}
              </h2>
              <p className="mt-1.5 text-slate-500 text-xs sm:text-sm leading-relaxed">{copy.subtitle}</p>

              {/* Reactive Terminal Readiness & AuthContext Operational Scope Banner */}
              {isInitialLoading ? (
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50/90 p-3 sm:p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-[#ff6b1a] animate-spin shrink-0" />
                      <span className="text-xs font-bold text-slate-700">
                        {isThai
                          ? 'กำลังดึงข้อมูลองค์กร สาขา และเครื่อง POS จาก Firestore...'
                          : 'Fetching Organizations, Store Branches & POS Terminals from Firestore...'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                      {syncStage === 'organizations'
                        ? '1/3 ORGS'
                        : syncStage === 'branches'
                        ? '2/3 BRANCHES'
                        : '3/3 TERMINALS'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg bg-white border border-slate-200/80 px-2.5 py-1.5"
                      >
                        <Skeleton className="h-3.5 w-3.5 rounded-full shrink-0 bg-slate-200" />
                        <Skeleton className="h-3 w-full rounded bg-slate-200" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  role="status"
                  aria-live="polite"
                  className={`mt-3.5 rounded-xl border p-3 sm:p-3.5 transition-all ${
                    terminalReady
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                      : 'border-amber-200 bg-amber-50/70 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {terminalReady ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>{terminalReady ? copy.validationReady : copy.validationPending}</span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        label: copy.organization,
                        valid: isOrgValid,
                        value: selectedOrganization
                          ? `${selectedOrganization.name} (${selectedOrganization.slug})`
                          : copy.selectOrg,
                      },
                      {
                        label: copy.store,
                        valid: isBranchValid,
                        value: selectedBranch ? selectedBranch.name : copy.selectBranch,
                      },
                      {
                        label: copy.register,
                        valid: isTerminalValid,
                        value: selectedTerminal
                          ? `${selectedTerminal.name} (${selectedTerminal.code})`
                          : copy.selectTerminal,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold border transition-colors ${
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
              )}
            </div>

            {/* Section 1: Mandatory Reactive Firestore-Backed Selection Fields with Skeleton & Refined Loading Overlay */}
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 mb-6 space-y-4 shadow-2xs overflow-hidden">
              {/* Detailed Visual Feedback Banner for Network, Mapping, or Credentials Errors */}
              <AnimatePresence>
                {loginError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`mb-4 p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
                      loginError.type === 'network'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : loginError.type === 'mapping'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    {loginError.type === 'network' ? (
                      <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : loginError.type === 'mapping' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1 space-y-1 text-xs">
                      <div className="font-black flex items-center justify-between">
                        <span>{loginError.title}</span>
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono bg-white/60 border border-current/20">
                          {loginError.type}
                        </span>
                      </div>
                      <p className="leading-relaxed opacity-90">{loginError.message}</p>
                      
                      {loginError.type === 'network' && (
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLoginError(null);
                              void loadFirestoreCatalog();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-all flex items-center gap-1.5 shadow-2xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            {isThai ? 'ลองเชื่อมต่อใหม่ (Retry Connection)' : 'Retry Connection'}
                          </button>
                        </div>
                      )}

                      {loginError.type === 'mapping' && (
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLoginError(null);
                              setSelectedOrgId('');
                              setSelectedBranchId('');
                              setSelectedTerminalId('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-all flex items-center gap-1.5 shadow-2xs"
                          >
                            {isThai ? 'รีเซ็ตการเลือก Scope' : 'Reset Scope Selection'}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setLoginError(null)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  {copy.terminal}
                </h3>
                {isFetching && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {isThai ? 'กำลังซิงค์ Firestore…' : 'Firestore Sync…'}
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {isInitialLoading ? (
                  /* ==================== SKELETON SCREEN + REFINED LOADING OVERLAY ==================== */
                  <motion.div
                    key="firestore-scope-skeleton"
                    data-testid="login-firestore-loading-skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                    aria-busy="true"
                    aria-label={
                      isThai
                        ? 'กำลังโหลดข้อมูลองค์กร สาขา และเครื่องขาย POS จาก Firestore'
                        : 'Loading Organizations, Branches, and Terminals from Firestore'
                    }
                  >
                    {/* 3-Column Skeleton Dropdown Placeholders matching exact h-11 dimensions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {[
                        {
                          icon: Building2,
                          label: copy.organization,
                          active: syncStage === 'organizations',
                          done: syncStage === 'branches' || syncStage === 'terminals' || syncStage === 'ready',
                        },
                        {
                          icon: Store,
                          label: copy.store,
                          active: syncStage === 'branches',
                          done: syncStage === 'terminals' || syncStage === 'ready',
                        },
                        {
                          icon: Monitor,
                          label: copy.register,
                          active: syncStage === 'terminals',
                          done: syncStage === 'ready',
                        },
                      ].map((slot) => {
                        const IconComp = slot.icon;
                        return (
                          <div key={slot.label} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
                                <IconComp className="w-3.5 h-3.5 text-[#ff6b1a]" />
                                <span>{slot.label}</span>
                              </span>
                              {slot.done ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : slot.active ? (
                                <Loader2 className="w-3.5 h-3.5 text-[#ff6b1a] animate-spin" />
                              ) : (
                                <Skeleton className="h-3 w-3 rounded-full bg-slate-200" />
                              )}
                            </div>

                            <div className="relative h-11 w-full rounded-xl border-2 border-slate-200/90 bg-white px-3 flex items-center justify-between overflow-hidden">
                              <div className="flex items-center gap-2 w-full pr-4">
                                <Skeleton className="h-3.5 w-3/4 rounded bg-slate-200/90" />
                              </div>
                              <Skeleton className="h-3.5 w-3.5 rounded bg-slate-200 shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Refined Glassmorphic Firestore Telemetry Overlay Bar */}
                    <div className="rounded-xl border border-slate-200/90 bg-white/90 backdrop-blur-xs px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6b1a] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6b1a]" />
                        </span>
                        <span>
                          {syncStage === 'organizations'
                            ? isThai
                              ? 'กำลังโหลดรายชื่อองค์กร (Organizations)...'
                              : 'Loading enterprise organizations...'
                            : syncStage === 'branches'
                            ? isThai
                              ? 'กำลังโหลดข้อมูลสาขาหน้าร้าน (Store Branches)...'
                              : 'Resolving store branches...'
                            : isThai
                            ? 'กำลังตรวจสอบเครื่องขาย POS (Terminals)...'
                            : 'Binding POS terminal stations...'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                        <span
                          className={
                            syncStage === 'organizations'
                              ? 'text-[#ff6b1a] font-black'
                              : 'text-emerald-600'
                          }
                        >
                          1. {copy.organization}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            syncStage === 'branches'
                              ? 'text-[#ff6b1a] font-black'
                              : syncStage === 'terminals' || syncStage === 'ready'
                              ? 'text-emerald-600'
                              : 'text-slate-400'
                          }
                        >
                          2. {copy.store}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            syncStage === 'terminals'
                              ? 'text-[#ff6b1a] font-black'
                              : syncStage === 'ready'
                              ? 'text-emerald-600'
                              : 'text-slate-400'
                          }
                        >
                          3. {copy.register}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* ==================== INTERACTIVE DROPDOWN SELECTORS ==================== */
                  <motion.div
                    key="firestore-scope-interactive"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3.5"
                  >
                    {/* 1. Organization Select Dropdown with framer-motion */}
                    <motion.div
                      key={`org-motion-field-${errorShakeCount}`}
                      variants={dropdownShakeVariants}
                      animate={!isOrgValid && touched.organization ? 'shake' : 'idle'}
                      className="space-y-1.5"
                    >
                      <label
                        htmlFor="login-org-select"
                        className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1.5">
                          <Building2 className={`w-3.5 h-3.5 ${!isOrgValid && touched.organization ? 'text-rose-600' : 'text-primary'}`} />
                          <span className={!isOrgValid && touched.organization ? 'text-rose-700 font-black' : ''}>
                            {copy.organization}
                          </span>{' '}
                          <span className="text-rose-500">*</span>
                        </span>
                        {isOrgValid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : touched.organization ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                        ) : null}
                      </label>
                      <div className="relative">
                        <select
                          id="login-org-select"
                          required
                          aria-required="true"
                          value={selectedOrgId}
                          onChange={(e) => void handleOrganizationChange(e.target.value)}
                          onBlur={() => setTouched((prev) => ({ ...prev, organization: true }))}
                          disabled={isFetching}
                          aria-invalid={!isOrgValid && touched.organization}
                          className={`w-full h-11 bg-white border-2 rounded-xl px-3 pr-8 text-xs font-bold appearance-none outline-hidden transition-all disabled:opacity-50 ${
                            !isOrgValid && touched.organization
                              ? 'border-rose-500 bg-rose-50/25 ring-4 ring-rose-500/15 text-rose-950 focus:border-rose-600'
                              : isOrgValid
                              ? 'border-emerald-300 bg-emerald-50/15 text-slate-900 focus:border-primary'
                              : 'border-slate-200 text-slate-900 focus:border-primary'
                          }`}
                        >
                          <option value="">{copy.selectOrg}</option>
                          {orgs.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} ({o.slug})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                        </div>
                      </div>
                      <AnimatePresence>
                        {!isOrgValid && touched.organization && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p role="alert" className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5 pt-0.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                              <span>{validationErrors.organization || copy.orgRequiredMsg}</span>
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* 2. Branch Select Dropdown with framer-motion + inline Skeleton overlay when fetching branches */}
                    <motion.div
                      key={`branch-motion-field-${errorShakeCount}`}
                      variants={dropdownShakeVariants}
                      animate={!isBranchValid && touched.store ? 'shake' : 'idle'}
                      className="space-y-1.5"
                    >
                      <label
                        htmlFor="login-branch-select"
                        className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1.5">
                          <Store className={`w-3.5 h-3.5 ${!isBranchValid && touched.store ? 'text-rose-600' : 'text-primary'}`} />
                          <span className={!isBranchValid && touched.store ? 'text-rose-700 font-black' : ''}>
                            {copy.store}
                          </span>{' '}
                          <span className="text-rose-500">*</span>
                        </span>
                        {isFetchingBranches ? (
                          <Loader2 className="w-3.5 h-3.5 text-[#ff6b1a] animate-spin" />
                        ) : isBranchValid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : touched.store ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                        ) : null}
                      </label>
                      <div className="relative">
                        {isFetchingBranches ? (
                          <div className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 flex items-center justify-between">
                            <Skeleton className="h-3.5 w-3/4 rounded bg-slate-200" />
                            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />
                          </div>
                        ) : (
                          <>
                            <select
                              id="login-branch-select"
                              required
                              aria-required="true"
                              value={selectedBranchId}
                              onChange={(e) => void handleBranchChange(e.target.value)}
                              onBlur={() => setTouched((prev) => ({ ...prev, store: true }))}
                              disabled={!isOrgValid || isFetching}
                              aria-invalid={!isBranchValid && touched.store}
                              className={`w-full h-11 bg-white border-2 rounded-xl px-3 pr-8 text-xs font-bold appearance-none outline-hidden transition-all disabled:opacity-50 ${
                                !isBranchValid && touched.store
                                  ? 'border-rose-500 bg-rose-50/25 ring-4 ring-rose-500/15 text-rose-950 focus:border-rose-600'
                                  : isBranchValid
                                  ? 'border-emerald-300 bg-emerald-50/15 text-slate-900 focus:border-primary'
                                  : 'border-slate-200 text-slate-900 focus:border-primary'
                              }`}
                            >
                              <option value="">
                                {!isOrgValid
                                  ? isThai
                                    ? '-- กรุณาเลือกองค์กรก่อน --'
                                    : '-- Select Organization First --'
                                  : copy.selectBranch}
                              </option>
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name} {b.code ? `(${b.code})` : ''} {b.address ? `— ${b.address}` : ''}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                            </div>
                          </>
                        )}
                      </div>
                      <AnimatePresence>
                        {!isBranchValid && touched.store && !isFetchingBranches && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p role="alert" className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5 pt-0.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                              <span>{validationErrors.store || copy.branchRequiredMsg}</span>
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* 3. Terminal Select Dropdown with framer-motion + inline Skeleton overlay when fetching terminals */}
                    <motion.div
                      key={`terminal-motion-field-${errorShakeCount}`}
                      variants={dropdownShakeVariants}
                      animate={!isTerminalValid && touched.register ? 'shake' : 'idle'}
                      className="space-y-1.5"
                    >
                      <label
                        htmlFor="login-terminal-select"
                        className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1.5">
                          <Monitor className={`w-3.5 h-3.5 ${!isTerminalValid && touched.register ? 'text-rose-600' : 'text-primary'}`} />
                          <span className={!isTerminalValid && touched.register ? 'text-rose-700 font-black' : ''}>
                            {copy.register}
                          </span>{' '}
                          <span className="text-rose-500">*</span>
                        </span>
                        {isFetchingTerminals ? (
                          <Loader2 className="w-3.5 h-3.5 text-[#ff6b1a] animate-spin" />
                        ) : isTerminalValid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : touched.register ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                        ) : null}
                      </label>
                      <div className="relative">
                        {isFetchingTerminals ? (
                          <div className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 flex items-center justify-between">
                            <Skeleton className="h-3.5 w-3/4 rounded bg-slate-200" />
                            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />
                          </div>
                        ) : (
                          <>
                            <select
                              id="login-terminal-select"
                              required
                              aria-required="true"
                              value={selectedTerminalId}
                              onChange={(e) => handleTerminalChange(e.target.value)}
                              onBlur={() => setTouched((prev) => ({ ...prev, register: true }))}
                              disabled={!isBranchValid || isFetching}
                              aria-invalid={!isTerminalValid && touched.register}
                              className={`w-full h-11 bg-white border-2 rounded-xl px-3 pr-8 text-xs font-bold appearance-none outline-hidden transition-all disabled:opacity-50 ${
                                !isTerminalValid && touched.register
                                  ? 'border-rose-500 bg-rose-50/25 ring-4 ring-rose-500/15 text-rose-950 focus:border-rose-600'
                                  : isTerminalValid
                                  ? 'border-emerald-300 bg-emerald-50/15 text-slate-900 focus:border-primary'
                                  : 'border-slate-200 text-slate-900 focus:border-primary'
                              }`}
                            >
                              <option value="">
                                {!isBranchValid
                                  ? isThai
                                    ? '-- กรุณาเลือกสาขาก่อน --'
                                    : '-- Select Branch First --'
                                  : copy.selectTerminal}
                              </option>
                              {terminals.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({t.code})
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                            </div>
                          </>
                        )}
                      </div>
                      <AnimatePresence>
                        {!isTerminalValid && touched.register && !isFetchingTerminals && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p role="alert" className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5 pt-0.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                              <span>{validationErrors.register || copy.terminalRequiredMsg}</span>
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Section 2: Operator Authentication (Enforced strictly by terminalReady) */}
            <div
              className={`relative rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs ${
                terminalReady
                  ? 'border-slate-200 bg-white'
                  : 'border-rose-200 bg-slate-50/80'
              }`}
            >
              <AnimatePresence>
                {!terminalReady && (
                  <motion.div
                    key={`locked-banner-${errorShakeCount}`}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      x: errorShakeCount > 0 ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
                    }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                    className="mb-4 rounded-xl border border-rose-300 bg-rose-50/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-900 min-w-0">
                      <Lock className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                      <span className="leading-snug">
                        {isThai
                          ? 'ต้องเลือกสาขาและเครื่องขาย POS ให้ครบก่อนเข้าสู่ระบบ'
                          : copy.required}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerMissingScopeError()}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-black hover:bg-rose-700 transition-colors shrink-0 whitespace-nowrap shadow-xs active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{isThai ? 'เลือกข้อมูลที่ขาด' : 'Select Scope'}</span>
                      <ArrowRight className="w-3 h-3 shrink-0" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Section 2 Header — Clean single-line layout with non-wrapping badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{copy.credentials}</span>
                </h3>
                {organizationContext ? (
                  <span
                    title={`${organizationContext.organizationSlug} / ${organizationContext.branchName} / ${organizationContext.terminalCode}`}
                    className="max-w-full sm:max-w-[280px] text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 truncate"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {organizationContext.organizationSlug} · {organizationContext.branchName} ·{' '}
                      {organizationContext.terminalCode}
                    </span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>{copy.setup}</span>
                  </span>
                )}
              </div>

              {/* Login Mode Tabs — Unified 4-column segmented bar */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl mb-3.5">
                {(
                  [
                    {
                      id: 'pin',
                      label: isThai ? 'PIN' : 'PIN',
                      icon: KeyRound,
                    },
                    {
                      id: 'biometric',
                      label: isThai ? 'ชีวมิติ' : 'Biometric',
                      icon: Fingerprint,
                    },
                    {
                      id: 'qr',
                      label: isThai ? 'บัตร QR' : 'Badge',
                      icon: QrCode,
                    },
                    {
                      id: 'email',
                      label: isThai ? 'อีเมล' : 'Email',
                      icon: UserRound,
                    },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = loginMode === tab.id;
                  return (
                    <button
                      type="button"
                      key={tab.id}
                      disabled={!terminalReady}
                      onClick={() => {
                        setLoginMode(tab.id);
                        setPin('');
                      }}
                      className={`h-9 px-2 text-[11px] sm:text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap disabled:cursor-not-allowed cursor-pointer ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          active ? 'text-primary' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Touch Role / Account Fill Strip — Clean 3-column single row */}
              <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {isThai ? 'กรอกข้อมูลด่วน (Quick Fill)' : '1-Tap Quick Fill'}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {isThai ? 'แตะเพื่อทดสอบสิทธิ์' : 'Tap role preset'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={!terminalReady || isLoading}
                    onClick={() => {
                      setLoginMode('pin');
                      setPin('0000');
                    }}
                    className="h-8 px-2 rounded-lg bg-white border border-slate-200 hover:border-primary text-[11px] font-bold text-slate-700 hover:text-primary transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap truncate"
                  >
                    <span className="truncate">Cashier</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">0000</span>
                  </button>
                  <button
                    type="button"
                    disabled={!terminalReady || isLoading}
                    onClick={() => {
                      setLoginMode('pin');
                      setPin('5678');
                    }}
                    className="h-8 px-2 rounded-lg bg-white border border-slate-200 hover:border-primary text-[11px] font-bold text-slate-700 hover:text-primary transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap truncate"
                  >
                    <span className="truncate">Manager</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">5678</span>
                  </button>
                  <button
                    type="button"
                    disabled={!terminalReady || isLoading}
                    onClick={() => {
                      setLoginMode('email');
                      setIdentity('kamkokaewthodsawat@gmail.com');
                      setSecret('Qeawds&1991&');
                    }}
                    className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-900 hover:bg-slate-800 text-[11px] font-bold text-white transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap truncate"
                  >
                    <ShieldCheck className="w-3 h-3 text-[#ff6b1a] shrink-0" />
                    <span className="truncate">Owner</span>
                  </button>
                </div>
              </div>

              {/* PIN Mode */}
              {loginMode === 'pin' && (
                <div className="space-y-4">
                  <div className="flex justify-center gap-2 sm:gap-2.5">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-10 h-12 sm:w-12 sm:h-13 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${
                          pin.length > i
                            ? 'border-primary bg-primary/5 text-primary scale-105'
                            : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        {pin.length > i ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <button
                        type="button"
                        key={digit}
                        disabled={!terminalReady || isLoading}
                        onClick={() => handlePinInput(digit.toString())}
                        className="h-12 sm:h-13 rounded-xl bg-white border-2 border-slate-100 text-lg font-black text-slate-900 hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-[0.96] transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={!terminalReady || isLoading}
                      onClick={handlePinClear}
                      className="h-12 sm:h-13 rounded-xl bg-slate-50 text-slate-500 font-extrabold text-xs uppercase hover:bg-rose-50 hover:text-rose-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isThai ? 'ล้าง' : 'Clear'}
                    </button>
                    <button
                      type="button"
                      disabled={!terminalReady || isLoading}
                      onClick={() => handlePinInput('0')}
                      className="h-12 sm:h-13 rounded-xl bg-white border-2 border-slate-100 text-lg font-black text-slate-900 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      disabled={!terminalReady || isLoading}
                      onClick={handlePinDelete}
                      className="h-12 sm:h-13 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!terminalReady || pin.length < 4 || isLoading}
                    onClick={() => submit()}
                    className="w-full h-12 px-5 bg-primary text-white rounded-xl font-black text-sm flex items-center justify-center gap-2.5 hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-lg shadow-primary/20 cursor-pointer whitespace-nowrap"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <span className="truncate">{copy.signIn}</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      disabled={!terminalReady || isLoading || isBiometricVerifying}
                      onClick={() => {
                        setLoginMode('biometric');
                        void handleBiometricLogin();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary transition-colors disabled:opacity-40 cursor-pointer truncate"
                    >
                      <Fingerprint className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">
                        {isThai ? 'สแกนลายนิ้วมือ / Face ID' : 'Use Fingerprint / Face ID'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleForgotPin}
                      className="text-xs font-bold text-slate-400 hover:text-primary transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      {copy.password}?
                    </button>
                  </div>
                </div>
              )}

              {/* Biometric / WebAuthn Mode (Fingerprint & Facial Recognition) */}
              {loginMode === 'biometric' && (
                <div className="space-y-3.5">
                  {/* Hardware Authenticator Capability Banner — Crisp, non-clipped text */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <ScanFace className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {isThai ? 'พร้อมสแกนลายนิ้วมือ / Face ID' : 'Biometric Sensor Ready'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {webauthnCapability?.biometricLabel || 'FIDO2 / WebAuthn Passkey'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEnrollModalOpen(true)}
                      className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#ff6b1a] shrink-0" />
                      <span>{isThai ? 'จัดการคีย์' : 'Passkeys'}</span>
                    </button>
                  </div>

                  {/* Enrolled Staff Passkey Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                        {isThai ? 'เลือกบัญชีพนักงาน (Passkey)' : 'Select Staff Biometric Profile'}
                      </span>
                      <span className="shrink-0 whitespace-nowrap rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                        {enrolledPasskeys.length} KEYS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto pr-0.5">
                      {enrolledPasskeys.map((pk) => {
                        const isSelected = pk.id === selectedPasskeyId;
                        return (
                          <div
                            key={pk.id}
                            onClick={() => setSelectedPasskeyId(pk.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedPasskeyId(pk.id);
                              }
                            }}
                            className={`rounded-xl border-2 px-3 py-2.5 flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-primary bg-primary/5 shadow-2xs'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {pk.authenticatorType === 'face_id' ? (
                                  <ScanFace className="w-4 h-4" />
                                ) : (
                                  <Fingerprint className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs font-extrabold text-slate-900 truncate">
                                    {pk.userName}
                                  </span>
                                  <span className="shrink-0 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-slate-600">
                                    {pk.userRole}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {pk.deviceLabel}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={!terminalReady || isLoading || isBiometricVerifying}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPasskeyId(pk.id);
                                void handleBiometricLogin(pk);
                              }}
                              className="shrink-0 whitespace-nowrap h-8 px-3 rounded-lg bg-slate-900 hover:bg-primary text-white text-[11px] font-bold transition-colors disabled:opacity-40 cursor-pointer inline-flex items-center justify-center gap-1.5"
                            >
                              <Fingerprint className="w-3.5 h-3.5 shrink-0" />
                              <span>{isThai ? 'สแกน' : 'Scan'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Primary Biometric Trigger CTA — Balanced padding, single-line non-crowded label */}
                  <button
                    type="button"
                    disabled={!terminalReady || isLoading || isBiometricVerifying}
                    onClick={() => void handleBiometricLogin()}
                    className="w-full h-12 sm:h-13 px-5 bg-primary text-white rounded-xl font-black text-sm flex items-center justify-center gap-2.5 hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary/20 cursor-pointer whitespace-nowrap"
                  >
                    {isBiometricVerifying || isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span className="truncate">
                          {isThai ? 'กำลังตรวจสอบชีวมิติ...' : 'Verifying Biometrics...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {isThai
                            ? 'สแกนลายนิ้วมือ / Face ID เพื่อเข้าสู่ระบบ'
                            : 'Sign In with Biometrics'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* QR Mode */}
              {loginMode === 'qr' && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl border-4 border-slate-50 bg-slate-900 overflow-hidden aspect-square max-w-[240px] sm:max-w-[260px] mx-auto shadow-xl">
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
                      <div className="w-40 h-40 border-2 border-white/20 rounded-2xl flex items-center justify-center">
                        <div className="w-full h-0.5 bg-primary/60 absolute animate-scan-pulse shadow-[0_0_15px_rgba(255,107,26,0.8)]" />
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center gap-1.5 text-primary font-black text-xs uppercase tracking-wider mb-1">
                      <Camera className="w-4 h-4 shrink-0" />
                      <span>{isThai ? 'พร้อมสแกนบัตรพนักงาน' : 'Ready to Scan Badge'}</span>
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
                <form onSubmit={submit} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      {copy.identity}
                    </label>
                    <div className="relative">
                      <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={identity}
                        disabled={!terminalReady || isLoading}
                        onChange={(e) => setIdentity(e.target.value)}
                        placeholder={copy.identityPlaceholder}
                        className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      {copy.password}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={secret}
                        disabled={!terminalReady || isLoading}
                        onChange={(e) => setSecret(e.target.value)}
                        className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-12 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-primary transition-all disabled:opacity-50"
                      />
                      <button
                        type="button"
                        disabled={!terminalReady || isLoading}
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    className="w-full h-12 px-5 bg-primary text-white rounded-xl font-black text-sm flex items-center justify-center gap-2.5 hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-lg shadow-primary/20 cursor-pointer whitespace-nowrap"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <span className="truncate">{copy.signIn}</span>
                    )}
                  </button>

                  {/* Alternative Passwordless Biometric Trigger inside Email Mode */}
                  <button
                    type="button"
                    disabled={!terminalReady || isLoading || isBiometricVerifying}
                    onClick={() => void handleBiometricLogin()}
                    className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-primary text-xs font-bold text-slate-700 hover:text-primary flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer whitespace-nowrap"
                  >
                    <Fingerprint className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">
                      {isThai
                        ? 'สแกนลายนิ้วมือ / Face ID แทนรหัสผ่าน'
                        : 'Sign In with Biometrics Instead'}
                    </span>
                  </button>
                </form>
              )}

              {/* Remember Me with Biometrics (Auto-WebAuthn Challenge on POS Load) */}
              <div className="mt-4 pt-3.5 border-t border-slate-100">
                <label
                  htmlFor="remember-biometrics-checkbox"
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-all cursor-pointer select-none ${
                    rememberBiometrics
                      ? 'border-emerald-500/40 bg-emerald-50/50'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      id="remember-biometrics-checkbox"
                      name="rememberBiometrics"
                      type="checkbox"
                      checked={rememberBiometrics}
                      onChange={(e) => handleToggleRememberBiometrics(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary accent-[#ff6b1a] cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 truncate">
                        Remember Me with Biometrics
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {isThai
                          ? 'สแกนลายนิ้วมือ / Face ID อัตโนมัติเมื่อเปิดหน้าจอ POS'
                          : 'Auto-initiate biometric login when POS loads'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider ${
                      rememberBiometrics
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Fingerprint className="w-3 h-3 shrink-0" />
                    <span>{rememberBiometrics ? 'AUTO' : 'OFF'}</span>
                  </span>
                </label>
              </div>
            </div>

            {/* WebAuthn Passkey Enrollment & Device Management Modal */}
            <PasskeyEnrollModal
              isOpen={isEnrollModalOpen}
              onClose={() => setIsEnrollModalOpen(false)}
              onPasskeysUpdated={() => {
                void refreshPasskeysAndCapability();
              }}
            />

            {/* Dedicated Admin Login Path Callout */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
                <ShieldCheck className="w-4 h-4 text-[#ff6b1a] shrink-0" />
                <span className="font-semibold truncate">
                  {isThai ? 'ผู้ดูแลระบบ (Admin Console)' : 'Enterprise Admin Console'}
                </span>
              </div>
              <button
                type="button"
                onClick={navigateToAdminLogin}
                className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-xs font-black text-slate-900 hover:text-[#ff6b1a] transition-colors cursor-pointer"
              >
                <span>{isThai ? 'เข้าหน้า Admin' : 'Admin Login'}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>

            <footer className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-bold text-slate-400">
              <div className="flex items-center gap-2 shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{copy.security}</span>
              </div>
              <div className="sm:text-right leading-relaxed">{copy.serverNote}</div>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
};
