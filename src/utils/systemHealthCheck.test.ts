import assert from 'node:assert/strict';
import test from 'node:test';
import { SystemHealthCheckUtility } from './systemHealthCheck';

const healthyResponse = () => ({
  success: true,
  statusCode: 200,
  status: 'HEALTHY',
  timestamp: new Date().toISOString(),
  requestId: 'test-shc-mock',
  totalDurationMs: 18.5,
  environment: { nodeEnv: 'test', databaseTarget: 'other' },
  services: {
    postgres: {
      service: 'PostgreSQL',
      statusCode: 200,
      status: 'connected',
      latencyMs: 8.2,
      engine: 'PostgreSQL 16',
      database: 'prodx_test',
      queryProbe: 'SELECT 1 -> OK',
    },
  },
  diagnostics: { uptimeSeconds: 10, memoryUsageMb: 20 },
  summary: 'PostgreSQL query probe succeeded.',
});

test('SystemHealthCheckUtility is a singleton', () => {
  assert.equal(SystemHealthCheckUtility.getInstance(), SystemHealthCheckUtility.getInstance());
});

test('health utility reports healthy only when the backend confirms a successful PostgreSQL query', async () => {
  const utility = SystemHealthCheckUtility.getInstance();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(healthyResponse()), { status: 200 });
  try {
    const result = await utility.executePing();
    assert.equal(result.statusCode, 200);
    assert.equal(result.status, 'HEALTHY');
    assert.equal(result.services.postgres.database, 'prodx_test');
    assert.equal(result.environment.databaseTarget, 'other');
    assert.ok(result.rawJson.includes('"statusCode": 200'));
    let notified = false;
    const unsubscribe = utility.subscribe((updated) => { notified = updated.statusCode === 200; });
    assert.equal(notified, true);
    unsubscribe();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('health utility fails closed when the backend responds without a healthy PostgreSQL result', async () => {
  const utility = SystemHealthCheckUtility.getInstance();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    statusCode: 503,
    status: 'DOWN',
    environment: { nodeEnv: 'test', databaseTarget: 'invalid' },
    services: {
      postgres: {
        service: 'PostgreSQL', statusCode: 503, status: 'unreachable',
        latencyMs: 5, engine: 'PostgreSQL', database: 'unknown', error: 'Connection refused',
      },
    },
    summary: 'PostgreSQL query probe failed.',
  }), { status: 503 });
  try {
    const result = await utility.executePing();
    assert.equal(result.statusCode, 503);
    assert.equal(result.status, 'DOWN');
    assert.equal(result.services.postgres.statusCode, 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('health utility reports backend outage without claiming database availability', async () => {
  const utility = SystemHealthCheckUtility.getInstance();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network unavailable'); };
  try {
    const result = await utility.executePing();
    assert.equal(result.statusCode, 503);
    assert.equal(result.services.postgres.status, 'unreachable');
    assert.match(result.services.postgres.error ?? '', /network unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
