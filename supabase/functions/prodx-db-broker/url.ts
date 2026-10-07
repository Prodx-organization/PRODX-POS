const DIRECT_HOST = "db.sjgwesmmpegtzsqqqhvd.supabase.co";
const SESSION_POOLER_HOST = "aws-0-ap-northeast-1.pooler.supabase.com";
const SESSION_POOLER_USER = "postgres.sjgwesmmpegtzsqqqhvd";

export const resolveProductionDatabaseUrl = (dbUrl: string): string => {
  const url = new URL(dbUrl);
  if (url.hostname !== DIRECT_HOST) return dbUrl;

  url.hostname = SESSION_POOLER_HOST;
  url.port = "5432";
  url.username = SESSION_POOLER_USER;
  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }

  return url.toString();
};
