export type StaffId = 'john' | 'sarah' | 'alex';

export interface StaffAccount {
  id: StaffId;
  userId: string;
  name: string;
  firstName: string;
  initials: string;
  role: string;
  roleKey: 'cashier' | 'manager' | 'admin';
  roleLabel: { th: string; en: string };
  roleSummary: { th: string; en: string };
  email: string;
  employeeCode: string;
  defaultPin: string;
  avatarClass: string;
  pillClass: string;
  selectedClass: string;
}

// Demo hints (default PINs, quick sign-in) must never reach a production bundle.
export const IS_DEV_BUILD = (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

export const STAFF_ACCOUNTS: readonly StaffAccount[] = [
  {
    id: 'john',
    userId: 'usr-cashier-john',
    name: 'John Doe',
    firstName: 'John',
    initials: 'JD',
    role: 'Head Cashier',
    roleKey: 'cashier',
    roleLabel: { th: 'แคชเชียร์', en: 'Cashier' },
    roleSummary: {
      th: 'คิดเงินหน้าร้าน สแกนบาร์โค้ด และจัดการข้อมูลสมาชิก',
      en: 'Frontline register, barcode checkout and loyalty lookup',
    },
    email: 'john.doe@prodx.io',
    employeeCode: 'EMP-108',
    defaultPin: '0000',
    avatarClass: 'from-emerald-300 to-teal-600',
    pillClass: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    selectedClass: 'border-emerald-400/50 bg-emerald-400/[0.07] shadow-[0_0_36px_-8px_rgba(52,211,153,0.45)]',
  },
  {
    id: 'sarah',
    userId: 'usr-manager-sarah',
    name: 'Sarah Connor',
    firstName: 'Sarah',
    initials: 'SC',
    role: 'Shift Manager',
    roleKey: 'manager',
    roleLabel: { th: 'ผู้จัดการกะ', en: 'Manager' },
    roleSummary: {
      th: 'อนุมัติยกเลิกบิล คืนเงิน ปรับราคา และสรุปยอดกะ',
      en: 'Voids, refunds, price overrides and cash drawer reconciliation',
    },
    email: 'sarah.connor@prodx.io',
    employeeCode: 'EMP-014',
    defaultPin: '5678',
    avatarClass: 'from-amber-300 to-orange-600',
    pillClass: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    selectedClass: 'border-amber-400/50 bg-amber-400/[0.07] shadow-[0_0_36px_-8px_rgba(251,191,36,0.45)]',
  },
  {
    id: 'alex',
    userId: 'usr-admin-alex',
    name: 'Alex Vance',
    firstName: 'Alex',
    initials: 'AV',
    role: 'Store Lead & Admin',
    roleKey: 'admin',
    roleLabel: { th: 'ผู้ดูแลระบบ', en: 'Admin' },
    roleSummary: {
      th: 'ควบคุมทั้งระบบ ภาษี สต็อก รายงาน และนโยบายความปลอดภัย',
      en: 'Full system access, tax rates, inventory and security policy',
    },
    email: 'alex.vance@prodx.io',
    employeeCode: 'EMP-001',
    defaultPin: '1234',
    avatarClass: 'from-violet-300 to-indigo-600',
    pillClass: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
    selectedClass: 'border-violet-400/50 bg-violet-400/[0.07] shadow-[0_0_36px_-8px_rgba(167,139,250,0.5)]',
  },
];
