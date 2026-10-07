import type { IncomingMessage, ServerResponse } from 'node:http';
import { createProductionApp } from '../server-bundle.js';

type VercelRequest = IncomingMessage & {
  headers: IncomingMessage['headers'];
};

let appPromise: ReturnType<typeof createProductionApp> | undefined;

const getVercelOidcToken = (request: VercelRequest): string | undefined => {
  const value = request.headers['x-vercel-oidc-token'];
  return Array.isArray(value) ? value[0] : value;
};

export default async function handler(request: VercelRequest, response: ServerResponse): Promise<void> {
  try {
    if (!appPromise) {
      appPromise = createProductionApp({
        vercelOidcToken: getVercelOidcToken(request),
      });
    }

    const { app } = await appPromise;
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
