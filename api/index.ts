import type { IncomingMessage, ServerResponse } from 'node:http';
import { createProductionApp, createRetryableInitialization } from '../server-bundle.js';

// In Vercel Functions, the platform injects the current OIDC token into this request header
// (and replaces client-supplied values). Prefer it over a build-time/environment snapshot so
// runtime authentication uses a current token. Outside production, retain env-based local tooling.
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
