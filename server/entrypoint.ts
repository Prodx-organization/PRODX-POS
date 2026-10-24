import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createPostgresAuthentication } from './auth/composition.ts';
import { createPostgresAuthorization } from './auth/production-authorization.ts';
import { asSqlExecutor, createProductionPostgresPool, resolveConfiguredDatabaseUrl } from './db/postgres.ts';
import { getOwnerPostgresPool } from './db/owner-postgres.ts';
import { createTransactionalPostgresExecutor } from './db/transaction.ts';
import { createAIGatewayService } from './ai/production-composition.ts';
import { pingFirestore } from './services/systemHealthCheckService.ts';
import { registerCheckoutRoute } from './http/checkout-route.ts';
import { registerAuthRoutes } from './http/auth-route.ts';
import { registerOwnerSessionRoute } from './http/owner-session-route.ts';
import { createApp } from './http/createApp.ts';
import { registerRefundRoute } from './http/refund-route.ts';
import { registerAuditRoute } from './http/audit-route.ts';
import { registerShiftRoute } from './http/shift-route.ts';
import { registerTimeclockRoute } from './http/timeclock-route.ts';
import { registerCatalogRoute } from './http/catalog-route.ts';
import { registerCatalogImportRoute } from './http/catalog-import-route.ts';
import { registerCatalogPricingRoute } from './http/catalog-pricing-route.ts';
import { registerPaymentLifecycleRoute } from './http/payment-lifecycle-route.ts';
import { registerSyncRoute } from './http/sync-route.ts';
import { registerSupervisorAuthorizationRoute } from './http/supervisor-authorization-route.ts';
import { registerOrderReadRoute } from './http/order-read-route.ts';
import { registerVoidRoute } from './http/void-route.ts';
import { registerInventoryAdjustmentRoute } from './http/inventory-adjustment-route.ts';
import { registerInfrastructureRoutes, registerPublicInfrastructureRoutes } from './http/infrastructureRoutes.ts';
import { installAIHttpRoute } from './ai/http-route.ts';

export type ProductionAppOptions = { vercelOidcToken?: string };

export const createProductionApp = async (options: ProductionAppOptions = {}) => {
  const pool = await createProductionPostgresPool({}, options.vercelOidcToken);
  const sql = asSqlExecutor(pool);
  const transactions = createTransactionalPostgresExecutor(pool);
  const sessions = createPostgresAuthentication(sql);
  const authorize = createPostgresAuthorization(sql);
  const aiGateway = createAIGatewayService(sql, authorize);

  const app = createApp({
    readinessCheck: async () => {
      let postgresOk = false;
      let firestoreOk = false;
      let postgresError: any = null;
      let firestoreError: any = null;
      const connectionString = resolveConfiguredDatabaseUrl();
      if (connectionString) {
        try {
          await sql.query<{ ok: number }>('SELECT 1 AS ok');
          postgresOk = true;
        } catch (error: unknown) { postgresError = error; }
      }
      try {
        const firestoreResult = await pingFirestore();
        firestoreOk = firestoreResult.statusCode === 200;
      } catch (error: unknown) { firestoreError = error; }
      if (!postgresOk && !firestoreOk) {
        const error = new Error('Database readiness check failed: Both PostgreSQL and Firestore are unreachable.');
        Object.assign(error, {
          postgres: postgresError ? { code: postgresError.code, syscall: postgresError.syscall } : 'unconfigured',
          firestore: firestoreError ? { message: firestoreError.message } : 'failed',
        });
        throw error;
      }
      if (!postgresOk) console.warn('PRODX POS starting in DEGRADED mode (PostgreSQL unreachable, Firestore OK).');
      else if (!firestoreOk) console.warn('PRODX POS starting in DEGRADED mode (Firestore unreachable, PostgreSQL OK).');
    },
    configurePublicRoutes: (configuredApp) => {
      registerAuthRoutes(configuredApp, sql, sessions);
      registerPublicInfrastructureRoutes(configuredApp, pool);
      registerOwnerSessionRoute(configuredApp, { getRole: async (userId) => {
        const result = await getOwnerPostgresPool().query<{ role: string }>(
          'SELECT role FROM public.user_roles WHERE user_id = $1 LIMIT 1',
          [userId],
        );
        return result.rows[0]?.role ?? null;
      } });
    },
    authenticateRequest: async (request) => {
      const header = request.header('authorization');
      if (!header?.startsWith('Bearer ')) return null;
      return sessions.authenticateBearer(header.slice('Bearer '.length).trim());
    },
    authorizeRequest: authorize,
    configureRoutes: (configuredApp) => {
      registerAuditRoute(configuredApp, transactions);
      registerShiftRoute(configuredApp, transactions);
      registerTimeclockRoute(configuredApp, transactions);
      registerCheckoutRoute(configuredApp, transactions);
      registerRefundRoute(configuredApp, transactions);
      registerCatalogRoute(configuredApp, transactions);
      registerCatalogImportRoute(configuredApp, transactions);
      registerCatalogPricingRoute(configuredApp, transactions);
      registerPaymentLifecycleRoute(configuredApp, transactions);
      registerSyncRoute(configuredApp, transactions);
      registerSupervisorAuthorizationRoute(configuredApp, transactions);
      registerOrderReadRoute(configuredApp, transactions);
      registerVoidRoute(configuredApp, transactions);
      registerInventoryAdjustmentRoute(configuredApp, transactions);
      registerInfrastructureRoutes(configuredApp, pool);
      const aiRouter = express.Router();
      installAIHttpRoute(aiRouter, { gateway: aiGateway });
      configuredApp.use('/api/v1/ai', aiRouter);
    },
  });
  return { app, pool };
};

export const startProductionServer = async (): Promise<void> => {
  const { app, pool } = await createProductionApp();
  const host = process.env.HOST ?? '0.0.0.0';
  const port = Number.parseInt(process.env.PORT ?? '4000', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
  const server = app.listen(port, host, () => console.log(`PRODX POS backend listening on ${host}:${port}`));
  const shutdown = async (signal: string) => {
    server.close(async () => {
      await pool.end();
      await (async () => { const ownerPool = getOwnerPostgresPool(); await ownerPool.end().catch(() => undefined); })();
      console.log(`PRODX POS backend stopped after ${signal}`);
    });
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await startProductionServer();
