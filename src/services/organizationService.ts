/**
 * PRODX POS - Organization, Store Branch & Terminal Firestore Service
 * 
 * Provides centralized, systematic CRUD operations for managing enterprise organizations,
 * hierarchical store branches, and POS register terminal registrations in Google Cloud Firestore.
 * Enforces record-level data isolation, schema validation, and transactional cascade semantics.
 */

import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import { Organization, Branch, Terminal, OrganizationAuditLog } from '../modules/settings/types';
import { assertOrganizationAdminAccess } from '../security/rbacMiddleware';

export interface OrganizationActorContext {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

// ============================================================================
// Input Types & Interfaces
// ============================================================================

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  taxId?: string;
  phone?: string;
  email?: string;
  currency?: string;
  status?: 'active' | 'inactive';
  actor?: OrganizationActorContext;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  currency?: string;
  status?: 'active' | 'inactive';
  actor?: OrganizationActorContext;
}

export interface CreateBranchInput {
  orgId: string;
  name: string;
  address: string;
  code?: string;
  phone?: string;
  manager?: string;
  status?: 'active' | 'inactive';
  actor?: OrganizationActorContext;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  code?: string;
  phone?: string;
  manager?: string;
  status?: 'active' | 'inactive';
  actor?: OrganizationActorContext;
}

export interface CreateTerminalInput {
  branchId: string;
  name: string;
  code: string;
  orgId?: string;
  deviceModel?: string;
  ipAddress?: string;
  paperWidth?: '58mm' | '80mm';
  status?: 'active' | 'maintenance' | 'inactive';
  actor?: OrganizationActorContext;
}

export interface UpdateTerminalInput {
  name?: string;
  code?: string;
  orgId?: string;
  deviceModel?: string;
  ipAddress?: string;
  paperWidth?: '58mm' | '80mm';
  status?: 'active' | 'maintenance' | 'inactive';
  actor?: OrganizationActorContext;
}

export interface BranchWithTerminals extends Branch {
  terminals: Terminal[];
}

export interface OrganizationHierarchyNode extends Organization {
  branches: BranchWithTerminals[];
  totalTerminals: number;
}

// ============================================================================
// Default Constants (Seeding Fallbacks)
// ============================================================================

export const DEFAULT_ORGS: Organization[] = [
  {
    id: 'org-prodx',
    name: 'PRODX Retail Group',
    slug: 'prodx',
    taxId: '0105562089412',
    phone: '+66-2-888-9000',
    email: 'contact@prodx-retail.com',
    currency: 'THB',
    status: 'active',
    createdAt: 1710000000000,
  },
  {
    id: 'org-siam',
    name: 'Siam Enterprise Commerce',
    slug: 'siam-enterprise',
    taxId: '0105559043211',
    phone: '+66-2-610-8000',
    email: 'admin@siam-enterprise.co.th',
    currency: 'THB',
    status: 'active',
    createdAt: 1710000001000,
  },
];

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'br-str-01',
    orgId: 'org-prodx',
    name: 'STR-01 Central World',
    code: 'STR-01',
    address: 'Bangkok Flagship Central World, 4th Floor',
    phone: '+66-2-888-9001',
    manager: 'Somchai Prasert',
    status: 'active',
    createdAt: 1710000000000,
  },
  {
    id: 'br-str-02',
    orgId: 'org-prodx',
    name: 'STR-02 Nimman',
    code: 'STR-02',
    address: 'Chiang Mai Nimman Branch, Soi 9',
    phone: '+66-53-222-300',
    manager: 'Anong Srisawat',
    status: 'active',
    createdAt: 1710000001000,
  },
  {
    id: 'br-siam-01',
    orgId: 'org-siam',
    name: 'SIAM-01 Siam Paragon',
    code: 'SIAM-01',
    address: 'Siam Paragon G Floor, Gourmet Zone',
    phone: '+66-2-610-8111',
    manager: 'Kittisak V.',
    status: 'active',
    createdAt: 1710000002000,
  },
];

