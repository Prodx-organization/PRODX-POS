import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './createApp';

const start = async (app: ReturnType<typeof createApp>) => {
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
};

test('readiness logs only safe dependency diagnostics and the request id', async () => {
  const logs: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    logs.push(args);
  };

  const app = createApp({
    authenticateRequest: () => null,
    readinessCheck: async () => {
      const error = new Error('postgres://user:secret@example.invalid/prodx');
      Object.assign(error, { code: 'ECONNREFUSED' });
      throw error;
    },
  });
  const server = await start(app);

  try {
    const response = await fetch(server.baseUrl + '/api/v1/readyz', {
      headers: { 'x-request-id': 'readyz-safe-log-001' },
    });

    assert.equal(response.status, 503);
    assert.deepEqual(logs, [[
      'PRODX readiness check failed',
      {
        requestId: 'readyz-safe-log-001',
        name: 'Error',
        code: 'ECONNREFUSED',
      },
    ]]);
    assert.equal(JSON.stringify(logs).includes('postgres://user:secret'), false);
  } finally {
    await server.close();
    console.error = originalError;
  }
});
