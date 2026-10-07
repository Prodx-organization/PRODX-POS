import { assertEquals } from "jsr:@std/assert@1";
import { resolveProductionDatabaseUrl } from "./url.ts";

Deno.test("rewrites the Supabase direct database URL to the IPv4 session pooler", () => {
  const result = resolveProductionDatabaseUrl(
    "postgresql://postgres:secret%40value@db.sjgwesmmpegtzsqqqhvd.supabase.co:5432/postgres?sslmode=require",
  );

  assertEquals(
    result,
    "postgresql://postgres.sjgwesmmpegtzsqqqhvd:secret%40value@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
  );
});

Deno.test("preserves non-Supabase database URLs", () => {
  const result = resolveProductionDatabaseUrl(
    "postgresql://postgres.example:5432/prodx?sslmode=require",
  );

  assertEquals(result, "postgresql://postgres.example:5432/prodx?sslmode=require");
});

Deno.test("adds sslmode=require when the direct URL does not specify it", () => {
  const result = resolveProductionDatabaseUrl(
    "postgresql://postgres:secret@db.sjgwesmmpegtzsqqqhvd.supabase.co:5432/postgres",
  );

  assertEquals(
    result,
    "postgresql://postgres.sjgwesmmpegtzsqqqhvd:secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
  );
});
