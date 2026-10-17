import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { getSystemConfigCatalog } from '../../services/systemConfigService';
import { Organization } from '../settings/types';

export interface AdminLoginScreenProps {
  onBackToPos?: () => void;
  onLoginSuccess?: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  onBackToPos,
  onLoginSuccess,
}) => {
  const { login, isLoading } = useAuth();
  const { language } = useLanguage();
  const { addToast } = useToast();
  const isThai = language === 'th';

  const [authMode, setAuthMode] = useState<'credentials' | 'pin'>('credentials');
  const [email, setEmail] = useState('alex.vance@prodx.io');
  const [password, setPassword] = useState('999999');
  const [adminPin, setAdminPin] = useState('');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgSlug, setSelectedOrgSlug] = useState('prodx');
  const [rbacError, setRbacError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchOrgs = async () => {
      try {
        const catalog = await getSystemConfigCatalog();
        if (!active) return;
        setOrgs(catalog.organizations);
        if (catalog.organizations.length > 0) {
          const matched =
            catalog.organizations.find((o) => o.slug === selectedOrgSlug) ||
            catalog.organizations[0];
          setSelectedOrgSlug(matched.slug);
        }
      } catch {
        // Keep default fallback slug
      }
    };
    void fetchOrgs();
    return () => {
      active = false;
    };
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRbacError(null);

    const identity = authMode === 'pin' ? adminPin.trim() : email.trim();
    const secret = authMode === 'pin' ? adminPin.trim() : password;

    if (!identity || !secret) {
      const msg = isThai
        ? 'กรุณาระบุข้อมูลยืนยันตัวตนของผู้ดูแลระบบให้ครบถ้วน'
        : 'Please provide valid administrator credentials.';
      setRbacError(msg);
      addToast({
        title: isThai ? 'เข้าสู่ระบบผู้ดูแลระบบ' : 'Admin Login',
        message: msg,
        type: 'error',
      });
      return;
    }

    const activeOrg = orgs.find((o) => o.slug === selectedOrgSlug) || orgs[0];

    try {
      await login({
        organizationSlug: activeOrg?.slug || selectedOrgSlug || 'prodx',
        storeCode: 'STR-01',
        registerId: 'ADMIN-CONSOLE',
        emailOrPin: identity,
        passwordOrPin: secret,
        requireAdminRole: true,
        organizationContext: activeOrg
          ? {
              organizationId: activeOrg.id,
              organizationName: activeOrg.name,
              organizationSlug: activeOrg.slug,
              branchId: 'br-str-01',
              branchName: 'STR-01',
              branchAddress: 'Enterprise HQ Console',
              terminalId: 'term-admin',
              terminalName: 'Administrator Console',
              terminalCode: 'ADMIN-CONSOLE',
            }
          : undefined,
      });

      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/admin');
      }
      onLoginSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isThai
          ? 'ปฏิเสธการเข้าถึง: เฉพาะบัญชีที่มีบทบาทผู้ดูแลระบบ (admin) เท่านั้น'
          : 'Access Denied: Only accounts with the "admin" role can access the Administrator Console.';
      setRbacError(message);
      addToast({
        title: isThai ? 'การยืนยันสิทธิ์ล้มเหลว' : 'Admin RBAC Verification Failed',
        message,
        type: 'error',
      });
    }
  };

  return (
    <div className="min-h-[100svh] flex items-center justify-center bg-slate-950 text-white p-6 font-sans">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 p-8 sm:p-10 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-[#ff6b1a]/15 border border-[#ff6b1a]/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-[#ff6b1a]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#ff6b1a] mb-0.5">
                <span>PRODX ENTERPRISE · /ADMIN/LOGIN</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                {isThai ? 'เข้าสู่ระบบผู้ดูแลระบบ (Admin Login)' : 'Administrator Console Login'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isThai
                  ? 'เส้นทางเข้าสู่ระบบแยกเฉพาะสำหรับผู้ดูแลระบบ (RBAC Enforced)'
                  : 'Dedicated RBAC-enforced authentication path for enterprise administrators'}
              </p>
            </div>
          </div>
        </div>

        {/* RBAC Enforcement Notice */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              {isThai ? 'การควบคุมสิทธิ์ RBAC ระดับผู้ดูแลระบบ' : 'Strict RBAC Role Gate Active'}
            </span>
            <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] uppercase">
              role === &apos;admin&apos;
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isThai
              ? 'การเข้าสู่ระบบผ่านช่องทางนี้ไม่ผูกกับหน้าขาย POS ปกติ และอนุญาตเฉพาะบัญชีผู้ดูแลระบบเพื่อเข้าถึงการจัดการองค์กร สาขา เครื่องขาย สิทธิ์พนักงาน และบันทึกความปลอดภัยทั้งหมด'
              : 'Separated from standard POS cashier login. Authenticating here verifies administrator privileges and unlocks full console access to Organizations, Branches, Terminals, RBAC & System Settings, and Audit Logs.'}
          </p>
        </div>

        {/* RBAC Error Banner */}
        {rbacError && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 flex items-start gap-3 text-rose-200"
          >
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-black uppercase tracking-wider text-rose-300">
                {isThai ? 'ปฏิเสธการเข้าถึงตามนโยบาย RBAC' : 'RBAC Authorization Denied'}
              </div>
              <p className="font-medium text-rose-200/90 leading-relaxed">{rbacError}</p>
            </div>
          </div>
        )}

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode('credentials');
              setRbacError(null);
            }}
            className={`py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
              authMode === 'credentials'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            {isThai ? 'อีเมลผู้ดูแลระบบ' : 'Admin Email & Key'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('pin');
              setRbacError(null);
            }}
            className={`py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
              authMode === 'pin'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            {isThai ? 'รหัส PIN ผู้ดูแลระบบ' : 'Admin Master PIN'}
          </button>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          {/* Organization Scope Selector */}
          <label className="block">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#ff6b1a]" />
              {isThai ? 'องค์กรหลักที่ต้องการจัดการ' : 'Primary Organization Scope'}
            </span>
            <select
              value={selectedOrgSlug}
              onChange={(e) => setSelectedOrgSlug(e.target.value)}
              className="w-full h-12 mt-1.5 rounded-xl bg-slate-950 border border-slate-800 px-4 text-sm font-bold text-white focus:border-[#ff6b1a] outline-none"
            >
              {orgs.length === 0 ? (
                <option value="prodx">PRODX Retail Group (prodx)</option>
              ) : (
                orgs.map((o) => (
                  <option key={o.id} value={o.slug}>
                    {o.name} ({o.slug})
                  </option>
                ))
              )}
            </select>
          </label>

          {authMode === 'credentials' ? (
            <>
              <label className="block">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {isThai ? 'อีเมลผู้ดูแลระบบ (Admin Email)' : 'Administrator Email'}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.vance@prodx.io"
                  className="w-full h-12 mt-1.5 rounded-xl bg-slate-950 border border-slate-800 px-4 text-sm font-bold text-white focus:border-[#ff6b1a] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  {isThai ? 'รหัสผ่าน / รหัส PIN ผู้ดูแลระบบ' : 'Admin Password / Security PIN'}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password or PIN (e.g. 999999)"
                  className="w-full h-12 mt-1.5 rounded-xl bg-slate-950 border border-slate-800 px-4 text-sm font-bold text-white focus:border-[#ff6b1a] outline-none"
                />
              </label>
            </>
          ) : (
            <label className="block">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                {isThai ? 'รหัส PIN สำหรับผู้ดูแลระบบ (เช่น 1234 หรือ 999999)' : 'Administrator Security PIN (e.g. 1234)'}
              </span>
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="1234"
                maxLength={8}
                className="w-full h-12 mt-1.5 rounded-xl bg-slate-950 border border-slate-800 px-4 text-center tracking-[0.4em] text-lg font-black text-white focus:border-[#ff6b1a] outline-none"
              />
            </label>
          )}

          {/* Quick Demo Hint for Admin vs Non-Admin RBAC Verification */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-[11px] text-slate-400 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-300">
                {isThai ? 'บัญชีผู้ดูแลระบบเริ่มต้น:' : 'Default Admin Account:'}
              </span>{' '}
              <code className="text-emerald-400">alex.vance@prodx.io</code> / PIN{' '}
              <code className="text-emerald-400">999999</code> (or PIN{' '}
              <code className="text-emerald-400">1234</code>).{' '}
              {isThai
                ? 'บัญชี Cashier/Manager จะถูกปฏิเสธโดยกฎ RBAC ทันที'
                : 'Cashier or Manager accounts are automatically rejected by RBAC.'}
            </div>
          </div>

          <button
            disabled={isLoading}
            type="submit"
            className="w-full h-12 mt-2 bg-[#ff6b1a] rounded-xl font-black text-sm text-white hover:bg-[#eb5b0c] flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-[#ff6b1a]/20"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isThai ? (
              'ยืนยันสิทธิ์และเข้าสู่ Admin Console'
            ) : (
              'Authenticate & Open Admin Console'
            )}
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {onBackToPos && (
          <button
            type="button"
            onClick={onBackToPos}
            className="w-full h-11 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isThai ? 'กลับสู่หน้าเข้าสู่ระบบพนักงานขาย POS' : 'Return to Standard POS Operator Login'}
          </button>
        )}
      </div>
    </div>
  );
};
