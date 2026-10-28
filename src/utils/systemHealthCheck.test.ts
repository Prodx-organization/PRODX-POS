import assert from 'node:assert/strict';
import test from 'node:test';
import { SystemHealthCheckUtility } from './systemHealthCheck';

test('SystemHealthCheckUtility singleton instance exists', () => {
  const instance1 = SystemHealthCheckUtility.getInstance();
  const instance2 = SystemHealthCheckUtility.getInstance();
  assert.equal(instance1, instance2);
});

test('SystemHealthCheckUtility formats status-coded JSON object properly on execution', async () => {
  const utility = SystemHealthCheckUtility.getInstance();

  // Mock global fetch to return sample health check response
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return {
      status: 200,
      json: async () => ({
        success: true,
        statusCode: 200,
        status: 'HEALTHY',
        timestamp: new Date().toISOString(),
        requestId: 'test-shc-mock',
        totalDurationMs: 18.5,
        environment: {
          nodeEnv: 'test',
          appletId: '069bc919-d8b1-4f51-9f13-c61a86822990',
          region: 'asia-southeast1',
          cloudSqlProject: 'gen-lang-client-0282713343',
          firestoreDatabaseId: 'ai-studio-prodxpos-069bc919-d8b1-4f51-9f13-c61a86822990',
        },
        services: {
          cloudSql: {
            service: 'Google Cloud SQL (PostgreSQL)',
            statusCode: 200,
            status: 'connected',
            latencyMs: 8.2,
            engine: 'PostgreSQL 16 (Cloud SQL)',
            region: 'asia-southeast1',
            projectId: 'gen-lang-client-0282713343',
            database: 'prodx_pos',
          },
          firestore: {
            service: 'Google Cloud Firestore',
            statusCode: 200,
            status: 'connected',
            latencyMs: 12.4,
            databaseId: 'ai-studio-prodxpos-069bc919-d8b1-4f51-9f13-c61a86822990',
            projectId: 'modified-bit-mct7q',
            region: 'asia-southeast1',
            endpoint: 'projects/modified-bit-mct7q/databases/ai-studio-prodxpos-069bc919-d8b1-4f51-9f13-c61a86822990',
            verifiedCollections: ['audit_logs', 'AppErrorLog', 'organizations', 'diagnostic_logs'],
            verificationMode: 'rest_probe',
          },
        },
        summary: 'All backend services operational (Cloud SQL & Firestore ping succeeded).',
      }),
    } as any;
  };

  try {
    const result = await utility.executePing();
    assert.equal(result.statusCode, 200);
    assert.equal(result.status, 'HEALTHY');
    assert.equal(result.services.cloudSql.projectId, 'wcyqyiewbzpmrekoljfw');
    assert.equal(result.services.firestore.databaseId, 'retired');
    assert.equal(result.services.firestore.status, 'disabled');
    assert.deepEqual(result.services.firestore.verifiedCollections, []);
    assert.ok(result.rawJson.includes('"statusCode": 200'));
    assert.ok(result.rawJson.includes('"status": "HEALTHY"'));

    // Verify subscription
    let notified = false;
    const unsub = utility.subscribe((updated) => {
      if (updated.statusCode === 200) notified = true;
    });
    assert.equal(notified, true);
    unsub();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('SystemHealthCheckUtility reports DOWN when Supabase PostgreSQL is down and Firestore is retired', async () => {
  const utility = SystemHealthCheckUtility.getInstance();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return {
      status: 207,
      json: async () => ({
        success: true,
        statusCode: 207,
        status: 'DEGRADED',
        timestamp: new Date().toISOString(),
        requestId: 'test-shc-degraded',
        totalDurationMs: 25.1,
        environment: {
          nodeEnv: 'test',
          appletId: '069bc919-d8b1-4f51-9f13-c61a86822990',
          region: 'asia-southeast1',
          cloudSqlProject: 'gen-lang-client-0282713343',
          firestoreDatabaseId: 'ai-studio-prodxpos-069bc919-d8b1-4f51-9f13-c61a86822990',
        },
        services: {
          cloudSql: {
            service: 'Google Cloud SQL (PostgreSQL)',
            statusCode: 503,
            status: 'unreachable',
            latencyMs: 15.0,
            engine: 'PostgreSQL 16 (Google Cloud SQL)',
            region: 'asia-southeast1',
            projectId: 'gen-lang-client-0282713343',
            database: 'prodx_pos',
            error: 'Connection refused',
          },
          firestore: {
            service: 'Google Cloud Firestore',
            statusCode: 200,
            status: 'connected',
            latencyMs: 10.1,
            databaseId: 'ai-studio-prodxpos-069bc919-d8b1-4f51-9f13-c61a86822990',
            projectId: 'modified-bit-mct7q',
            region: 'asia-southeast1',
            endpoint: 'projects/modified-bit-mct7q/databases/ai-studio-prodxpos-069bc919-d8b1-4f51-9f13-c61a86822990',
            verifiedCollections: ['audit_logs', 'AppErrorLog'],
            verificationMode: 'rest_probe',
          },
        },
        summary: 'Degraded state: Firestore is operational, but Cloud SQL returned an error.',
      }),
    } as any;
  };

  try {
    const result = await utility.executePing();
    assert.equal(result.statusCode, 503);
    assert.equal(result.status, 'DOWN');
    assert.equal(result.services.cloudSql.statusCode, 503);
    assert.equal(result.services.firestore.statusCode, 503);
    assert.equal(result.services.firestore.status, 'disabled');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
