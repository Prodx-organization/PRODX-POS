/**
 * PRODX POS - Development-only mock authentication.
 *
 * This adapter is loaded lazily only in local Vite development builds.
 * It is not a server-authoritative identity provider.
 */
import type { IAuthApi, LoginRequest } from './types';
import type { User, SessionContext, Store } from '../domain/auth';
import {
  ROLE_PERMISSIONS,
  getStoredStaffDirectory,
  getStoredRolePermissions,
  getStoredStaffPins,
  getStoredStaffPasswords,
  DEFAULT_STAFF_DIRECTORY,
} from '../domain/auth';

const SESSION_STORAGE_KEY = 'prodx.dev.auth.context';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const stores: Store[] = [
  {
    id: 'store-flagship-downtown', organizationId: 'org-prodx-retail',
    code: 'STR-01', name: 'Flagship Downtown',
    address: '742 Evergreen Blvd, Suite 100, Metro City',
    phone: '+66 2 123 4567', currency: 'THB', timezone: 'Asia/Bangkok',
    defaultTaxRateBps: 700,
  },
  {
    id: 'store-uptown-express', organizationId: 'org-prodx-retail',
    code: 'STR-02', name: 'Uptown Express',
    address: '1204 Grand Avenue, Metro City',
    phone: '+66 2 123 4568', currency: 'THB', timezone: 'Asia/Bangkok',
    defaultTaxRateBps: 700,
  },
];

type StoredDevSession = {
  token: string;
  organizationSlug: string;
  storeCode: string;
  registerId: string;
  expiresAt: string;
  organizationContext?: SessionContext['operationalScope'];
};

const readStoredSession = (): StoredDevSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredDevSession>;
    if (
      typeof value.token !== 'string' ||
      typeof value.organizationSlug !== 'string' ||
      typeof value.storeCode !== 'string' ||
      typeof value.registerId !== 'string' ||
      typeof value.expiresAt !== 'string'
    ) return null;
    return value as StoredDevSession;
  } catch {
    return null;
  }
};

const clearStoredSession = (token?: string): void => {
  if (typeof window === 'undefined') return;
  try {
    if (!token || readStoredSession()?.token === token) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
};

const getDirectory = (): User[] =>
  typeof window !== 'undefined' ? getStoredStaffDirectory() : DEFAULT_STAFF_DIRECTORY;

const getPermissions = () =>
  typeof window !== 'undefined' ? getStoredRolePermissions() : ROLE_PERMISSIONS;

export class DevelopmentMockAuthApi implements IAuthApi {
  async login(req: LoginRequest): Promise<SessionContext> {
    const identity = (req.emailOrPin ?? '').trim();
    const secret = (req.passwordOrPin ?? '').trim();
    if (!identity || req.organizationSlug !== 'prodx') {
      throw new Error('Invalid credentials or organization.');
    }

    const directory = getDirectory();
    const pins = typeof window !== 'undefined' ? getStoredStaffPins() : {};
    const passwords = typeof window !== 'undefined' ? getStoredStaffPasswords() : {};
    const normalized = identity.toLowerCase();

    const identityMatches = directory.filter((entry) =>
      entry.email.toLowerCase() === normalized ||
      entry.employeeCode.toLowerCase() === normalized ||
      entry.id === identity
    );
    const pinMatches = Object.entries(pins)
      .filter(([, pin]) => pin === identity)
      .map(([userId]) => directory.find((entry) => entry.id === userId))
      .filter((entry): entry is User => Boolean(entry));

    // PIN-only identity is supported only when it maps to exactly one configured staff member.
    const user = identityMatches.length === 1
      ? identityMatches[0]
      : identityMatches.length === 0 && pinMatches.length === 1
        ? pinMatches[0]
        : undefined;

    if (!user || user.isActive === false) throw new Error('Invalid credentials.');
    const identityIsPin = pinMatches.length === 1 && pinMatches[0].id === user.id && identityMatches.length === 0;
    const validSecret = identityIsPin
      ? (!secret || secret === pins[user.id])
      : Boolean(secret) && (secret === passwords[user.id] || secret === pins[user.id]);
    if (!validSecret) throw new Error('Invalid credentials.');
    if (req.requireAdminRole && user.role !== 'admin') {
      throw new Error('Administrator access required.');
    }

    const store = stores.find((candidate) => candidate.code === req.storeCode);
    if (!store || !req.registerId?.trim()) throw new Error('Invalid store or register scope.');

    const now = Date.now();
    const token = `dev-session-${user.id}-${now}`;
    const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();
    const currentUser: User = {
      ...user,
      permissions: getPermissions()[user.role] ?? user.permissions ?? ROLE_PERMISSIONS[user.role],
    };
    const organizationContext = req.organizationContext;

    const stored: StoredDevSession = {
      token,
      organizationSlug: req.organizationSlug,
      storeCode: req.storeCode,
      registerId: req.registerId,
      expiresAt,
      organizationContext,
    };
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
      } catch {
        throw new Error('Development session could not be stored in this browser.');
      }
    }

    return {
      organization: { id: 'org-prodx-retail', name: 'PRODX Retail Group', slug: 'prodx', stores },
      currentStore: store,
      registerId: req.registerId,
      currentUser,
      token,
      expiresAt,
      operationalScope: organizationContext,
    };
  }

  async logout(token: string): Promise<void> {
    if (!token) return;
    clearStoredSession(token);
  }

  async verifySession(token: string): Promise<SessionContext | null> {
    if (!token || !token.startsWith('dev-session-')) return null;
    const stored = readStoredSession();
    if (!stored || stored.token !== token || stored.organizationSlug !== 'prodx') return null;

    const expiry = Date.parse(stored.expiresAt);
    const tokenIssuedAt = Number(token.slice(token.lastIndexOf('-') + 1));
    if (
      !Number.isFinite(expiry) ||
      !Number.isFinite(tokenIssuedAt) ||
      tokenIssuedAt <= 0 ||
      Date.now() >= expiry ||
      expiry !== tokenIssuedAt + SESSION_TTL_MS
    ) {
      clearStoredSession(token);
      return null;
    }

    const userId = token.slice('dev-session-'.length, token.lastIndexOf('-'));
    const user = getDirectory().find((entry) => entry.id === userId);
    const currentStore = stores.find((store) => store.code === stored.storeCode);
    if (!user || user.isActive === false || !currentStore || !stored.registerId.trim()) {
      clearStoredSession(token);
      return null;
    }

    const currentUser: User = {
      ...user,
      permissions: getPermissions()[user.role] ?? user.permissions ?? ROLE_PERMISSIONS[user.role],
    };
    return {
      organization: { id: 'org-prodx-retail', name: 'PRODX Retail Group', slug: 'prodx', stores },
      currentStore,
      registerId: stored.registerId,
      currentUser,
      token,
      expiresAt: stored.expiresAt,
      operationalScope: stored.organizationContext,
    };
  }

  async getStores(orgSlug: string, token: string): Promise<readonly Store[]> {
    const session = await this.verifySession(token);
    return session && orgSlug === session.organization.slug ? stores : [];
  }

  async forgotPin(): Promise<void> {
    throw new Error('PIN reset is not available in the development mock.');
  }
}

export const developmentMockAuthApi: IAuthApi = new DevelopmentMockAuthApi();
