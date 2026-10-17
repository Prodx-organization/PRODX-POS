import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
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
    createdAt: 1710000000000,
  },
  {
    id: 'org-siam',
    name: 'Siam Enterprise Commerce',
    slug: 'siam-enterprise',
    createdAt: 1710000001000,
  },
];

const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'br-str-01',
    orgId: 'org-prodx',
    name: 'STR-01',
    address: 'Bangkok Flagship Central World',
    createdAt: 1710000000000,
  },
  {
    id: 'br-str-02',
    orgId: 'org-prodx',
    name: 'STR-02',
    address: 'Chiang Mai Nimman Branch',
    createdAt: 1710000001000,
  },
  {
    id: 'br-siam-01',
    orgId: 'org-siam',
    name: 'SIAM-01',
    address: 'Siam Paragon G Floor',
    createdAt: 1710000002000,
  },
];

const DEFAULT_TERMINALS: Terminal[] = [
  {
    id: 'term-001',
    branchId: 'br-str-01',
    name: 'Main Checkout Counter 1',
    code: 'Terminal-001',
    createdAt: 1710000000000,
  },
  {
    id: 'term-002',
    branchId: 'br-str-01',
    name: 'Express Lane Counter 2',
    code: 'Terminal-002',
    createdAt: 1710000001000,
  },
  {
    id: 'term-003',
    branchId: 'br-str-02',
    name: 'Nimman Main Register',
    code: 'Terminal-001',
    createdAt: 1710000002000,
  },
  {
    id: 'term-004',
    branchId: 'br-siam-01',
    name: 'Paragon Front Counter 1',
    code: 'Terminal-001',
    createdAt: 1710000003000,
  },
];

let seedAttempted = false;

async function ensureDefaultSystemConfig(): Promise<void> {
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

export const getAllBranches = async (): Promise<Branch[]> => {
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

export const getAllTerminals = async (): Promise<Terminal[]> => {
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

export const getSystemConfigCatalog = async (): Promise<{
  organizations: Organization[];
  branches: Branch[];
  terminals: Terminal[];
}> => {
  const [organizations, branches, terminals] = await Promise.all([
    getOrganizations(),
    getAllBranches(),
    getAllTerminals(),
  ]);
  return { organizations, branches, terminals };
};

export const getBranches = async (orgId: string): Promise<Branch[]> => {
  if (!orgId) return [];
  try {
    const q = query(collection(db, 'branches'), where('orgId', '==', orgId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return DEFAULT_BRANCHES.filter((b) => b.orgId === orgId);
    }
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Branch));
  } catch {
    return DEFAULT_BRANCHES.filter((b) => b.orgId === orgId);
  }
};

export const getTerminals = async (branchId: string): Promise<Terminal[]> => {
  if (!branchId) return [];
  try {
    const q = query(collection(db, 'terminals'), where('branchId', '==', branchId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return DEFAULT_TERMINALS.filter((t) => t.branchId === branchId);
    }
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Terminal));
  } catch {
    return DEFAULT_TERMINALS.filter((t) => t.branchId === branchId);
  }
};

export const createOrganization = async (input: { name: string; slug: string }): Promise<Organization> => {
  const id = `org-${input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${Date.now().toString(36)}`;
  const record: Organization = {
    id,
    name: input.name.trim().slice(0, 120),
    slug: input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64),
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'organizations', id), record);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `organizations/${id}`);
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
}): Promise<Branch> => {
  const id = `br-${Date.now().toString(36)}`;
  const record: Branch = {
    id,
    orgId: input.orgId.trim().slice(0, 128),
    name: input.name.trim().slice(0, 120),
    address: input.address.trim().slice(0, 300),
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'branches', id), record);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `branches/${id}`);
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
}): Promise<Terminal> => {
  const id = `term-${Date.now().toString(36)}`;
  const record: Terminal = {
    id,
    branchId: input.branchId.trim().slice(0, 128),
    name: input.name.trim().slice(0, 120),
    code: input.code.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64),
    createdAt: Date.now(),
  };
  try {
    await setDoc(doc(db, 'terminals', id), record);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `terminals/${id}`);
  }
};

export const deleteTerminal = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'terminals', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `terminals/${id}`);
  }
};
