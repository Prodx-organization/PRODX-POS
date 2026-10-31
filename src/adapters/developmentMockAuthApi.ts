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
    const directory = typeof window !== 'undefined' ? getStoredStaffDirectory() : DEFAULT_STAFF_DIRECTORY;
    const staff = directory.find((entry) =>
      entry.email.toLowerCase() === normalized || entry.employeeCode.toLowerCase() === normalized
    );
    const user = staff;
    if (!user || req.organizationSlug !== 'prodx') throw new Error('Invalid credentials or organization.');
    const passwords = getStoredStaffPasswords();
    const pins = getStoredStaffPins();
    const supplied = req.passwordOrPin ?? '';
    if (passwords[user.id] !== supplied && pins[user.id] !== supplied) {
      throw new Error('Invalid credentials.');
    }
    if (req.requireAdminRole && user.role !== 'admin') throw new Error('Administrator access required.');
    const store = stores.find((candidate) => candidate.code === req.storeCode);
    if (!store) throw new Error('Invalid store scope.');
    const authenticatedUser: User = { ...user, permissions: getStoredRolePermissions(user.role, user.permissions) };
    const token = `dev-session-${user.id}-${Date.now()}`;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('prodx.dev.auth.context', JSON.stringify({ organizationSlug: req.organizationSlug, storeCode: req.storeCode, registerId: req.registerId, organizationContext: req.organizationContext }));
      } catch { /* Development storage is best-effort only. */ }
    }
    return {
      token,
      user: authenticatedUser,
      organization: { id: 'org-prodx-retail', name: 'PRODX Retail Group', slug: 'prodx', stores },
      currentStore: store,
      currentUser: authenticatedUser,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    };
  }

  async logout(_token: string): Promise<void> {}

  async verifySession(token: string): Promise<SessionContext | null> {
    if (!token.startsWith('dev-session-')) return null;
    const parts = token.split('-');
    const userId = parts.slice(2, -1).join('-');
    const directory = typeof window !== 'undefined' ? getStoredStaffDirectory() : DEFAULT_STAFF_DIRECTORY;
    const user = directory.find((entry) => entry.id === userId);
    if (!user) return null;
    const rolePermissions = typeof window !== 'undefined' ? getStoredRolePermissions() : ROLE_PERMISSIONS;
    let context: { storeCode?: string; registerId?: string; organizationContext?: SessionContext['operationalScope'] } = {};
    if (typeof window !== 'undefined') {
      try {
        context = JSON.parse(window.localStorage.getItem('prodx.dev.auth.context') ?? '{}');
      } catch { /* Use safe development defaults below. */ }
    }
    const currentStore = stores.find((store) => store.code === context.storeCode) ?? stores[0];
    const currentUser: User = {
      ...user,
      permissions: rolePermissions[user.role] ?? user.permissions ?? ROLE_PERMISSIONS[user.role],
    };
    return {
      organization: { id: 'org-prodx-retail', name: 'PRODX Retail Group', slug: 'prodx', stores },
      currentStore,
      registerId: context.registerId ?? 'REG-01',
      currentUser,
      token,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      operationalScope: context.organizationContext,
    };
  }

  async getStores(orgSlug: string, _token: string): Promise<readonly Store[]> {
    return orgSlug === 'prodx' ? stores : [];
  }

  async forgotPin(_organizationSlug: string, _storeCode: string, _emailOrPin: string, _registerId: string): Promise<void> {
    throw new Error('PIN reset is not available in the development mock.');
  }
}

export const developmentMockAuthApi: IAuthApi = new DevelopmentMockAuthApi();