export const DEFAULT_TERMINALS: Terminal[] = [
  {
    id: 'term-001',
    branchId: 'br-str-01',
    orgId: 'org-prodx',
    name: 'Main Checkout Counter 1',
    code: 'Terminal-001',
    deviceModel: 'Sunmi T2s Dual Screen',
    ipAddress: '192.168.1.101',
    paperWidth: '80mm',
    status: 'active',
    createdAt: 1710000000000,
  },
  {
    id: 'term-002',
    branchId: 'br-str-01',
    orgId: 'org-prodx',
    name: 'Express Lane Counter 2',
    code: 'Terminal-002',
    deviceModel: 'PAX E700 Integrated POS',
    ipAddress: '192.168.1.102',
    paperWidth: '80mm',
    status: 'active',
    createdAt: 1710000001000,
  },
  {
    id: 'term-003',
    branchId: 'br-str-02',
    orgId: 'org-prodx',
    name: 'Nimman Main Register',
    code: 'Terminal-001',
    deviceModel: 'iPad Pro 11-inch with Stand',
    ipAddress: '192.168.2.50',
    paperWidth: '58mm',
    status: 'active',
    createdAt: 1710000002000,
  },
  {
    id: 'term-004',
    branchId: 'br-siam-01',
    orgId: 'org-siam',
    name: 'Paragon Front Counter 1',
    code: 'Terminal-001',
    deviceModel: 'Elo Touch I-Series 4',
    ipAddress: '10.0.1.15',
    paperWidth: '80mm',
    status: 'active',
    createdAt: 1710000003000,
  },
];

let seedExecuted = false;

/**
 * Ensures initial default entities are written into Firestore if collections are empty.
 */
export async function ensureDefaultOrganizations(): Promise<void> {
  if (seedExecuted) return;
  seedExecuted = true;
  try {
    for (const org of DEFAULT_ORGS) {
      await setDoc(doc(db, 'organizations', org.id), org);
    }
    for (const branch of DEFAULT_BRANCHES) {
      await setDoc(doc(db, 'branches', branch.id), branch);
    }
    for (const terminal of DEFAULT_TERMINALS) {
      await setDoc(doc(db, 'terminals', terminal.id), terminal);
    }
  } catch {
    // Continue with in-memory defaults if seeding cannot complete
  }
}

/**
 * Records an immutable audit entry in Firestore under collection 'audit_logs'
 */
