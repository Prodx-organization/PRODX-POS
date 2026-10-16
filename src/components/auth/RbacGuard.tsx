/**
 * PRODX POS - Enterprise Role-Based Access Control (RBAC) Guard Wrapper
 * Conditionally protects financial-sensitive modules (Audit, Shift management, Settings, Dashboard)
 * based on user roles (Manager vs. Staff / Cashier), ensuring UI consistency with the enterprise design system.
 */

import React, { useState } from 'react';
import { Role, Permission } from '../../domain/auth';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { NavRoute } from '../layout/Sidebar';
import { SupervisorAuthModal } from './SupervisorAuthModal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  ShieldAlert,
  Lock,
  ArrowLeft,
  KeyRound,
  Shield,
  UserCheck,
} from 'lucide-react';

export type RoleOrStaff = Role | 'staff';

export interface ModuleRule {
  allowedRoles: Role[];
  requiredPermissions?: Permission[];
  featureNameEn: string;
  featureNameTh: string;
  descriptionEn: string;
  descriptionTh: string;
  isSensitiveFinancial: boolean;
}

export const MODULE_ACCESS_RULES: Record<NavRoute, ModuleRule> = {
  pos: {
    allowedRoles: ['cashier', 'manager', 'admin'],
    requiredPermissions: ['pos:checkout'],
    featureNameEn: 'POS Cash Register',
    featureNameTh: 'หน้าขาย / เครื่องคิดเงิน',
    descriptionEn: 'Daily cashier checkout, barcode scanning, and order processing.',
    descriptionTh: 'การคิดเงินหน้าร้าน สแกนบาร์โค้ด และออกใบเสร็จ',
    isSensitiveFinancial: false,
  },
  kds: {
    allowedRoles: ['cashier', 'manager', 'admin'],
    requiredPermissions: ['pos:checkout'],
    featureNameEn: 'Kitchen Display System (KDS)',
    featureNameTh: 'ระบบจอแสดงรายการในครัว (KDS)',
    descriptionEn: 'Order preparation tickets, cooking status and dispatch.',
    descriptionTh: 'จัดการออเดอร์ในครัว เวลารอ และสถานะพร้อมเสิร์ฟ',
    isSensitiveFinancial: false,
  },
  orders: {
    allowedRoles: ['cashier', 'manager', 'admin'],
    featureNameEn: 'Orders & Receipts Journal',
    featureNameTh: 'ประวัติคำสั่งซื้อและใบเสร็จ',
    descriptionEn: 'Order lookup, receipt reprints, and historical transaction logs.',
    descriptionTh: 'ค้นหาบิลย้อนหลัง พิมพ์ใบเสร็จซ้ำ และดูประวัติการขาย',
    isSensitiveFinancial: false,
  },
  inventory: {
    allowedRoles: ['cashier', 'manager', 'admin'],
    requiredPermissions: ['inventory:read'],
    featureNameEn: 'Inventory Catalog',
    featureNameTh: 'คลังสินค้าและสต็อก',
    descriptionEn: 'Stock counts, barcode printing, and catalog lookups.',
    descriptionTh: 'ตรวจสอบจำนวนสินค้าคงคลัง และพิมพ์ป้ายบาร์โค้ด',
    isSensitiveFinancial: false,
  },
  customers: {
    allowedRoles: ['cashier', 'manager', 'admin'],
    requiredPermissions: ['customers:read'],
    featureNameEn: 'Customer CRM & Loyalty',
    featureNameTh: 'ระบบสมาชิกลูกค้า',
    descriptionEn: 'Customer points balance, tier discounts, and loyalty profiles.',
    descriptionTh: 'ตรวจสอบคะแนนสะสม สิทธิประโยชน์สมาชิก และข้อมูลติดต่อ',
    isSensitiveFinancial: false,
  },
  dashboard: {
    allowedRoles: ['manager', 'admin'],
    requiredPermissions: ['reports:read'],
    featureNameEn: 'Sales & Executive Dashboard',
    featureNameTh: 'แดชบอร์ดสรุปยอดขายและผลประกอบการ',
    descriptionEn: 'Consolidated gross profit margins, store revenue metrics, and financial reporting.',
    descriptionTh: 'รายงานกำไรขั้นต้น ยอดขายรวมของสาขา และตัวชี้วัดทางการเงินเชิงลึก',
    isSensitiveFinancial: true,
  },
  shift: {
    allowedRoles: ['cashier', 'manager', 'admin'],
    requiredPermissions: ['shift:open'],
    featureNameEn: 'Cash Drawer & Shift Management',
    featureNameTh: 'ควบคุมกะการทำงานและลิ้นชักเงินสด',
    descriptionEn: 'Cash drawer float, staff timeclock, drawer reconciliation, and shift Z-Reports.',
    descriptionTh: 'การนับเงินทอนเริ่มต้น บันทึกเวลาเข้า-ออกกะ การกระทบยอดลิ้นชัก และการปิดสรุปกะ Z-Report',
    isSensitiveFinancial: false,
  },
  audit: {
    allowedRoles: ['manager', 'admin'],
    requiredPermissions: ['audit:read'],
    featureNameEn: 'Enterprise Security & Financial Audit Trail',
    featureNameTh: 'บันทึกประวัติความปลอดภัยและการตรวจสอบระบบ',
    descriptionEn: 'Immutable cryptographic security logs, cashier overrides, and compliance records.',
    descriptionTh: 'บันทึกเหตุการณ์ความปลอดภัยที่ไม่สามารถแก้ไขได้ การอนุมัติของผู้จัดการ และการเข้าถึงระบบ',
    isSensitiveFinancial: true,
  },
  settings: {
    allowedRoles: ['manager', 'admin'],
    requiredPermissions: ['settings:manage'],
    featureNameEn: 'System & Financial Settings',
    featureNameTh: 'ตั้งค่าระบบและนโยบายการเงิน',
    descriptionEn: 'Fiscal tax rates, security policies, hardware peripherals, and store setup.',
    descriptionTh: 'กำหนดอัตราภาษี นโยบายความปลอดภัย อุปกรณ์ต่อพ่วง และการตั้งค่าสาขา',
    isSensitiveFinancial: true,
  },
  infrastructure: {
    allowedRoles: ['manager', 'admin'],
    requiredPermissions: ['settings:manage'],
    featureNameEn: 'Antigravity AI & Plug & Play Infrastructure',
    featureNameTh: 'ระบบ AI และอุปกรณ์ฮาร์ดแวร์ (Antigravity)',
    descriptionEn: 'Backend infrastructure supervisor, 24/7 automated self-healing, and Plug & Play device drivers.',
    descriptionTh: 'ระบบดูแลโครงสร้างพื้นฐาน AI อัตโนมัติ 24/7 และจัดการไดรเวอร์อุปกรณ์ Plug & Play',
    isSensitiveFinancial: false,
  },
};

