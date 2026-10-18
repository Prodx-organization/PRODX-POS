/**
 * PRODX POS Domain - Auth, Tenant & RBAC Module
 *
 * Authentication secrets are never seeded in client source. Production
 * authentication is authoritative in the backend; this module only stores
 * explicitly provisioned local state for offline/UX support.
 */

export type Role = 'admin' | 'manager' | 'cashier';

export type Permission =
  | 'pos:checkout' | 'pos:discount' | 'pos:price_override' | 'pos:void' | 'pos:refund'
  | 'shift:open' | 'shift:close' | 'shift:pay_movement'
  | 'inventory:read' | 'inventory:adjust'
  | 'customers:read' | 'customers:write'
  | 'reports:read' | 'audit:read' | 'settings:manage'
  | 'org:read' | 'org:manage' | 'branch:manage' | 'terminal:manage' | 'rbac:manage';

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly employeeCode: string;
  readonly avatarUrl?: string;
  readonly permissions: readonly Permission[];
  readonly isActive?: boolean;
  readonly lastRoleAssignedAt?: string;
  readonly assignedBy?: string;
  readonly assignedPermissionSetId?: string;
  readonly roleAssignmentNote?: string;
}

export interface Store {
  readonly id: string;
  readonly organizationId: string;
  readonly code: string;
  readonly name: string;
  readonly address: string;
  readonly phone: string;
  readonly currency: string;
  readonly timezone: string;
  readonly defaultTaxRateBps: number;
}

export interface Organization {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly stores: readonly Store[];
}

export interface OperationalScope {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly organizationSlug: string;
  readonly branchId: string;
  readonly branchName: string;
  readonly branchAddress: string;
  readonly terminalId: string;
  readonly terminalName: string;
  readonly terminalCode: string;
}

export interface SessionContext {
  readonly organization: Organization;
  readonly currentStore: Store;
  readonly registerId: string;
  readonly currentUser: User;
  readonly token: string;
  readonly expiresAt: string;
  readonly operationalScope?: OperationalScope;
}

export const OPERATIONAL_SCOPE_STORAGE_KEY = 'prodx.terminal.organization_context';

export function getStoredOperationalScope(): OperationalScope | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(OPERATIONAL_SCOPE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const candidate = (parsed.organizationContext ?? parsed) as Record<string, unknown>;
    if (
      typeof candidate?.organizationId === 'string' &&
      typeof candidate?.organizationSlug === 'string' &&
      typeof candidate?.branchId === 'string' &&
      typeof candidate?.branchName === 'string' &&
      typeof candidate?.terminalId === 'string' &&
      typeof candidate?.terminalCode === 'string'
    ) {
      return {
        organizationId: candidate.organizationId,
        organizationName:
          typeof candidate.organizationName === 'string'
            ? candidate.organizationName
            : candidate.organizationSlug,
        organizationSlug: candidate.organizationSlug,
        branchId: candidate.branchId,
        branchName: candidate.branchName,
        branchAddress: typeof candidate.branchAddress === 'string' ? candidate.branchAddress : '',
        terminalId: candidate.terminalId,
        terminalName:
          typeof candidate.terminalName === 'string'
            ? candidate.terminalName
            : candidate.terminalCode,
        terminalCode: candidate.terminalCode,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredOperationalScope(scope: OperationalScope | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!scope) {
      window.localStorage.removeItem(OPERATIONAL_SCOPE_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      OPERATIONAL_SCOPE_STORAGE_KEY,
      JSON.stringify({
        organizationSlug: scope.organizationSlug,
        storeCode: scope.branchName,
        registerId: scope.terminalCode,
        organizationContext: scope,
      }),
    );
    window.localStorage.setItem('prodx.terminal.organization', scope.organizationSlug);
    window.localStorage.setItem('prodx.terminal.store', scope.branchName);
    window.localStorage.setItem('prodx.terminal.register', scope.terminalCode);
  } catch {
    // Ignore localStorage quota/access errors
  }
}

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    'pos:checkout','pos:discount','pos:price_override','pos:void','pos:refund',
    'shift:open','shift:close','shift:pay_movement','inventory:read','inventory:adjust',
    'customers:read','customers:write','reports:read','audit:read','settings:manage',
    'org:read','org:manage','branch:manage','terminal:manage','rbac:manage',
  ],
  manager: [
    'pos:checkout','pos:discount','pos:price_override','pos:void','pos:refund',
    'shift:open','shift:close','shift:pay_movement','inventory:read','inventory:adjust',
    'customers:read','customers:write','reports:read','audit:read','settings:manage',
    'org:read',
  ],
  cashier: ['pos:checkout','pos:discount','shift:open','shift:close','inventory:read','customers:read','customers:write'],
};