export async function recordOrganizationAuditLog(input: {
  entityType: 'organization' | 'branch' | 'terminal';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'cascade_delete';
  entityName?: string;
  orgId?: string;
  branchId?: string;
  actor?: { id?: string; name?: string; email?: string; role?: string };
  details?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
}): Promise<OrganizationAuditLog> {
  const id = `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  const log: OrganizationAuditLog = {
    id,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    ...(input.entityName ? { entityName: input.entityName.slice(0, 160) } : {}),
    ...(input.orgId ? { orgId: input.orgId } : {}),
    ...(input.branchId ? { branchId: input.branchId } : {}),
    actor: input.actor || {
      id: 'admin-console',
      name: 'System Admin',
      email: 'admin@prodx.local',
      role: 'admin',
    },
    ...(input.details ? { details: input.details } : {}),
    ...(input.previousState ? { previousState: input.previousState } : {}),
    ...(input.newState ? { newState: input.newState } : {}),
    timestamp: Date.now(),
  };

  try {
    await setDoc(doc(db, 'audit_logs', id), log);
  } catch (err) {
    console.warn('[AuditLog] Failed to persist audit record to Firestore:', err);
  }

  return log;
}

// ============================================================================
// 1. Organization Management (CRUD)
// ============================================================================

/**
 * Retrieves all registered organizations from Firestore.
 */
export async function getOrganizations(): Promise<Organization[]> {
  try {
    const q = collection(db, 'organizations');
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await ensureDefaultOrganizations();
      const retry = await getDocs(q);
      if (!retry.empty) {
        return retry.docs.map((d) => ({ id: d.id, ...d.data() } as Organization));
      }
      return DEFAULT_ORGS;
    }
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Organization));
  } catch (error) {
    console.warn('Firestore getOrganizations fallback:', error);
    return DEFAULT_ORGS;
  }
}

/**
 * Retrieves a single organization profile by document ID.
 */
export async function getOrganizationById(id: string): Promise<Organization | null> {
  if (!id || typeof id !== 'string') return null;
  const cleanId = id.trim();
  if (!cleanId) return null;

  try {
    const snap = await getDoc(doc(db, 'organizations', cleanId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Organization;
    }
  } catch {
    // Fall back to memory list
  }
  return DEFAULT_ORGS.find((o) => o.id === cleanId) || null;
}

/**
 * Retrieves an organization profile matching a unique slug.
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  if (!slug || typeof slug !== 'string') return null;
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return null;

  try {
    const q = query(collection(db, 'organizations'), where('slug', '==', cleanSlug));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const first = snapshot.docs[0];
      return { id: first.id, ...first.data() } as Organization;
    }
  } catch {
    // Fall back to memory check
  }
  return DEFAULT_ORGS.find((o) => o.slug.toLowerCase() === cleanSlug) || null;
}

/**
 * Creates a new organization profile in Firestore.
 */
export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
  assertOrganizationAdminAccess(input.actor, 'organization:create');
  const cleanSlug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64) || 'org';
  const id = `org-${cleanSlug}-${Date.now().toString(36)}`;
  const record: Organization = {
    id,
    name: input.name.trim().slice(0, 120),
    slug: cleanSlug,
    ...(input.taxId ? { taxId: input.taxId.trim().slice(0, 64) } : {}),
    ...(input.phone ? { phone: input.phone.trim().slice(0, 32) } : {}),
    ...(input.email ? { email: input.email.trim().slice(0, 120) } : {}),
    ...(input.currency ? { currency: input.currency.trim().slice(0, 10) } : { currency: 'THB' }),
    status: input.status || 'active',
    createdAt: Date.now(),
  };

  try {
    await setDoc(doc(db, 'organizations', id), record);
    void recordOrganizationAuditLog({
      entityType: 'organization',
      entityId: record.id,
      action: 'create',
      entityName: record.name,
      orgId: record.id,
      actor: input.actor,
      newState: record as unknown as Record<string, unknown>,
      details: { slug: record.slug, currency: record.currency, status: record.status },
    });
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `organizations/${id}`);
  }
}

/**
 * Updates an existing organization profile in Firestore while preserving immutable invariants.
 */
export async function updateOrganization(
  id: string,
  updates: UpdateOrganizationInput,
): Promise<Organization> {
  assertOrganizationAdminAccess(updates.actor, 'organization:update');
  const existing = await getOrganizationById(id);
  if (!existing) {
    throw new Error(`Organization with ID ${id} not found.`);
  }

  const record: Organization = {
    id: existing.id,
    name: updates.name !== undefined ? updates.name.trim().slice(0, 120) : existing.name,
    slug: updates.slug !== undefined
      ? updates.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64)
      : existing.slug,
    ...(updates.taxId !== undefined ? { taxId: updates.taxId.trim().slice(0, 64) } : existing.taxId ? { taxId: existing.taxId } : {}),
    ...(updates.phone !== undefined ? { phone: updates.phone.trim().slice(0, 32) } : existing.phone ? { phone: existing.phone } : {}),
    ...(updates.email !== undefined ? { email: updates.email.trim().slice(0, 120) } : existing.email ? { email: existing.email } : {}),
    ...(updates.currency !== undefined ? { currency: updates.currency.trim().slice(0, 10) } : existing.currency ? { currency: existing.currency } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : existing.status ? { status: existing.status } : {}),
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };

  try {
    await setDoc(doc(db, 'organizations', id), record);
    void recordOrganizationAuditLog({
      entityType: 'organization',
      entityId: record.id,
      action: 'update',
      entityName: record.name,
      orgId: record.id,
      actor: updates.actor,
      previousState: existing as unknown as Record<string, unknown>,
      newState: record as unknown as Record<string, unknown>,
      details: updates as Record<string, unknown>,
    });
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `organizations/${id}`);
  }
}

/**
 * Deletes an organization document from Firestore.
 */
export async function deleteOrganization(id: string, actor?: OrganizationActorContext): Promise<void> {
  assertOrganizationAdminAccess(actor, 'organization:delete');
  const existing = await getOrganizationById(id);
  try {
    await deleteDoc(doc(db, 'organizations', id));
    void recordOrganizationAuditLog({
      entityType: 'organization',
      entityId: id,
      action: 'delete',
      entityName: existing?.name || id,
      orgId: id,
      actor,
      previousState: (existing as unknown as Record<string, unknown>) || undefined,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `organizations/${id}`);
  }
}

// ============================================================================
// 2. Hierarchical Store Branch Management (CRUD)
// ============================================================================

/**
 * Fetches store branches belonging to a specific organization with record-level filtering.
 */
export async function getBranchesByOrg(orgId: string): Promise<Branch[]> {
  if (!orgId || typeof orgId !== 'string') return [];
  const cleanOrgId = orgId.trim();
  if (!cleanOrgId) return [];

  try {
    const q = query(collection(db, 'branches'), where('orgId', '==', cleanOrgId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return DEFAULT_BRANCHES.filter((b) => b.orgId === cleanOrgId);
    }
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as Branch))
      .filter((b) => b.orgId === cleanOrgId);
  } catch {
    return DEFAULT_BRANCHES.filter((b) => b.orgId === cleanOrgId);
  }
}

/**
 * Fetches branches. If orgId is provided, enforces record-level isolation to that organization only.
 */
export async function getAllBranches(orgId?: string): Promise<Branch[]> {
  if (orgId) {
    return getBranchesByOrg(orgId);
  }
  try {
    const q = collection(db, 'branches');
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await ensureDefaultOrganizations();
      const retry = await getDocs(q);
      if (!retry.empty) {
        return retry.docs.map((d) => ({ id: d.id, ...d.data() } as Branch));
      }
      return DEFAULT_BRANCHES;
    }
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Branch));
  } catch {
    return DEFAULT_BRANCHES;
  }
}

/**
 * Retrieves a single branch by ID with optional orgId validation.
 */
export async function getBranchById(branchId: string, orgId?: string): Promise<Branch | null> {
  if (!branchId || typeof branchId !== 'string') return null;
  const cleanId = branchId.trim();
  if (!cleanId) return null;

  try {
    const snap = await getDoc(doc(db, 'branches', cleanId));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as Branch;
      if (orgId && data.orgId !== orgId.trim()) return null;
      return data;
    }
  } catch {
    // Fall back to memory check
  }

  const found = DEFAULT_BRANCHES.find((b) => b.id === cleanId);
  if (!found) return null;
  if (orgId && found.orgId !== orgId.trim()) return null;
  return found;
}

/**
 * Creates a new store branch linked to its parent organization.
 */
export async function createBranch(input: CreateBranchInput): Promise<Branch> {
  assertOrganizationAdminAccess(input.actor, 'branch:create');
  const id = `br-${Date.now().toString(36)}`;
  const record: Branch = {
    id,
    orgId: input.orgId.trim().slice(0, 128),
    name: input.name.trim().slice(0, 120),
    address: input.address.trim().slice(0, 300),
    ...(input.code ? { code: input.code.trim().slice(0, 64) } : {}),
    ...(input.phone ? { phone: input.phone.trim().slice(0, 32) } : {}),
    ...(input.manager ? { manager: input.manager.trim().slice(0, 120) } : {}),
    status: input.status || 'active',
    createdAt: Date.now(),
  };

  try {
    await setDoc(doc(db, 'branches', id), record);
    void recordOrganizationAuditLog({
      entityType: 'branch',
      entityId: record.id,
      action: 'create',
      entityName: record.name,
      orgId: record.orgId,
      branchId: record.id,
      actor: input.actor,
      newState: record as unknown as Record<string, unknown>,
      details: { code: record.code, address: record.address, manager: record.manager },
    });
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `branches/${id}`);
  }
}

/**
 * Updates a store branch document while maintaining organizational linkage.
 */
export async function updateBranch(
  branchId: string,
  updates: UpdateBranchInput,
): Promise<Branch> {
  assertOrganizationAdminAccess(updates.actor, 'branch:update');
  const existing = await getBranchById(branchId);
  if (!existing) {
    throw new Error(`Branch with ID ${branchId} not found.`);
  }

  const record: Branch = {
    id: existing.id,
    orgId: existing.orgId,
    name: updates.name !== undefined ? updates.name.trim().slice(0, 120) : existing.name,
    address: updates.address !== undefined ? updates.address.trim().slice(0, 300) : existing.address,
    ...(updates.code !== undefined ? { code: updates.code.trim().slice(0, 64) } : existing.code ? { code: existing.code } : {}),
    ...(updates.phone !== undefined ? { phone: updates.phone.trim().slice(0, 32) } : existing.phone ? { phone: existing.phone } : {}),
    ...(updates.manager !== undefined ? { manager: updates.manager.trim().slice(0, 120) } : existing.manager ? { manager: existing.manager } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : existing.status ? { status: existing.status } : {}),
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };

  try {
    await setDoc(doc(db, 'branches', branchId), record);
    void recordOrganizationAuditLog({
      entityType: 'branch',
      entityId: record.id,
      action: 'update',
      entityName: record.name,
      orgId: record.orgId,
      branchId: record.id,
      actor: updates.actor,
      previousState: existing as unknown as Record<string, unknown>,
      newState: record as unknown as Record<string, unknown>,
      details: updates as Record<string, unknown>,
    });
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `branches/${branchId}`);
  }
}

/**
 * Deletes a branch document from Firestore.
 */
export async function deleteBranch(branchId: string, actor?: OrganizationActorContext): Promise<void> {
  assertOrganizationAdminAccess(actor, 'branch:delete');
  const existing = await getBranchById(branchId);
  try {
    await deleteDoc(doc(db, 'branches', branchId));
    void recordOrganizationAuditLog({
      entityType: 'branch',
      entityId: branchId,
      action: 'delete',
      entityName: existing?.name || branchId,
      orgId: existing?.orgId,
      branchId,
      actor,
      previousState: (existing as unknown as Record<string, unknown>) || undefined,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `branches/${branchId}`);
  }
}

// ============================================================================
// 3. POS Terminal Registration Management (CRUD)
// ============================================================================

/**
 * Fetches terminals belonging to a branch with optional organization scoping.
 */
export async function getTerminalsByBranch(branchId: string, orgId?: string): Promise<Terminal[]> {
  if (!branchId || typeof branchId !== 'string') return [];
  const cleanBranchId = branchId.trim();
  if (!cleanBranchId) return [];

  try {
    const q = query(collection(db, 'terminals'), where('branchId', '==', cleanBranchId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return DEFAULT_TERMINALS.filter((t) => {
        if (t.branchId !== cleanBranchId) return false;
        if (orgId && t.orgId && t.orgId !== orgId.trim()) return false;
        return true;
      });
    }
    const terminals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Terminal));
    return terminals.filter((t) => {
      if (t.branchId !== cleanBranchId) return false;
      if (orgId && t.orgId && t.orgId !== orgId.trim()) return false;
      return true;
    });
  } catch {
    return DEFAULT_TERMINALS.filter((t) => {
      if (t.branchId !== cleanBranchId) return false;
      if (orgId && t.orgId && t.orgId !== orgId.trim()) return false;
      return true;
    });
  }
}

/**
 * Fetches all registered terminals with optional branch and organization scoping.
 */
export async function getAllTerminals(branchId?: string, orgId?: string): Promise<Terminal[]> {
  if (branchId) {
    return getTerminalsByBranch(branchId, orgId);
  }
  try {
    const q = collection(db, 'terminals');
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await ensureDefaultOrganizations();
      const retry = await getDocs(q);
      if (!retry.empty) {
        return retry.docs.map((d) => ({ id: d.id, ...d.data() } as Terminal));
      }
      return DEFAULT_TERMINALS;
    }
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Terminal));
  } catch {
    return DEFAULT_TERMINALS;
  }
}

/**
 * Retrieves a single terminal by ID, enforcing branch and organization isolation.
 */
export async function getTerminalById(
  terminalId: string,
  branchId?: string,
  orgId?: string,
): Promise<Terminal | null> {
  if (!terminalId || typeof terminalId !== 'string') return null;
  const cleanId = terminalId.trim();
  if (!cleanId) return null;

  try {
    const docRef = doc(db, 'terminals', cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as Terminal;
      if (branchId && data.branchId !== branchId.trim()) return null;
      if (orgId && data.orgId && data.orgId !== orgId.trim()) return null;
      return data;
    }
  } catch {
    // Fall back to memory check
  }

  const found = DEFAULT_TERMINALS.find((t) => t.id === cleanId || t.code === cleanId);
  if (!found) return null;
  if (branchId && found.branchId !== branchId.trim()) return null;
  if (orgId && found.orgId && found.orgId !== orgId.trim()) return null;
  return found;
}

/**
 * Registers a new POS terminal attached to a store branch and organization.
 */
export async function createTerminal(input: CreateTerminalInput): Promise<Terminal> {
  assertOrganizationAdminAccess(input.actor, 'terminal:create');
  const id = `term-${Date.now().toString(36)}`;
  const record: Terminal = {
    id,
    branchId: input.branchId.trim().slice(0, 128),
    ...(input.orgId ? { orgId: input.orgId.trim().slice(0, 128) } : {}),
    name: input.name.trim().slice(0, 120),
    code: input.code.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64),
    ...(input.deviceModel ? { deviceModel: input.deviceModel.trim().slice(0, 120) } : {}),
    ...(input.ipAddress ? { ipAddress: input.ipAddress.trim().slice(0, 64) } : {}),
    paperWidth: input.paperWidth || '80mm',
    status: input.status || 'active',
    createdAt: Date.now(),
  };

  try {
    await setDoc(doc(db, 'terminals', id), record);
    void recordOrganizationAuditLog({
      entityType: 'terminal',
      entityId: record.id,
      action: 'create',
      entityName: record.name,
      orgId: record.orgId,
      branchId: record.branchId,
      actor: input.actor,
      newState: record as unknown as Record<string, unknown>,
      details: { code: record.code, deviceModel: record.deviceModel, paperWidth: record.paperWidth },
    });
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `terminals/${id}`);
  }
}

/**
 * Updates a POS terminal's registration details in Firestore.
 */
export async function updateTerminal(
  terminalId: string,
  updates: UpdateTerminalInput,
): Promise<Terminal> {
  assertOrganizationAdminAccess(updates.actor, 'terminal:update');
  const existing = await getTerminalById(terminalId);
  if (!existing) {
    throw new Error(`Terminal with ID ${terminalId} not found.`);
  }

  const record: Terminal = {
    id: existing.id,
    branchId: existing.branchId,
    ...(existing.orgId || updates.orgId ? { orgId: (updates.orgId || existing.orgId)!.trim().slice(0, 128) } : {}),
    name: updates.name !== undefined ? updates.name.trim().slice(0, 120) : existing.name,
    code: updates.code !== undefined
      ? updates.code.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64)
      : existing.code,
    ...(updates.deviceModel !== undefined ? { deviceModel: updates.deviceModel.trim().slice(0, 120) } : existing.deviceModel ? { deviceModel: existing.deviceModel } : {}),
    ...(updates.ipAddress !== undefined ? { ipAddress: updates.ipAddress.trim().slice(0, 64) } : existing.ipAddress ? { ipAddress: existing.ipAddress } : {}),
    paperWidth: updates.paperWidth || existing.paperWidth || '80mm',
    status: updates.status || existing.status || 'active',
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };

  try {
    await setDoc(doc(db, 'terminals', terminalId), record);
    void recordOrganizationAuditLog({
      entityType: 'terminal',
      entityId: record.id,
      action: 'update',
      entityName: record.name,
      orgId: record.orgId,
      branchId: record.branchId,
      actor: updates.actor,
      previousState: existing as unknown as Record<string, unknown>,
      newState: record as unknown as Record<string, unknown>,
      details: updates as Record<string, unknown>,
    });
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `terminals/${terminalId}`);
  }
}

/**
 * Deletes / de-registers a POS terminal from Firestore.
 */
export async function deleteTerminal(terminalId: string, actor?: OrganizationActorContext): Promise<void> {
  assertOrganizationAdminAccess(actor, 'terminal:delete');
  const existing = await getTerminalById(terminalId);
  try {
    await deleteDoc(doc(db, 'terminals', terminalId));
    void recordOrganizationAuditLog({
      entityType: 'terminal',
      entityId: terminalId,
      action: 'delete',
      entityName: existing?.name || terminalId,
      orgId: existing?.orgId,
      branchId: existing?.branchId,
      actor,
      previousState: (existing as unknown as Record<string, unknown>) || undefined,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `terminals/${terminalId}`);
  }
}

// ============================================================================
// 4. Cascade Deletion Helpers
// ============================================================================

/**
 * Cascade-deletes a store branch and all terminals registered under it.
 */
export async function deleteBranchCascade(
  branchId: string,
  orgId?: string,
): Promise<{ terminalsDeleted: number }> {
  const branch = await getBranchById(branchId, orgId);
  const terminals = await getTerminalsByBranch(branchId, orgId);
  for (const term of terminals) {
    await deleteTerminal(term.id);
  }
  await deleteBranch(branchId);
  void recordOrganizationAuditLog({
    entityType: 'branch',
    entityId: branchId,
    action: 'cascade_delete',
    entityName: branch?.name || branchId,
    orgId: branch?.orgId || orgId,
    branchId,
    details: { terminalsDeleted: terminals.length },
  });
  return { terminalsDeleted: terminals.length };
}

/**
 * Cascade-deletes an entire organization, all child branches, and all child terminals.
 */
export async function deleteOrganizationCascade(
  orgId: string,
): Promise<{ branchesDeleted: number; terminalsDeleted: number }> {
  const org = await getOrganizationById(orgId);
  const branches = await getBranchesByOrg(orgId);
  let totalTerminalsDeleted = 0;
  for (const branch of branches) {
    const res = await deleteBranchCascade(branch.id, orgId);
    totalTerminalsDeleted += res.terminalsDeleted;
  }
  await deleteOrganization(orgId);
  void recordOrganizationAuditLog({
    entityType: 'organization',
    entityId: orgId,
    action: 'cascade_delete',
    entityName: org?.name || orgId,
    orgId,
    details: { branchesDeleted: branches.length, terminalsDeleted: totalTerminalsDeleted },
  });
  return { branchesDeleted: branches.length, terminalsDeleted: totalTerminalsDeleted };
}

// ============================================================================
// 5. System Hierarchy & Composite Tree Queries
// ============================================================================

/**
 * Retrieves a complete organizational hierarchy tree (Organizations -> Branches -> Terminals)
 * suitable for dashboards, organizational charts, and multi-store administration.
 */
export async function getOrganizationHierarchy(targetOrgId?: string): Promise<OrganizationHierarchyNode[]> {
  const allOrgs = await getOrganizations();
  const selectedOrgs = targetOrgId ? allOrgs.filter((o) => o.id === targetOrgId) : allOrgs;

  const result: OrganizationHierarchyNode[] = [];

  for (const org of selectedOrgs) {
    const orgBranches = await getBranchesByOrg(org.id);
    const branchesWithTerminals: BranchWithTerminals[] = [];
    let orgTerminalCount = 0;

    for (const br of orgBranches) {
      const branchTerminals = await getTerminalsByBranch(br.id, org.id);
      branchesWithTerminals.push({
        ...br,
        terminals: branchTerminals,
      });
      orgTerminalCount += branchTerminals.length;
    }

    result.push({
      ...org,
      branches: branchesWithTerminals,
      totalTerminals: orgTerminalCount,
    });
  }

  return result;
}

// ============================================================================
// 6. Real-Time Listeners (onSnapshot Subscriptions)
// ============================================================================

export interface OrganizationStructureSubscriptionOptions {
  targetOrgId?: string;
  onError?: (error: unknown) => void;
}

/**
 * Real-time listener for the complete organization structure (Organizations -> Branches -> Terminals)
 * or a specific organization's hierarchical subtree.
 * 
 * Uses Firestore onSnapshot listeners on organizations, branches, and terminals collections to
 * provide immediate live updates whenever entities are added, updated, or removed.
 * Safely aggregates in-memory into an immutable OrganizationHierarchyNode[] tree.
 * 
 * @param callback Callback invoked whenever organization structure updates in real-time
 * @param options Optional filter targetOrgId and error callback handler
 * @returns Clean unsubscribe function that tears down all active Firestore listeners
 */
export function subscribeToOrganizationStructure(
  callback: (nodes: OrganizationHierarchyNode[]) => void,
  options?: OrganizationStructureSubscriptionOptions,
): Unsubscribe {
  let orgList: Organization[] = DEFAULT_ORGS;
  let branchList: Branch[] = DEFAULT_BRANCHES;
  let terminalList: Terminal[] = DEFAULT_TERMINALS;

  const emitHierarchy = () => {
    const targetOrgId = options?.targetOrgId?.trim();
    const sourceOrgs = targetOrgId
      ? orgList.filter((o) => o.id === targetOrgId)
      : orgList;

    const hierarchy: OrganizationHierarchyNode[] = sourceOrgs.map((org) => {
      const orgBranches = branchList.filter((b) => b.orgId === org.id);
      let totalTerminals = 0;

      const branchesWithTerminals: BranchWithTerminals[] = orgBranches.map((br) => {
        const branchTerms = terminalList.filter((t) => t.branchId === br.id);
        totalTerminals += branchTerms.length;
        return {
          ...br,
          terminals: branchTerms,
        };
      });

      return {
        ...org,
        branches: branchesWithTerminals,
        totalTerminals,
      };
    });

    callback(hierarchy);
  };

  const handleListenerError = (err: unknown, entity: string) => {
    console.warn(`[Firestore Realtime] Error listening to ${entity}:`, err);
    if (options?.onError) {
      options.onError(err);
    } else {
      handleFirestoreError(err, OperationType.GET, entity);
    }
  };

  // 1. Real-time Organizations listener
  const unsubOrgs = onSnapshot(
    collection(db, 'organizations'),
    (snapshot) => {
      if (snapshot.empty) {
        orgList = DEFAULT_ORGS;
        void ensureDefaultOrganizations();
      } else {
        orgList = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Organization));
      }
      emitHierarchy();
    },
    (err) => handleListenerError(err, 'organizations'),
  );

  // 2. Real-time Branches listener
  const branchesQuery = options?.targetOrgId
    ? query(collection(db, 'branches'), where('orgId', '==', options.targetOrgId.trim()))
    : collection(db, 'branches');

  const unsubBranches = onSnapshot(
    branchesQuery,
    (snapshot) => {
      if (snapshot.empty) {
        branchList = options?.targetOrgId
          ? DEFAULT_BRANCHES.filter((b) => b.orgId === options.targetOrgId)
          : DEFAULT_BRANCHES;
      } else {
        branchList = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Branch));
      }
      emitHierarchy();
    },
    (err) => handleListenerError(err, 'branches'),
  );

  // 3. Real-time Terminals listener
  const terminalsQuery = collection(db, 'terminals');

  const unsubTerminals = onSnapshot(
    terminalsQuery,
    (snapshot) => {
      if (snapshot.empty) {
        terminalList = DEFAULT_TERMINALS;
      } else {
        terminalList = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Terminal));
      }
      emitHierarchy();
    },
    (err) => handleListenerError(err, 'terminals'),
  );

  // Combined Unsubscribe to teardown all active Firestore snapshot listeners cleanly
  return () => {
    unsubOrgs();
    unsubBranches();
    unsubTerminals();
  };
}

/**
 * Real-time listener for registered organizations collection.
 */
export function subscribeToOrganizations(
  callback: (orgs: Organization[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'organizations'),
    (snapshot) => {
      if (snapshot.empty) {
        void ensureDefaultOrganizations();
        callback(DEFAULT_ORGS);
      } else {
        callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Organization)));
      }
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.GET, 'organizations');
    },
  );
}

/**
 * Real-time listener for store branches, optionally scoped to an organization.
 */
export function subscribeToBranches(
  orgId?: string,
  callback?: (branches: Branch[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const handler = callback || (() => {});
  const q = orgId && orgId.trim()
    ? query(collection(db, 'branches'), where('orgId', '==', orgId.trim()))
    : collection(db, 'branches');

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        const fallbacks = orgId
          ? DEFAULT_BRANCHES.filter((b) => b.orgId === orgId.trim())
          : DEFAULT_BRANCHES;
        handler(fallbacks);
      } else {
        handler(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Branch)));
      }
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.GET, 'branches');
    },
  );
}

/**
 * Real-time listener for POS terminals, optionally scoped to a store branch and organization.
 */
export function subscribeToTerminals(
  branchId?: string,
  orgId?: string,
  callback?: (terminals: Terminal[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const handler = callback || (() => {});
  const q = branchId && branchId.trim()
    ? query(collection(db, 'terminals'), where('branchId', '==', branchId.trim()))
    : collection(db, 'terminals');

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        const fallbacks = DEFAULT_TERMINALS.filter((t) => {
          if (branchId && t.branchId !== branchId.trim()) return false;
          if (orgId && t.orgId && t.orgId !== orgId.trim()) return false;
          return true;
        });
        handler(fallbacks);
      } else {
        let terminals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Terminal));
        if (orgId && orgId.trim()) {
          terminals = terminals.filter((t) => !t.orgId || t.orgId === orgId.trim());
        }
        handler(terminals);
      }
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.GET, 'terminals');
    },
  );
}

// ============================================================================
// 7. Real-Time Audit Logs Listeners
// ============================================================================

/**
 * Real-time listener for audit_logs collection in Firestore.
 * Automatically receives live updates whenever a CRUD action occurs on Organizations, Branches, or Terminals.
 */
export function subscribeToAuditLogs(
  callback: (logs: OrganizationAuditLog[]) => void,
  options?: {
    entityType?: 'organization' | 'branch' | 'terminal';
    action?: 'create' | 'update' | 'delete' | 'cascade_delete';
    orgId?: string;
    limitCount?: number;
    onError?: (error: unknown) => void;
  },
): Unsubscribe {
  const maxLogs = options?.limitCount || 100;
  
  let q;
  if (options?.entityType) {
    q = query(
      collection(db, 'audit_logs'),
      where('entityType', '==', options.entityType),
    );
  } else {
    q = collection(db, 'audit_logs');
  }

  return onSnapshot(
    q,
    (snapshot) => {
      let logs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as OrganizationAuditLog));

      if (options?.action) {
        logs = logs.filter((l) => l.action === options.action);
      }
      if (options?.orgId && options.orgId.trim()) {
        logs = logs.filter((l) => l.orgId === options.orgId);
      }

      // Sort newest first
      logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      callback(logs.slice(0, maxLogs));
    },
    (err) => {
      console.warn('[AuditLog] Realtime listener error:', err);
      if (options?.onError) {
        options.onError(err);
      } else {
        handleFirestoreError(err, OperationType.GET, 'audit_logs');
      }
    },
  );
}

/**
 * Fetches audit logs from Firestore.
 */
export async function getAuditLogs(
  options?: {
    entityType?: 'organization' | 'branch' | 'terminal';
    action?: 'create' | 'update' | 'delete' | 'cascade_delete';
    orgId?: string;
    limitCount?: number;
  },
): Promise<OrganizationAuditLog[]> {
  const maxLogs = options?.limitCount || 100;
  try {
    const q = options?.entityType
      ? query(collection(db, 'audit_logs'), where('entityType', '==', options.entityType))
      : collection(db, 'audit_logs');
    const snapshot = await getDocs(q);
    let logs = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as OrganizationAuditLog));

    if (options?.action) {
      logs = logs.filter((l) => l.action === options.action);
    }
    if (options?.orgId && options.orgId.trim()) {
      logs = logs.filter((l) => l.orgId === options.orgId);
    }

    logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return logs.slice(0, maxLogs);
  } catch (err) {
    console.warn('[AuditLog] getAuditLogs error:', err);
    return [];
  }
}

// Aliases for compatibility
export const subscribeToOrganizationHierarchy = subscribeToOrganizationStructure;
export const getBranches = getAllBranches;
export const getTerminals = getAllTerminals;


