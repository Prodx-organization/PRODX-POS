import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { resolveProductionDatabaseUrl } from "./url.ts";

Deno.test("rewrites the Project A runtime role direct URL to the IPv4 session pooler", () => {
  assertEquals(
    resolveProductionDatabaseUrl("postgresql://prodx_app:secret%40value@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres?sslmode=disable"),
    "postgresql://prodx_app.bbxoywnlayduqbrjeixj:secret%40value@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
  );
});

Deno.test("accepts the qualified runtime role and enforces TLS", () => {
  assertEquals(
    resolveProductionDatabaseUrl("postgresql://prodx_app.bbxoywnlayduqbrjeixj:runtime-secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=disable"),
    "postgresql://prodx_app.bbxoywnlayduqbrjeixj:runtime-secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
  );
});

Deno.test("rejects administrative role", () => {
  assertThrows(
    () => resolveProductionDatabaseUrl("postgresql://postgres:secret@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres"),
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
    "approved Supabase Project A endpoint",
  );
});