export interface PermissionMeta {
  id: Permission;
  category: 'pos' | 'shift' | 'inventory' | 'customers' | 'reports' | 'settings';
  nameEn: string;
  nameTh: string;
  descEn: string;
  descTh: string;
  isSensitive: boolean;
}

const permissionMeta = (id: Permission, category: PermissionMeta['category'], nameEn: string, nameTh: string, isSensitive = false): PermissionMeta => ({
  id, category, nameEn, nameTh, descEn: nameEn, descTh: nameTh, isSensitive,
});

export const PERMISSION_DEFINITIONS: PermissionMeta[] = [
  permissionMeta('pos:checkout','pos','POS Cash Register Checkout','คิดเงินและออกใบเสร็จหน้าร้าน'),
  permissionMeta('pos:discount','pos','Apply Discounts & Promotions','ให้ส่วนลดและโปรโมชั่น'),
  permissionMeta('pos:price_override','pos','Price Override','ปรับแก้ราคาสินค้าหน้าร้าน',true),
  permissionMeta('pos:void','pos','Void Bill / Transaction','ยกเลิกบิล / ล้างรายการขาย',true),
  permissionMeta('pos:refund','pos','Issue Refunds & Returns','คืนเงินและรับคืนสินค้า',true),
  permissionMeta('shift:open','shift','Open Cash Shift','เปิดกะและบันทึกเงินทอนเริ่มต้น'),
  permissionMeta('shift:close','shift','Close Cash Shift','ปิดกะและกระทบยอด'),
  permissionMeta('shift:pay_movement','shift','Drawer Float & Safe Drop','นำเงินเข้า/ออกลิ้นชัก',true),
  permissionMeta('inventory:read','inventory','View Inventory & Catalog','ดูข้อมูลสินค้าและสต็อก'),
  permissionMeta('inventory:adjust','inventory','Adjust Stock & Inventory Ledger','ปรับยอดสต็อก',true),
  permissionMeta('customers:read','customers','View Customer Profiles & Points','ดูข้อมูลสมาชิก'),
  permissionMeta('customers:write','customers','Create & Edit Customers','เพิ่มและแก้ไขข้อมูลสมาชิก'),
  permissionMeta('reports:read','reports','View Sales & Profit Dashboard','ดูแดชบอร์ดยอดขายและกำไร',true),
  permissionMeta('audit:read','reports','View Security & Audit Trail','ดู Audit Trail',true),
  permissionMeta('settings:manage','settings','System & Financial Settings','จัดการตั้งค่าระบบ',true),
  permissionMeta('org:read','settings','View Organization Hierarchy','ดูข้อมูลโครงสร้างองค์กรและสาขา'),
  permissionMeta('org:manage','settings','Manage Enterprise Organizations','จัดการตั้งค่าระดับองค์กร (Admin Only)',true),
  permissionMeta('branch:manage','settings','Manage Store Branches','สร้าง แก้ไข และลบสาขาในองค์กร (Admin Only)',true),
  permissionMeta('terminal:manage','settings','Manage POS Register Terminals','ลงทะเบียนและตั้งค่าเครื่องขาย POS (Admin Only)',true),
  permissionMeta('rbac:manage','settings','Manage Enterprise RBAC & Security','จัดการตารางสิทธิ์ RBAC และนโยบายความปลอดภัยสูงสุด (Admin Only)',true),
];

