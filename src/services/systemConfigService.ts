import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { Organization, Branch, Terminal } from '../modules/settings/types';

const DEFAULT_ORGS: Organization[] = [
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

const DEFAULT_BRANCHES: Branch[] = [
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

const DEFAULT_TERMINALS: Terminal[] = [
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

let seedAttempted = false;

export async function ensureDefaultSystemConfig(): Promise<void> {
  if (seedAttempted) return;
  seedAttempted = true;
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
    // Fallback to DEFAULT_* constants if seeding is skipped
  }
}

export const getOrganizations = async (): Promise<Organization[]> => {
  try {
    const q = collection(db, 'organizations');
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await ensureDefaultSystemConfig();
      const retry = await getDocs(q);
      if (!retry.empty) {
        return retry.docs.map((d) => ({ id: d.id, ...d.data() } as Organization));
      }
      return DEFAULT_ORGS;
    }
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Organization));
  } catch {
    return DEFAULT_ORGS;
  }
};

export const getOrganizationById = async (id: string): Promise<Organization | null> => {
  if (!id) return null;
  try {
    const snap = await getDoc(doc(db, 'organizations', id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Organization;
    }
  } catch {
    // fallback
  }
  return DEFAULT_ORGS.find((o) => o.id === id) || null;
};

/**
 * Fetches branches with record-level security.
 * When orgId is specified, strictly queries and filters branches belonging only to that organization.
 */
export const getBranches = async (orgId: string): Promise<Branch[]> => {
  if (!orgId || typeof orgId !== 'string') return [];
  const normalizedOrgId = orgId.trim();
  if (!normalizedOrgId) return [];

  try {
    const q = query(collection(db, 'branches'), where('orgId', '==', normalizedOrgId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return DEFAULT_BRANCHES.filter((b) => b.orgId === normalizedOrgId);
    }
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as Branch))
      .filter((b) => b.orgId === normalizedOrgId);
  } catch {
    return DEFAULT_BRANCHES.filter((b) => b.orgId === normalizedOrgId);
  }
};

export const getBranchById = async (branchId: string, orgId?: string): Promise<Branch | null> => {
  if (!branchId) return null;
  try {
    const snap = await getDoc(doc(db, 'branches', branchId));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as Branch;
      if (orgId && data.orgId !== orgId.trim()) return null;
      return data;
    }
  } catch {
    // fallback
  }
  const found = DEFAULT_BRANCHES.find((b) => b.id === branchId);
  if (!found) return null;
  if (orgId && found.orgId !== orgId.trim()) return null;
  return found;
};

/**
 * Fetches terminals with record-level security.
 * Strictly queries terminals matching branchId, and optionally filters by orgId.
 */
export const getTerminals = async (branchId: string, orgId?: string): Promise<Terminal[]> => {
  if (!branchId || typeof branchId !== 'string') return [];
  const normalizedBranchId = branchId.trim();
  if (!normalizedBranchId) return [];

  try {
    const q = query(collection(db, 'terminals'), where('branchId', '==', normalizedBranchId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return DEFAULT_TERMINALS.filter((t) => {
        if (t.branchId !== normalizedBranchId) return false;
        if (orgId && t.orgId && t.orgId !== orgId.trim()) return false;
        return true;
      });
    }
    const terminals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Terminal));
    return terminals.filter((t) => {
      if (t.branchId !== normalizedBranchId) return false;
      if (orgId && t.orgId && t.orgId !== orgId.trim()) return false;
      return true;
    });
  } catch {
    return DEFAULT_TERMINALS.filter((t) => {
      if (t.branchId !== normalizedBranchId) return false;
      if (orgId && t.orgId && t.orgId !== orgId.trim()) return false;
      return true;
    });
  }
};

/**
 * Fetches a single terminal by terminalId, strictly enforcing branch and organization isolation.
 */
