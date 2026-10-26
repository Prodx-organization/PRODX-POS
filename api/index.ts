import type { IncomingMessage, ServerResponse } from 'node:http';
import { createProductionApp, createRetryableInitialization } from '../server-bundle.js';

// Vercel injects and refreshes this runtime OIDC token. Never trust a caller-controlled
// request header for service-to-service credentials: external clients can forge headers.
const initializeProductionApp = createRetryableInitialization(() =>
  createProductionApp({
    vercelOidcToken: process.env.VERCEL_OIDC_TOKEN,
  }),
);

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const { app } = await initializeProductionApp();
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
