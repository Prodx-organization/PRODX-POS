const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const HOST_PATTERN = /^[a-z0-9.-]+$/;

const normalizeProjectRef = (raw: string | undefined): string | null => {
  const value = raw?.trim().toLowerCase();
  return value && PROJECT_REF_PATTERN.test(value) ? value : null;
};

const normalizeHost = (raw: string | undefined): string | null => {
  const value = raw?.trim().toLowerCase();
  if (!value || !HOST_PATTERN.test(value) || value.startsWith('.') || value.endsWith('.') || value.includes('..')) {
    return null;
  }
  return value;
};

/**
 * Accept only an explicitly approved Supabase PostgreSQL target.
 * Pooler usernames must bind the restricted role to the exact project ref; direct
 * database hosts must embed the same ref and use the bare restricted role.
 */
export const validateApprovedDatabaseUrl = (
  rawUrl: string | undefined,
  allowedHost: string | undefined,
  projectRef: string | undefined,
): string | null => {
  const databaseUrl = rawUrl?.trim();
  const host = normalizeHost(allowedHost);
  const ref = normalizeProjectRef(projectRef);
  if (!databaseUrl || !host || !ref) return null;

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return null;
  }

  if (
    (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') ||
    parsed.hostname.toLowerCase() !== host ||
    (parsed.port !== '' && parsed.port !== '5432') ||
    parsed.hash !== ''
  ) {
    return null;
  }

  let username: string;
  try {
    username = decodeURIComponent(parsed.username);
  } catch {
    return null;
  }

  const isSupabasePooler = /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(host);
  if (isSupabasePooler) {
    if (username !== `prodx_app.${ref}`) return null;
  } else if (host === `db.${ref}.supabase.co`) {
    if (username !== 'prodx_app') return null;
  } else {
    return null;
  }

  return databaseUrl;
};

/** Require the broker endpoint to be the exact function URL in the explicitly approved Supabase project. */
export const validateBrokerEndpointUrl = (
  rawUrl: string | undefined,
  brokerProjectRef: string | undefined,
): string | null => {
  const endpoint = rawUrl?.trim();
  const ref = normalizeProjectRef(brokerProjectRef);
  if (!endpoint || !ref) return null;

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname.toLowerCase() !== `${ref}.supabase.co` ||
    parsed.port !== '' ||
    parsed.pathname !== '/functions/v1/prodx-db-broker' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    return null;
  }

  return endpoint;
};

/** Extract a project ref only from a canonical Supabase project URL. */
export const supabaseProjectRefFromUrl = (rawUrl: string | undefined): string | null => {
  const value = rawUrl?.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.port !== '' || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return null;
    }
    return /^([a-z0-9]{20})\.supabase\.co$/.exec(parsed.hostname.toLowerCase())?.[1] ?? null;
  } catch {
    return null;
  }
};
