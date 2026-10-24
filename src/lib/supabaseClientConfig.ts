export interface SupabaseClientEnvironment {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_OWNER_SUPABASE_URL?: string;
  VITE_OWNER_SUPABASE_PUBLISHABLE_KEY?: string;
}

export interface SupabasePublicClientConfig {
  url: string;
  publishableKey: string;
}

function validatePublicClientConfig(
  urlValue: string | undefined,
  keyValue: string | undefined,
  clientName: 'POS' | 'Owner Console',
  urlVariable: string,
  keyVariable: string,
): SupabasePublicClientConfig {
  const url = urlValue?.trim();
  const publishableKey = keyValue?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      `${clientName} Supabase is not configured. Set ${urlVariable} and ${keyVariable}.`,
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`${clientName} Supabase URL is invalid.`);
  }

  const isLocalDevelopment =
    parsedUrl.protocol === 'http:' &&
    (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1');
  if (parsedUrl.protocol !== 'https:' && !isLocalDevelopment) {
    throw new Error(`${clientName} Supabase URL must use HTTPS outside localhost.`);
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error(`${clientName} Supabase URL must not contain credentials.`);
  }

  return { url: parsedUrl.toString().replace(/\/$/, ''), publishableKey };
}

export function getPosSupabaseConfig(
  env: SupabaseClientEnvironment,
): SupabasePublicClientConfig {
  return validatePublicClientConfig(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    'POS',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
  );
}

export function getOwnerSupabaseConfig(
  env: SupabaseClientEnvironment,
): SupabasePublicClientConfig {
  return validatePublicClientConfig(
    env.VITE_OWNER_SUPABASE_URL,
    env.VITE_OWNER_SUPABASE_PUBLISHABLE_KEY,
    'Owner Console',
    'VITE_OWNER_SUPABASE_URL',
    'VITE_OWNER_SUPABASE_PUBLISHABLE_KEY',
  );
}
