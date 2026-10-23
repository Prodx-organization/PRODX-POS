const DIRECT_HOST = "db.bbxoywnlayduqbrjeixj.supabase.co";
const SESSION_POOLER_HOST = "aws-0-ap-southeast-1.pooler.supabase.com";
const PROJECT_REF = "bbxoywnlayduqbrjeixj";
const RUNTIME_ROLE = "prodx_app";
const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

export const resolveProductionDatabaseUrl = (dbUrl: string): string => {
  let url: URL;
  try {
    url = new URL(dbUrl);
  } catch {
    throw new Error("Runtime database URL must be a valid PostgreSQL URL.");
  }

  if (!POSTGRES_PROTOCOLS.has(url.protocol)) {
    throw new Error("Runtime database URL must use the PostgreSQL protocol.");
  }
  if (url.hostname !== DIRECT_HOST && url.hostname !== SESSION_POOLER_HOST) {
    throw new Error("Runtime database URL must target the approved Supabase Project A endpoint.");
  }

  const runtimeRole = url.username;
  const qualifiedRuntimeRole = `${RUNTIME_ROLE}.${PROJECT_REF}`;
  if (runtimeRole !== RUNTIME_ROLE && runtimeRole !== qualifiedRuntimeRole) {
    throw new Error("Runtime database URL must use the dedicated prodx_app role.");
  }

  url.hostname = SESSION_POOLER_HOST;
  url.port = "5432";
  url.username = qualifiedRuntimeRole;
  url.searchParams.set("sslmode", "require");

  return url.toString();
};
