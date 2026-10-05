import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeAIRateLimit, AIRateLimitExceededError } from './rate-limit';

const scope = { organizationId:'org-1', storeId:'store-1', userId:'user-1' };

test('AI minute quota uses atomic PostgreSQL upsert', async () => {
  const queries:string[]=[];
  const db={ query: async (sql:string, params:unknown[]) => {
    queries.push(sql);
    assert.equal(params.length, 8);
    return { rows:[{allowed:true,reason:null}] };
  }};
  await consumeAIRateLimit(db as never, scope, 100, {requestsPerMinute:20,inputTokensPerDay:100000});
  assert.equal(queries.length,1);
  assert.match(queries[0], /ON CONFLICT/);
  assert.match(queries[0], /request_count < \$8/);
});

test('AI quota rejects an atomic daily quota failure without calling provider', async () => {
  const db={ query: async () => ({ rows:[{allowed:false,reason:'AI_QUOTA_EXCEEDED'}] }) };
  await assert.rejects(
    () => consumeAIRateLimit(db as never, scope, 100, {requestsPerMinute:20,inputTokensPerDay:100}),
    (error) => error instanceof AIRateLimitExceededError && error.code === 'AI_QUOTA_EXCEEDED',
  );
});

test('AI rate limit rejects an atomic minute window failure', async () => {
  const db={ query: async () => ({ rows:[{allowed:false,reason:'AI_RATE_LIMITED'}] }) };
  await assert.rejects(
    () => consumeAIRateLimit(db as never, scope, 100, {requestsPerMinute:20,inputTokensPerDay:100000}),
    (error) => error instanceof AIRateLimitExceededError && error.code === 'AI_RATE_LIMITED',
  );
});
