/**
 * PRODX POS - Development-only mock authentication.
 *
 * This module contains only the authentication test adapter. It must never be
 * imported by production application modules or production bundles.
 */
import type { IAuthApi, LoginRequest } from './types';
import {
  User,
  SessionContext,
  Store,
  ROLE_PERMISSIONS,
  getStoredStaffDirectory,
  getStoredRolePermissions,
  getStoredStaffPins,
  getStoredStaffPasswords,
  DEFAULT_STAFF_DIRECTORY,
} from '../domain/auth';
import { authApi as allMockApis } from './mockAdapter';

const stores: Store[] = [
  {
    id: 'store-flagship-downtown',
    organizationId: 'org-prodx-retail',
    code: 'STR-01',
    name: 'Flagship Downtown',
    address: '742 Evergreen Blvd, Suite 100, Metro City',
    phone: '+66 2 123 4567',
    currency: 'THB',
    timezone: 'Asia/Bangkok',
    defaultTaxRateBps: 700,
  },
  {
    id: 'store-uptown-express',
    organizationId: 'org-prodx-retail',
    code: 'STR-02',
    name: 'Uptown Express',
    address: '1204 Grand Avenue, Metro City',
    phone: '+66 2 123 4568',
    currency: 'THB',
    timezone: 'Asia/Bangkok',
    defaultTaxRateBps: 700,
  },
];

export class DevelopmentMockAuthApi implements IAuthApi {
  async login(req: LoginRequest): Promise<SessionContext> {
    const normalized = req.emailOrPin.trim().toLowerCase();
    const directory = getStoredStaffDirectory(DEFAULT_STAFF_DIRECTORY);
    const staff = directory.find((entry) =>
      entry.email.toLowerCase() === normalized || entry.employeeCode.toLowerCase() === normalized
    );
    const users: User[] = [
      { id: 'usr-admin-kamkokaew', name: 'Kamkokaew Thodsawat', email: 'kamkokaewthodsawat@gmail.com', role: 'admin', employeeCode: 'EMP-001', permissions: ROLE_PERMISSIONS.admin },
      { id: 'usr-manager-sarah', name: 'Sarah Connor', email: 'sarah.connor@prodx.io', role: 'manager', employeeCode: 'EMP-014', permissions: ROLE_PERMISSIONS.manager },
      { id: 'usr-cashier-john', name: 'John Doe', email: 'john.doe@prodx.io', role: 'cashier', employeeCode: 'EMP-108', permissions: ROLE_PERMISSIONS.cashier },
    ];
    const user = users.find((candidate) =>
      staff?.id === candidate.id || candidate.email.toLowerCase() === normalized || candidate.employeeCode.toLowerCase() === normalized
    );
    if (!user || req.organizationSlug !== 'prodx') throw new Error('Invalid credentials or organization.');
    const passwords = getStoredStaffPasswords();
    const pins = getStoredStaffPins();
    const supplied = req.passwordOrPin ?? '';
    if (passwords[user.id] !== supplied && pins[user.id] !== supplied && supplied !== '1234') {
      throw new Error('Invalid credentials.');
    }
    if (req.requireAdminRole && user.role !== 'admin') throw new Error('Administrator access required.');
    const store = stores.find((candidate) => candidate.code === req.storeCode);
    if (!store) throw new Error('Invalid store scope.');
    const authenticatedUser: User = { ...user, permissions: getStoredRolePermissions(user.role, user.permissions) };
    return {
      token: `dev-session-${user.id}-${Date.now()}`,
      user: authenticatedUser,
      organization: { id: 'org-prodx-retail', name: 'PRODX Retail Group', slug: 'prodx', stores },
      currentStore: store,
      currentUser: authenticatedUser,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    };
  }

  async logout(_token: string): Promise<void> {}

  async verifySession(_token: string): Promise<SessionContext | null> {
    return null;
  }

  async getStores(orgSlug: string, _token: string): Promise<readonly Store[]> {
    return orgSlug === 'prodx' ? stores : [];
  }

  async forgotPin(_organizationSlug: string, _storeCode: string, _emailOrPin: string, _registerId: string): Promise<void> {
    throw new Error('PIN reset is not available in the development mock.');
  }
}

export const developmentMockAuthApi: IAuthApi = new DevelopmentMockAuthApi();
