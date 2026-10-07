import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as jose from "npm:jose@6.2.12";
import { resolveProductionDatabaseUrl } from "./url.ts";

const VERCEL_ISSUER = "https://oidc.vercel.com/prodx-team";
const VERCEL_AUDIENCE = "https://vercel.com/prodx-team";
const VERCEL_PROJECT_ID = "prj_oBqfEDvOLKw3LqGxfUWR1orCHW2b";
const VERCEL_OWNER = "prodx-team";
const VERCEL_ENVIRONMENT = "production";
const JWKS = jose.createRemoteJWKSet(new URL(VERCEL_ISSUER + "/.well-known/jwks"));

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return new Response("method-not-allowed", { status: 405 });
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return new Response("unauthorized", { status: 401 });
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: VERCEL_ISSUER,
      audience: VERCEL_AUDIENCE,
    });
    if (
      payload.project_id !== VERCEL_PROJECT_ID ||
      payload.owner !== VERCEL_OWNER ||
      payload.environment !== VERCEL_ENVIRONMENT
    ) return new Response("forbidden", { status: 403 });

    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) return new Response("db-url-unavailable", { status: 503 });
    return Response.json({ databaseUrl: resolveProductionDatabaseUrl(dbUrl) });
  } catch {
    return new Response("unauthorized", { status: 401 });
  }
});