/**
 * Custom Hook for RBAC evaluation
 */
export function useRbac() {
  const { session, can } = useAuth();
  const user = session?.currentUser ?? null;
  const role = user?.role ?? null;

  const isManager = role === 'manager' || role === 'admin';
  const isStaff = role === 'cashier';

  const hasRole = (roles: RoleOrStaff | RoleOrStaff[]): boolean => {
    if (!role) return false;
    const list = (Array.isArray(roles) ? roles : [roles]).map((r) =>
      r === 'staff' ? 'cashier' : r
    );
    return list.includes(role);
  };

  const canAccessModule = (module: NavRoute): boolean => {
    if (!session || !user) return false;
    const rule = MODULE_ACCESS_RULES[module];
    if (!rule) return true;

    // Check role eligibility
    if (!rule.allowedRoles.includes(user.role)) {
      return false;
    }

    // Check permissions
    if (rule.requiredPermissions && rule.requiredPermissions.length > 0) {
      const hasAll = rule.requiredPermissions.every((perm) => can(perm));
      if (!hasAll) return false;
    }

    return true;
  };

  const isFinancialModule = (module: NavRoute): boolean => {
    return MODULE_ACCESS_RULES[module]?.isSensitiveFinancial ?? false;
  };

  return {
    user,
    role,
    isManager,
    isStaff,
    hasRole,
    canAccessModule,
    isFinancialModule,
  };
}

export interface RbacGuardProps {
  module?: NavRoute;
  allowedRoles?: RoleOrStaff[];
  requiredRole?: 'manager' | 'staff' | 'admin';
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requireAllPermissions?: boolean;
  featureName?: string;
  moduleDescription?: string;
  hideMode?: 'hidden' | 'denied-card';
  fallback?: React.ReactNode;
  onRedirectToPos?: () => void;
  allowSupervisorOverride?: boolean;
  children: React.ReactNode;
}

