import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { resolveProductionDatabaseUrl } from "./url.ts";

Deno.test("rewrites the dedicated runtime role direct URL to the IPv4 session pooler", () => {
  const result = resolveProductionDatabaseUrl(
    "postgresql://prodx_app:secret%40value@db.sjgwesmmpegtzsqqqhvd.supabase.co:5432/postgres?sslmode=require",
  );

  assertEquals(
    result,
    "postgresql://prodx_app.sjgwesmmpegtzsqqqhvd:secret%40value@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
  );
});

Deno.test("preserves the dedicated least-privilege role when rewriting the direct URL", () => {
  const result = resolveProductionDatabaseUrl(
    "postgresql://prodx_app:runtime-secret@db.sjgwesmmpegtzsqqqhvd.supabase.co:5432/postgres",
  );

  assertEquals(
    result,
    "postgresql://prodx_app.sjgwesmmpegtzsqqqhvd:runtime-secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
  );
});

Deno.test("accepts the correctly qualified runtime role on the session pooler and enforces TLS", () => {
  const result = resolveProductionDatabaseUrl(
    "postgresql://prodx_app.sjgwesmmpegtzsqqqhvd:runtime-secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=disable",
  );

  assertEquals(
    result,
    "postgresql://prodx_app.sjgwesmmpegtzsqqqhvd:runtime-secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
  );
});

Deno.test("rejects the administrative postgres role on the direct host", () => {
  assertThrows(
    () => resolveProductionDatabaseUrl("postgresql://postgres:secret@db.sjgwesmmpegtzsqqqhvd.supabase.co:5432/postgres"),
    Error,
    "dedicated prodx_app role",
  );
});

Deno.test("rejects the qualified administrative postgres role on the pooler", () => {
  assertThrows(
    () => resolveProductionDatabaseUrl("postgresql://postgres.sjgwesmmpegtzsqqqhvd:secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"),
    Error,
    "dedicated prodx_app role",
  );
});

Deno.test("rejects non-PostgreSQL URLs", () => {
  assertThrows(
    () => resolveProductionDatabaseUrl("https://sjgwesmmpegtzsqqqhvd.supabase.co"),
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

Deno.test("rejects pooler usernames qualified for another project", () => {
  assertThrows(
    () => resolveProductionDatabaseUrl("postgresql://prodx_app.otherproject:secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"),
    Error,
    "dedicated prodx_app role",
  );
});