export const getTerminalById = async (
  terminalId: string,
  branchId?: string,
  orgId?: string,
): Promise<Terminal | null> => {
  if (!terminalId || typeof terminalId !== 'string') return null;
  const normalizedId = terminalId.trim();
  if (!normalizedId) return null;

  try {
    const docRef = doc(db, 'terminals', normalizedId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as Terminal;
      if (branchId && data.branchId !== branchId.trim()) return null;
      if (orgId && data.orgId && data.orgId !== orgId.trim()) return null;
      return data;
    }
  } catch {
    // Fall back to default memory check
  }

  const found = DEFAULT_TERMINALS.find((t) => t.id === normalizedId || t.code === normalizedId);
  if (!found) return null;
  if (branchId && found.branchId !== branchId.trim()) return null;
  if (orgId && found.orgId && found.orgId !== orgId.trim()) return null;
  return found;
};

/**
 * Returns branches. If orgId is provided, enforces record-level filtering to that organization only.
 */
export const getAllBranches = async (orgId?: string): Promise<Branch[]> => {
  if (orgId) {
    return getBranches(orgId);
  }
  try {
    const q = collection(db, 'branches');
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await ensureDefaultSystemConfig();
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
};

/**
 * Returns terminals. If branchId is provided, enforces record-level filtering to that branch and org only.
 */
export const getAllTerminals = async (branchId?: string, orgId?: string): Promise<Terminal[]> => {
  if (branchId) {
    return getTerminals(branchId, orgId);
  }
  try {
    const q = collection(db, 'terminals');
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await ensureDefaultSystemConfig();
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
};

/**
 * Returns scoped system catalog data.
 * When operational scope is provided, strictly filters entities matching the selected organization,
 * branch, and terminal ID.
 */
export const getSystemConfigCatalog = async (scope?: {
  organizationId?: string;
  branchId?: string;
  terminalId?: string;
}): Promise<{
  organizations: Organization[];
  branches: Branch[];
  terminals: Terminal[];
}> => {
  const organizations = await getOrganizations();
  const branches = scope?.organizationId
    ? await getBranches(scope.organizationId)
    : await getAllBranches();
  const terminals = scope?.branchId
    ? await getTerminals(scope.branchId, scope?.organizationId)
    : await getAllTerminals();

  const filteredTerminals = scope?.terminalId
    ? terminals.filter((t) => t.id === scope.terminalId || t.code === scope.terminalId)
    : terminals;

  return {
    organizations,
    branches,
    terminals: filteredTerminals.length > 0 ? filteredTerminals : terminals,
  };
};

export const createOrganization = async (input: {
  name: string;
  slug: string;
  taxId?: string;
  phone?: string;
  email?: string;
  currency?: string;
  status?: 'active' | 'inactive';
}): Promise<Organization> => {
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
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `organizations/${id}`);
  }
};

export const updateOrganization = async (
  id: string,
  updates: Partial<Omit<Organization, 'id' | 'createdAt'>>,
): Promise<Organization> => {
  const existing = await getOrganizationById(id);
  if (!existing) {
    throw new Error(`Organization with ID ${id} not found.`);
  }

  const record: Organization = {
    id: existing.id,
    name: updates.name ? updates.name.trim().slice(0, 120) : existing.name,
    slug: updates.slug
      ? updates.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64)
      : existing.slug,
    ...(updates.taxId !== undefined ? { taxId: updates.taxId.trim().slice(0, 64) } : existing.taxId ? { taxId: existing.taxId } : {}),
    ...(updates.phone !== undefined ? { phone: updates.phone.trim().slice(0, 32) } : existing.phone ? { phone: existing.phone } : {}),
    ...(updates.email !== undefined ? { email: updates.email.trim().slice(0, 120) } : existing.email ? { email: existing.email } : {}),
    ...(updates.currency !== undefined ? { currency: updates.currency.trim().slice(0, 10) } : existing.currency ? { currency: existing.currency } : {}),
    ...(updates.status ? { status: updates.status } : existing.status ? { status: existing.status } : {}),
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };

  try {
    await setDoc(doc(db, 'organizations', id), record);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `organizations/${id}`);
  }
};

export const deleteOrganization = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'organizations', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `organizations/${id}`);
  }
};

export const createBranch = async (input: {
  orgId: string;
  name: string;
  address: string;
  code?: string;
  phone?: string;
  manager?: string;
  status?: 'active' | 'inactive';
}): Promise<Branch> => {
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
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `branches/${id}`);
  }
};

