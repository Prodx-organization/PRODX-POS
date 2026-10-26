import type { IncomingMessage, ServerResponse } from 'node:http';
import { createProductionApp, createRetryableInitialization } from '../server-bundle.js';

// Vercel Functions inject the current workload OIDC token into this request header and replace
// client-supplied values. Prefer the request-scoped token over a build-time snapshot so broker
// authentication uses the token for this invocation. In Vercel production, fail closed if absent.
const getRuntimeOidcToken = (request: IncomingMessage): string | undefined => {
  const tokenHeader = request.headers['x-vercel-oidc-token'];
  if (typeof tokenHeader === 'string' && tokenHeader.trim().length > 0) {
    return tokenHeader.trim();
  }

  if (process.env.VERCEL === '1' && process.env.NODE_ENV === 'production') {
    return undefined;
  }

  return process.env.VERCEL_OIDC_TOKEN;
};

const initializeProductionApp = createRetryableInitialization((request: IncomingMessage) =>
  createProductionApp({
    vercelOidcToken: getRuntimeOidcToken(request),
  }),
);

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const { app } = await initializeProductionApp(request);
    app(request as never, response as never);
  } catch {
    response.statusCode = 503;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      error: {
        code: 'NOT_READY',
        message: 'The service is not ready.',
        requestId: request.headers['x-request-id'] ?? 'unknown',
      },
    }));
  }
}