export const RbacGuard: React.FC<RbacGuardProps> = ({
  module,
  allowedRoles,
  requiredRole,
  requiredPermission,
  requiredPermissions,
  requireAllPermissions = false,
  featureName,
  moduleDescription,
  hideMode = 'denied-card',
  fallback = null,
  onRedirectToPos,
  allowSupervisorOverride = true,
  children,
}) => {
  const { session, can, switchDemoRole } = useAuth();
  const { language } = useLanguage();
  const [supervisorOverrideGranted, setSupervisorOverrideGranted] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);

  // If override granted during this session, grant access
  if (supervisorOverrideGranted) {
    return <>{children}</>;
  }

  // Determine effective allowed roles
  let effectiveAllowedRoles: Role[] | undefined = undefined;

  if (requiredRole === 'manager') {
    effectiveAllowedRoles = ['manager', 'admin'];
  } else if (requiredRole === 'admin') {
    effectiveAllowedRoles = ['admin'];
  } else if (requiredRole === 'staff') {
    effectiveAllowedRoles = ['cashier', 'manager', 'admin'];
  } else if (allowedRoles && allowedRoles.length > 0) {
    effectiveAllowedRoles = allowedRoles.map((r) => (r === 'staff' ? 'cashier' : r));
  }

  let effectivePermissions = requiredPermissions || (requiredPermission ? [requiredPermission] : []);
  let effectiveName = featureName;
  let effectiveDesc = moduleDescription;
  let isSensitive = false;

  if (module && MODULE_ACCESS_RULES[module]) {
    const rule = MODULE_ACCESS_RULES[module];
    if (!effectiveAllowedRoles) {
      effectiveAllowedRoles = rule.allowedRoles;
    }
    if (effectivePermissions.length === 0 && rule.requiredPermissions) {
      effectivePermissions = [...rule.requiredPermissions];
    }
    if (!effectiveName) {
      effectiveName = language === 'th' ? rule.featureNameTh : rule.featureNameEn;
    }
    if (!effectiveDesc) {
      effectiveDesc = language === 'th' ? rule.descriptionTh : rule.descriptionEn;
    }
    isSensitive = rule.isSensitiveFinancial;
  }

  const currentUser = session?.currentUser;

  // Evaluation
  let isAllowed = true;

  if (!currentUser) {
    isAllowed = false;
  } else {
    // 1. Role validation (Manager vs. Staff / Cashier)
    if (effectiveAllowedRoles && effectiveAllowedRoles.length > 0) {
      if (!effectiveAllowedRoles.includes(currentUser.role)) {
        isAllowed = false;
      }
    }

    // 2. Permission validation
    if (isAllowed && effectivePermissions && effectivePermissions.length > 0) {
      if (requireAllPermissions) {
        const hasAll = effectivePermissions.every((p) => can(p));
        if (!hasAll) isAllowed = false;
      } else {
        const hasAtLeastOne = effectivePermissions.some((p) => can(p));
        if (!hasAtLeastOne) isAllowed = false;
      }
    }
  }

  // If authorized, render children
  if (isAllowed) {
    return <>{children}</>;
  }

  // If unauthorized and mode is 'hidden', render fallback or nothing
  if (hideMode === 'hidden') {
    return fallback ? <>{fallback}</> : null;
  }

  // Format required roles description
  const rolesList = effectiveAllowedRoles || ['manager', 'admin'];
  const requiredRolesDisplay = rolesList
    .map((r) => (r === 'cashier' ? 'Staff' : r === 'manager' ? 'Manager' : 'Administrator'))
    .join(' / ');

  const currentRoleDisplay =
    currentUser?.role === 'cashier'
      ? 'Staff (Cashier)'
      : currentUser?.role === 'manager'
      ? 'Shift Manager'
      : currentUser?.role === 'admin'
      ? 'Administrator'
      : 'Unknown';

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background select-none overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl border border-border border-crisp bg-card p-6 sm:p-8 shadow-xs text-center space-y-5">
        {/* Security Shield Icon Header */}
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        {/* Status Badges */}
        <div className="flex items-center justify-center gap-2">
          <Badge variant="warning" size="sm" className="font-mono uppercase text-xs font-bold tracking-wider">
            <Lock className="w-3 h-3 mr-1 inline" />
            {language === 'th' ? 'จำกัดสิทธิ์การเข้าถึง' : 'Access Restricted'}
          </Badge>
          {isSensitive && (
            <Badge variant="neutral" size="sm" className="font-mono uppercase text-[10px] font-bold tracking-wider">
              {language === 'th' ? 'โมดูลการเงิน' : 'Financial Module'}
            </Badge>
          )}
        </div>

        {/* Feature Title & Explanation */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-text tracking-tight">
            {effectiveName || (language === 'th' ? 'โมดูลที่ต้องได้รับการอนุมัติ' : 'Protected Enterprise Module')}
          </h2>
          <p className="text-xs sm:text-sm text-text/70 max-w-md mx-auto leading-relaxed">
            {language === 'th'
              ? `โมดูลนี้ประกอบด้วยการจัดการเงินสด ยอดกระทบ หรือบันทึกความปลอดภัย ซึ่งอนุญาตเฉพาะบทบาทระดับ ${requiredRolesDisplay} เท่านั้น`
              : `This sensitive module contains cash drawer balances, reconciliation, or audit logs restricted to ${requiredRolesDisplay} roles.`}
          </p>
          {effectiveDesc && (
            <p className="text-[11px] text-text/50 italic max-w-sm mx-auto">
              "{effectiveDesc}"
            </p>
          )}
        </div>

        {/* Active Session Context Breakdown (clean enterprise key-value divider) */}
        <div className="border-y border-border border-crisp py-3.5 my-3 divide-y divide-border/60 text-xs text-left">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-text/60 font-medium">
              {language === 'th' ? 'ผู้ใช้งานปัจจุบัน (Active User):' : 'Current Session User:'}
            </span>
            <span className="font-bold text-text truncate max-w-[220px]">
              {currentUser?.name || 'Unknown User'}{' '}
              <span className="text-text/50 font-mono text-[11px]">({currentUser?.employeeCode})</span>
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-text/60 font-medium">
              {language === 'th' ? 'สิทธิ์การใช้งาน (Current Role):' : 'Assigned Role:'}
            </span>
            <Badge
              variant={currentUser?.role === 'cashier' ? 'neutral' : 'warning'}
              size="sm"
              className="font-mono font-bold uppercase"
            >
              {currentRoleDisplay}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-text/60 font-medium">
              {language === 'th' ? 'สิทธิ์ที่จำเป็น (Required Role):' : 'Required Role Level:'}
            </span>
            <span className="font-mono font-bold text-primary">
              {requiredRolesDisplay}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-text/60 font-medium">
              {language === 'th' ? 'บันทึกความปลอดภัย:' : 'Security Policy:'}
            </span>
            <span className="text-text/50 font-mono text-[11px] flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500" />
              {language === 'th' ? 'บันทึกใน Audit Trail อัตโนมัติ' : 'Incident Logged'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-1">
          {allowSupervisorOverride && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setIsSupervisorModalOpen(true)}
              className="w-full justify-center font-bold text-xs cursor-pointer"
              leftIcon={<KeyRound className="w-4 h-4" />}
            >
              {language === 'th'
                ? 'ขอยืนยันสิทธิ์จากหัวหน้างาน (Supervisor Override)'
                : 'Request Supervisor Override'}
            </Button>
          )}

          {onRedirectToPos && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onRedirectToPos}
              className="w-full justify-center font-bold text-xs cursor-pointer"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              {language === 'th'
                ? 'กลับสู่หน้าขายหน้าร้าน (Return to POS)'
                : 'Return to POS Cash Register (F1)'}
            </Button>
          )}
        </div>

        {/* Live Role Switcher for seamless test verification */}
        <div className="pt-3 border-t border-border/60">
          <div className="flex items-center justify-between text-[11px] font-medium text-text/50 mb-2">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              {language === 'th' ? 'สลับบทบาทเพื่อทดสอบ (Test Role Switch):' : 'Test RBAC (Manager vs. Staff):'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => switchDemoRole('cashier')}
              className={`px-2 py-1.5 text-[11px] rounded-lg font-bold transition-all cursor-pointer ${
                currentUser?.role === 'cashier'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-background border border-border border-crisp text-text/70 hover:text-text'
              }`}
            >
              Staff (John)
            </button>
            <button
              type="button"
              onClick={() => switchDemoRole('manager')}
              className={`px-2 py-1.5 text-[11px] rounded-lg font-bold transition-all cursor-pointer ${
                currentUser?.role === 'manager'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-background border border-border border-crisp text-text/70 hover:text-text'
              }`}
            >
              Manager (Sarah)
            </button>
            <button
              type="button"
              onClick={() => switchDemoRole('admin')}
              className={`px-2 py-1.5 text-[11px] rounded-lg font-bold transition-all cursor-pointer ${
                currentUser?.role === 'admin'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-background border border-border border-crisp text-text/70 hover:text-text'
              }`}
            >
              Admin (Alex)
            </button>
          </div>
        </div>
      </div>

      {/* Supervisor Authorization Modal */}
      {isSupervisorModalOpen && (
        <SupervisorAuthModal
          isOpen={isSupervisorModalOpen}
          onClose={() => setIsSupervisorModalOpen(false)}
          title={
            language === 'th'
              ? `อนุมัติการเข้าถึง: ${effectiveName}`
              : `Authorize Access: ${effectiveName}`
          }
          actionDescription={
            language === 'th'
              ? `ผู้ใช้งาน ${currentUser?.name} (${currentUser?.role}) ขอเข้าใช้งานโมดูลทางการเงิน ${effectiveName}`
              : `Staff member ${currentUser?.name} requested elevated access to financial module ${effectiveName}`
          }
          requiredRole={rolesList.includes('manager') ? 'manager' : 'admin'}
          onAuthorized={() => {
            setSupervisorOverrideGranted(true);
            setIsSupervisorModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
