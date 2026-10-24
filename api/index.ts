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
      const initialization = createProductionApp({
        vercelOidcToken: getVercelOidcToken(request),
      });
      appPromise = initialization.catch((error: unknown) => {
        // Do not pin a rejected initialization promise for the lifetime of a
        // serverless instance. A later request must be able to retry startup.
        appPromise = undefined;
        throw error;
      });
    }

    const { app } = await appPromise;
    app(request as never, response as never);
  } catch {
    // Also reset if a future refactor introduces an error after initialization.
    // Resetting an already-resolved promise here would force needless cold starts,
    // so only clear a promise that has not completed successfully.
    if (appPromise) {
      appPromise = undefined;
    }
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
