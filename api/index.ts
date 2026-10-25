import type { IncomingMessage, ServerResponse } from 'node:http';
import { createProductionApp, createRetryableInitialization } from '../server-bundle.js';

type VercelRequest = IncomingMessage & {
  headers: IncomingMessage['headers'];
};

const getVercelOidcToken = (request: VercelRequest): string | undefined => {
  const value = request.headers['x-vercel-oidc-token'];
  return Array.isArray(value) ? value[0] : value;
};

const initializeProductionApp = createRetryableInitialization((request: VercelRequest) =>
  createProductionApp({
    vercelOidcToken: getVercelOidcToken(request),
  }),
);

export default async function handler(request: VercelRequest, response: ServerResponse): Promise<void> {
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
