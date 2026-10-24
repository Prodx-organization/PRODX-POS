import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { resolveProductionDatabaseUrl } from "./url.ts";

Deno.test("rewrites the target project's direct URL to its IPv4 session pooler", () => {
  const result = resolveProductionDatabaseUrl(
    "postgresql://prodx_app:secret%40value@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres?sslmode=require",
  );

  assertEquals(
    result,
    "postgresql://prodx_app.bbxoywnlayduqbrjeixj:secret%40value@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
  );
});

Deno.test("preserves the dedicated least-privilege role when rewriting the direct URL", () => {
  const result = resolveProductionDatabaseUrl(
    "postgresql://prodx_app:runtime-secret@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres",
  );

  assertEquals(
    result,
    "postgresql://prodx_app.bbxoywnlayduqbrjeixj:runtime-secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
  );
});

Deno.test("accepts the correctly qualified runtime role on the target session pooler and enforces TLS", () => {
  const result = resolveProductionDatabaseUrl(
    "postgresql://prodx_app.bbxoywnlayduqbrjeixj:runtime-secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=disable",
  );

  assertEquals(
    result,
    "postgresql://prodx_app.bbxoywnlayduqbrjeixj:runtime-secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
  );
});

Deno.test("rejects the administrative postgres role on the direct host", () => {
  assertThrows(
    () => resolveProductionDatabaseUrl("postgresql://postgres:secret@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres"),
    Error,
    "dedicated prodx_app role",
  );
});

Deno.test("rejects the qualified administrative postgres role on the pooler", () => {
  assertThrows(
    () => resolveProductionDatabaseUrl("postgresql://postgres.bbxoywnlayduqbrjeixj:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"),
    Error,
    "dedicated prodx_app role",
  );
});

Deno.test("rejects non-PostgreSQL URLs", () => {
  assertThrows(
    () => resolveProductionDatabaseUrl("https://bbxoywnlayduqbrjeixj.supabase.co"),
    Error,
    "must use the PostgreSQL protocol",
  );
});

Deno.test("rejects unsupported database hosts", () => {
  assertThrows(
    () => resolveProductionDatabaseUrl("postgresql://prodx_app:secret@db.example.com:5432/postgres"),
    Error,
    "approved Supabase endpoint",
  );
});

Deno.test("rejects the previous project's direct host", () => {
  assertThrows(
    () => resolveProductionDatabaseUrl("postgresql://prodx_app:secret@db.sjgwesmmpegtzsqqqhvd.supabase.co:5432/postgres"),
    Error,
    "approved Supabase endpoint",
  );
});

Deno.test("rejects pooler usernames qualified for another project", () => {
  assertThrows(
    () => resolveProductionDatabaseUrl("postgresql://prodx_app.otherproject:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"),
    Error,
    "dedicated prodx_app role",
  );
});