export const DEFAULT_STAFF_DIRECTORY: User[] = [
  { id:'usr-admin-alex', name:'Alex Vance', email:'alex.vance@prodx.io', role:'admin', employeeCode:'EMP-001', permissions:ROLE_PERMISSIONS.admin, isActive:true, lastRoleAssignedAt:'2026-01-15T09:00:00.000Z', assignedBy:'System Root', roleAssignmentNote:'Store Owner & Primary Administrator' },
  { id:'usr-manager-sarah', name:'Sarah Connor', email:'sarah.connor@prodx.io', role:'manager', employeeCode:'EMP-014', permissions:ROLE_PERMISSIONS.manager, isActive:true, lastRoleAssignedAt:'2026-02-01T10:30:00.000Z', assignedBy:'Alex Vance', roleAssignmentNote:'Promoted to Shift Supervisor & Floor Manager' },
  { id:'usr-cashier-john', name:'John Doe', email:'john.doe@prodx.io', role:'cashier', employeeCode:'EMP-108', permissions:ROLE_PERMISSIONS.cashier, isActive:true, lastRoleAssignedAt:'2026-03-10T14:15:00.000Z', assignedBy:'Sarah Connor', roleAssignmentNote:'Frontline register cashier' },
  { id:'usr-cashier-emily', name:'Emily Stone', email:'emily.stone@prodx.io', role:'cashier', employeeCode:'EMP-109', permissions:ROLE_PERMISSIONS.cashier, isActive:true, lastRoleAssignedAt:'2026-04-05T08:45:00.000Z', assignedBy:'Sarah Connor', roleAssignmentNote:'Registered cashier profile' },
];

export const STAFF_STORAGE_KEY = 'prodx_pos_staff_directory';
export const ROLE_PERMS_STORAGE_KEY = 'prodx_pos_role_permissions';
let volatileStaffPins: Record<string, string> = {};
let volatileStaffPasswords: Record<string, string> = {};

export function getStoredStaffDirectory(): User[] {
  try { const raw = localStorage.getItem(STAFF_STORAGE_KEY); if (raw) return JSON.parse(raw); } catch (e) { console.error('Failed to parse staff directory from storage', e); }
  return DEFAULT_STAFF_DIRECTORY;
}

export function saveStoredStaffDirectory(users: User[]): void {
  try { localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(users)); } catch (e) { console.error('Failed to save staff directory to storage', e); }
}

export function getStoredRolePermissions(): Record<Role, Permission[]> {
  try { const raw = localStorage.getItem(ROLE_PERMS_STORAGE_KEY); if (raw) return JSON.parse(raw); } catch (e) { console.error('Failed to parse role permissions from storage', e); }
  return { admin:[...ROLE_PERMISSIONS.admin], manager:[...ROLE_PERMISSIONS.manager], cashier:[...ROLE_PERMISSIONS.cashier] };
}

export function saveStoredRolePermissions(matrix: Record<Role, Permission[]>): void {
  try { localStorage.setItem(ROLE_PERMS_STORAGE_KEY, JSON.stringify(matrix)); } catch (e) { console.error('Failed to save role permissions to storage', e); }
}

export function getStoredStaffPins(): Record<string, string> {
  return { ...volatileStaffPins };
}

export function saveStoredStaffPins(pins: Record<string, string>): void {
  volatileStaffPins = { ...pins };
}

export function getStoredStaffPasswords(): Record<string, string> {
  return { ...volatileStaffPasswords };
}

export function saveStoredStaffPasswords(passwords: Record<string, string>): void {
  volatileStaffPasswords = { ...passwords };
}

export function updateStaffPassword(userId: string, newPassword: string): void {
  volatileStaffPasswords = { ...volatileStaffPasswords, [userId]: newPassword };
}

export function hasPermission(user: User, permission: Permission): boolean { return user.permissions.includes(permission); }