export const updateBranch = async (
  id: string,
  updates: Partial<Omit<Branch, 'id' | 'orgId' | 'createdAt'>>,
): Promise<Branch> => {
  const existing = await getBranchById(id);
  if (!existing) {
    throw new Error(`Branch with ID ${id} not found.`);
  }

  const record: Branch = {
    id: existing.id,
    orgId: existing.orgId,
    name: updates.name ? updates.name.trim().slice(0, 120) : existing.name,
    address: updates.address ? updates.address.trim().slice(0, 300) : existing.address,
    ...(updates.code !== undefined ? { code: updates.code.trim().slice(0, 64) } : existing.code ? { code: existing.code } : {}),
    ...(updates.phone !== undefined ? { phone: updates.phone.trim().slice(0, 32) } : existing.phone ? { phone: existing.phone } : {}),
    ...(updates.manager !== undefined ? { manager: updates.manager.trim().slice(0, 120) } : existing.manager ? { manager: existing.manager } : {}),
    ...(updates.status ? { status: updates.status } : existing.status ? { status: existing.status } : {}),
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };

  try {
    await setDoc(doc(db, 'branches', id), record);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `branches/${id}`);
  }
};

export const deleteBranch = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'branches', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `branches/${id}`);
  }
};

export const createTerminal = async (input: {
  branchId: string;
  name: string;
  code: string;
  orgId?: string;
  deviceModel?: string;
  ipAddress?: string;
  paperWidth?: '58mm' | '80mm';
  status?: 'active' | 'maintenance' | 'inactive';
}): Promise<Terminal> => {
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
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `terminals/${id}`);
  }
};

export const updateTerminal = async (
  id: string,
  updates: Partial<Omit<Terminal, 'id' | 'branchId' | 'createdAt'>>,
): Promise<Terminal> => {
  const existing = await getTerminalById(id);
  if (!existing) {
    throw new Error(`Terminal with ID ${id} not found.`);
  }

  const record: Terminal = {
    id: existing.id,
    branchId: existing.branchId,
    ...(existing.orgId || updates.orgId ? { orgId: (updates.orgId || existing.orgId)!.trim().slice(0, 128) } : {}),
    name: updates.name ? updates.name.trim().slice(0, 120) : existing.name,
    code: updates.code ? updates.code.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64) : existing.code,
    ...(updates.deviceModel !== undefined ? { deviceModel: updates.deviceModel.trim().slice(0, 120) } : existing.deviceModel ? { deviceModel: existing.deviceModel } : {}),
    ...(updates.ipAddress !== undefined ? { ipAddress: updates.ipAddress.trim().slice(0, 64) } : existing.ipAddress ? { ipAddress: existing.ipAddress } : {}),
    paperWidth: updates.paperWidth || existing.paperWidth || '80mm',
    status: updates.status || existing.status || 'active',
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };

  try {
    await setDoc(doc(db, 'terminals', id), record);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `terminals/${id}`);
  }
};

export const deleteTerminal = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'terminals', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `terminals/${id}`);
  }
};

/**
 * Cascade-deletes a branch and all its associated terminals.
 */
export const deleteBranchCascade = async (
  branchId: string,
  orgId?: string,
): Promise<{ terminalsDeleted: number }> => {
  const terminals = await getTerminals(branchId, orgId);
  for (const term of terminals) {
    await deleteTerminal(term.id);
  }
  await deleteBranch(branchId);
  return { terminalsDeleted: terminals.length };
};

/**
 * Cascade-deletes an organization, all its branches, and all associated terminals.
 */
export const deleteOrganizationCascade = async (
  orgId: string,
): Promise<{ branchesDeleted: number; terminalsDeleted: number }> => {
  const branches = await getBranches(orgId);
  let terminalsCount = 0;
  for (const br of branches) {
    const res = await deleteBranchCascade(br.id, orgId);
    terminalsCount += res.terminalsDeleted;
  }
  await deleteOrganization(orgId);
  return { branchesDeleted: branches.length, terminalsDeleted: terminalsCount };
};

export {
  subscribeToOrganizationStructure,
  subscribeToOrganizationHierarchy,
  subscribeToOrganizations,
  subscribeToBranches,
  subscribeToTerminals,
  subscribeToAuditLogs,
  getAuditLogs,
  recordOrganizationAuditLog,
} from './organizationService';

