import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { registerInfrastructureRoutes } from './infrastructureRoutes';
import { pingPostgres, performEndToEndHealthCheck } from '../services/systemHealthCheckService';

const start = async (app: express.Express) => {
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
};

const healthyPool = () => ({
  totalCount: 3,
  idleCount: 2,
  waitingCount: 0,
  query: async () => ({
    rows: [{
      ping: 1,
      server_time: new Date().toISOString(),
      version: 'PostgreSQL 16.2 on x86_64',
      database_name: 'prodx_test',
    }],
  }),
});

test('pingPostgres fails closed when the PostgreSQL pool is unavailable', async () => {
  const result = await pingPostgres(undefined);
  assert.equal(result.service, 'PostgreSQL');
  assert.equal(result.statusCode, 503);
  assert.equal(result.status, 'unreachable');
  assert.equal(result.code, 'DATABASE_URL_MISSING');
});

test('pingPostgres runs a real query through the supplied pool and reports safe database metadata', async () => {
  const result = await pingPostgres(healthyPool() as any);
  assert.equal(result.statusCode, 200);
  assert.equal(result.status, 'connected');
  assert.equal(result.engine, 'PostgreSQL 16.2');
  assert.equal(result.database, 'prodx_test');
  assert.equal(result.queryProbe, 'SELECT 1 -> OK');
  assert.equal(result.poolStats?.totalConnections, 3);
});

test('pingPostgres reports a query failure instead of treating an HTTP response as database health', async () => {
  const result = await pingPostgres({
    query: async () => { throw Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }); },
  } as any);
  assert.equal(result.statusCode, 503);
  assert.equal(result.status, 'unreachable');
  assert.equal(result.code, 'ECONNREFUSED');
});

test('performEndToEndHealthCheck reports HEALTHY only when PostgreSQL query succeeds', async () => {
  const configuredDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const result = await performEndToEndHealthCheck(healthyPool() as any, 'test-req-001');
    assert.equal(result.statusCode, 200);
    assert.equal(result.status, 'HEALTHY');
    assert.equal(result.requestId, 'test-req-001');
    assert.equal(result.services.postgres.database, 'prodx_test');
    assert.equal(result.environment.databaseTarget, 'invalid');
  } finally {
    if (configuredDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = configuredDatabaseUrl;
  }
});

test('system health HTTP route returns PostgreSQL query status and request ID', async () => {
  const app = express();
  app.use(express.json());
  registerInfrastructureRoutes(app, healthyPool() as any);
  const server = await start(app);
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/infrastructure/system-health-check`, {
      headers: { 'x-request-id': 'req-health-check-e2e' },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.requestId, 'req-health-check-e2e');
    assert.equal(body.success, true);
    assert.equal(body.services.postgres.database, 'prodx_test');
    assert.equal('firestore' in body.services, false);
  } finally {
    await server.close();
  }
});

test('latency endpoint does not claim success when PostgreSQL is unavailable', async () => {
  const app = express();
  app.use(express.json());
  registerInfrastructureRoutes(app);
  const server = await start(app);
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/infrastructure/latency-ping`);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.postgres.success, false);
    assert.equal('firestoreBackend' in body, false);
  } finally {
    await server.close();
  }
});
