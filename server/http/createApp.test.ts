import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, requirePermission } from './createApp';

const principal = {
  userId: 'user-1',
  organizationId: 'org-1',
  storeId: 'store-1',
};

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

test('rejects requests when backend authentication does not produce a verified principal', async () => {
  const app = createApp({ authenticateRequest: () => null });
  const server = await start(app);

  try {
    const response = await fetch(`${server.baseUrl}/api/v1/health`);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('x-request-id')?.length, 36);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required.',
        requestId: response.headers.get('x-request-id'),
      },
    });
  } finally {
    await server.close();
  }
});

test('exposes unauthenticated liveness and readiness boundaries', async () => {
  const app = createApp({ authenticateRequest: () => null });
  const server = await start(app);

  try {
    const liveness = await fetch(server.baseUrl + '/api/v1/healthz');
    assert.equal(liveness.status, 200);
    assert.deepEqual(await liveness.json(), { status: 'ok' });

    const readiness = await fetch(server.baseUrl + '/api/v1/readyz');
    assert.equal(readiness.status, 503);
    assert.equal((await readiness.json()).error.code, 'READINESS_NOT_CONFIGURED');
  } finally {
    await server.close();
  }
});

test('readiness reports database dependency failures without authentication', async () => {
  const app = createApp({
    authenticateRequest: () => null,
    readinessCheck: async () => {
      throw new Error('database unavailable');
    },
  });
  const server = await start(app);

  try {
    const response = await fetch(server.baseUrl + '/api/v1/readyz');
    assert.equal(response.status, 503);
    assert.deepEqual((await response.json()).error.code, 'NOT_READY');
  } finally {
    await server.close();
  }
});

test('readiness succeeds when the production dependency check succeeds', async () => {
  let checks = 0;
  const app = createApp({
    authenticateRequest: () => null,
    readinessCheck: async () => {
      checks += 1;
    },
  });
  const server = await start(app);

  try {
    const response = await fetch(server.baseUrl + '/api/v1/readyz');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ready' });
    assert.equal(checks, 1);
  } finally {
    await server.close();
  }
});

test('attaches verified principal and correlation id before application routes', async () => {
  const app = createApp({
    authenticateRequest: () => principal,
    configureRoutes: (configuredApp) => {
      configuredApp.get('/api/v1/context', (request, response) => {
        response.json(request.prodxContext);
      });
    },
  });
  const server = await start(app);

  try {
    const response = await fetch(`${server.baseUrl}/api/v1/context`, {
      headers: { 'x-request-id': 'owner-test-001' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-request-id'), 'owner-test-001');
    assert.deepEqual(await response.json(), {
      requestId: 'owner-test-001',
      principal,
    });
  } finally {
    await server.close();
  }
});

test('authorization is explicit and evaluated after authentication', async () => {
  let seenContext: unknown;
  let seenPermission = '';
  const app = createApp({
    authenticateRequest: () => principal,
    authorizeRequest: (context, permission) => {
      seenContext = context;
      seenPermission = permission;
      return permission === 'catalog:read';
    },
    configureRoutes: (configuredApp) => {
      configuredApp.get('/api/v1/protected', requirePermission('catalog:read'), (_request, response) => {
        response.json({ ok: true });
      });
    },
  });
  const server = await start(app);

  try {
    const allowed = await fetch(`${server.baseUrl}/api/v1/protected`);
    assert.equal(allowed.status, 200);
    assert.deepEqual(seenContext, {
      requestId: allowed.headers.get('x-request-id'),
      principal,
    });
    assert.equal(seenPermission, 'catalog:read');

    const deniedApp = createApp({
      authenticateRequest: () => principal,
      authorizeRequest: () => false,
      configureRoutes: (configuredApp) => {
        configuredApp.get('/api/v1/protected', requirePermission('catalog:write'), (_request, response) => {
          response.json({ ok: true });
        });
      },
    });
    const deniedServer = await start(deniedApp);
    try {
      const denied = await fetch(`${deniedServer.baseUrl}/api/v1/protected`);
      assert.equal(denied.status, 403);
      assert.equal((await denied.json()).error.code, 'FORBIDDEN');
    } finally {
      await deniedServer.close();
    }
  } finally {
    await server.close();
  }
});
