// Supabase Edge Function entrypoint for the PRODX production database broker.
// Deploy with `verify_jwt = false`: callers authenticate with a Vercel OIDC token, which this
// function verifies itself; they do not hold a Supabase JWT. See ./README.md.
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.2.12';
import { buildBrokerConfig, createBrokerHandler, type VerifyOidcToken } from './handler.ts';
import { supabaseProjectRefFromUrl } from './target.ts';

const expectedBrokerProjectRef = Deno.env.get('PRODX_DB_BROKER_PROJECT_REF')?.trim().toLowerCase();
const deployedBrokerProjectRef = supabaseProjectRefFromUrl(Deno.env.get('SUPABASE_URL') ?? undefined);
const brokerProjectIsApproved = Boolean(
  expectedBrokerProjectRef && deployedBrokerProjectRef && expectedBrokerProjectRef === deployedBrokerProjectRef,
);

const config = brokerProjectIsApproved
  ? buildBrokerConfig({
      issuer: Deno.env.get('PRODX_OIDC_ISSUER'),
      audience: Deno.env.get('PRODX_OIDC_AUDIENCE'),
      allowedSubjects: Deno.env.get('PRODX_OIDC_ALLOWED_SUBJECTS'),
      databaseUrl: Deno.env.get('PRODX_RUNTIME_DATABASE_URL'),
      allowedDatabaseHost: Deno.env.get('PRODX_DB_ALLOWED_HOST'),
      databaseProjectRef: Deno.env.get('PRODX_DB_ALLOWED_PROJECT_REF'),
    })
  : null;

const jwks = config ? createRemoteJWKSet(new URL(`${config.issuer}/.well-known/jwks`)) : null;

const verifyToken: VerifyOidcToken = async (token, expected) => {
  if (!jwks) throw new Error('broker not configured');
  const { payload } = await jwtVerify(token, jwks, {
    issuer: expected.issuer,
    audience: expected.audience,
    algorithms: ['RS256'],
    clockTolerance: 5,
  });
  return payload as Record<string, unknown>;
};

if (!config) {
  console.error('prodx-db-broker is not configured; every request will receive HTTP 503.');
}

Deno.serve(createBrokerHandler({ config, verifyToken }));
