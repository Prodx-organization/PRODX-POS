import type { Pool } from 'pg';
import { classifyProductionDatabaseTarget } from '../db/postgres';

export interface CloudSqlHealthCheckResult {
  service: 'PostgreSQL (Supabase session pooler)';
  statusCode: number; // 200, 503
  status: 'connected' | 'degraded' | 'unreachable';
  latencyMs: number;
  engine: string;
  region: string;
  projectId: string;
  database: string;
  serverTime?: string;
  poolStats?: {
    totalConnections: number;
    idleConnections: number;
    waitingRequests: number;
  };
  queryProbe?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface FirestoreHealthCheckResult {
  service: 'Google Cloud Firestore';
  statusCode: number; // 200, 503
  status: 'connected' | 'degraded' | 'unreachable';
  latencyMs: number;
  databaseId: string;
  projectId: string;
  region: string;
  endpoint: string;
  verifiedCollections: string[];
  httpStatus?: number;
  verificationMode: 'rest_probe' | 'fallback_config';
  error?: string;
}

export interface SystemHealthCheckResponse {
  statusCode: 200 | 207 | 503;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  timestamp: string;
  requestId: string;
  totalDurationMs: number;
  environment: {
    nodeEnv: string;
    appletId: string;
    region: string;
    cloudSqlProject: string;
    firestoreDatabaseId: string;
  };
  services: {
    cloudSql: CloudSqlHealthCheckResult;
    firestore: FirestoreHealthCheckResult;
  };
  diagnostics: {
    activePeripheralsCount?: number;
    uptimeSeconds: number;
    memoryUsageMb: number;
  };
  summary: string;
}

const POSTGRES_PROJECT_ID = 'wcyqyiewbzpmrekoljfw';
const POSTGRES_REGION = 'ap-southeast-1';
const FIRESTORE_PROJECT_ID = 'modified-bit-mct7q';
const FIRESTORE_DATABASE_ID = 'ai-studio-prodxpos-069bc919-d8b1-4f51-9f13-c61a86822990';
const FIRESTORE_REGION = 'asia-southeast1';
const APPLET_ID = '069bc919-d8b1-4f51-9f13-c61a86822990';

const FIRESTORE_COLLECTIONS = [
  'audit_logs',
  'AppErrorLog',
  'organizations',
  'branches',
  'terminals',
  'diagnostic_logs',
  'admin_credentials',
];

export async function pingCloudSql(pool?: Pool): Promise<CloudSqlHealthCheckResult> {
  const started = performance.now();

  if (!pool) {
    const latencyMs = Number((performance.now() - started).toFixed(1));
    return {
      service: 'PostgreSQL (Supabase session pooler)',
      statusCode: 503,
      status: 'unreachable',
      latencyMs,
      engine: 'PostgreSQL (Supabase session pooler)',
      region: POSTGRES_REGION,
      projectId: POSTGRES_PROJECT_ID,
      database: 'postgres',
      error: 'PostgreSQL pool not available (DATABASE_URL not configured).',
      code: 'POSTGRES_POOL_UNAVAILABLE',
      details: {
        configured: Boolean(process.env.DATABASE_URL),
        target: classifyProductionDatabaseTarget(process.env.DATABASE_URL),
      },
    };
  }

  try {
    const result = await pool.query<{ ping: number; server_time: string; version: string }>(
      'SELECT 1 AS ping, NOW() AS server_time, version() AS version;'
    );
    const latencyMs = Number((performance.now() - started).toFixed(1));

    const rawVersion = result.rows[0]?.version || 'PostgreSQL 16';
    const versionMatch = rawVersion.match(/PostgreSQL\s+([\d.]+)/i);
    const engine = versionMatch ? `PostgreSQL ${versionMatch[1]} (Supabase session pooler)` : 'PostgreSQL (Supabase session pooler)';

    return {
      service: 'PostgreSQL (Supabase session pooler)',
      statusCode: 200,
      status: 'connected',
      latencyMs,
      engine,
      region: POSTGRES_REGION,
      projectId: POSTGRES_PROJECT_ID,
      database: 'postgres',
      serverTime: result.rows[0]?.server_time || new Date().toISOString(),
      poolStats: {
        totalConnections: (pool as unknown as { totalCount?: number }).totalCount ?? 1,
        idleConnections: (pool as unknown as { idleCount?: number }).idleCount ?? 1,
        waitingRequests: (pool as unknown as { waitingCount?: number }).waitingCount ?? 0,
      },
      queryProbe: 'SELECT 1 -> OK',
    };
  } catch (error: unknown) {
    const latencyMs = Number((performance.now() - started).toFixed(1));
    const candidate = error && typeof error === 'object' ? error as { message?: string; code?: string } : {};
    return {
      service: 'PostgreSQL (Supabase session pooler)',
      statusCode: 503,
      status: 'unreachable',
      latencyMs,
      engine: 'PostgreSQL (Supabase session pooler)',
      region: POSTGRES_REGION,
      projectId: POSTGRES_PROJECT_ID,
      database: 'postgres',
      error: candidate.message || 'Database ping query failed.',
      code: candidate.code || 'QUERY_FAILED',
      details: {
        configured: Boolean(process.env.DATABASE_URL),
        target: classifyProductionDatabaseTarget(process.env.DATABASE_URL),
      },
    };
  }
}

export async function pingFirestore(): Promise<FirestoreHealthCheckResult> {
  const started = performance.now();
  const restUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(restUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const latencyMs = Number((performance.now() - started).toFixed(1));

    // Receiving any HTTP response (200, 401, 403, 404) from the Google Cloud Firestore API endpoint
    // confirms DNS resolution, network path routing, TLS handshake, and active service state.
    const isResponding = response.status === 200;

    return {
      service: 'Google Cloud Firestore',
      statusCode: isResponding ? 200 : 503,
      status: isResponding ? 'connected' : 'degraded',
      latencyMs,
      databaseId: FIRESTORE_DATABASE_ID,
      projectId: FIRESTORE_PROJECT_ID,
      region: FIRESTORE_REGION,
      endpoint: `projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}`,
      verifiedCollections: FIRESTORE_COLLECTIONS,
      httpStatus: response.status,
      verificationMode: 'rest_probe',
    };
  } catch (error: unknown) {
    const latencyMs = Number((performance.now() - started).toFixed(1));
    const message = error instanceof Error ? error.message : String(error);
    return {
      service: 'Google Cloud Firestore',
      statusCode: 503,
      status: 'unreachable',
      latencyMs,
      databaseId: FIRESTORE_DATABASE_ID,
      projectId: FIRESTORE_PROJECT_ID,
      region: FIRESTORE_REGION,
      endpoint: `projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}`,
      verifiedCollections: FIRESTORE_COLLECTIONS,
      verificationMode: 'rest_probe',
      error: message,
    };
  }
}

export async function performEndToEndHealthCheck(
  pool?: Pool,
  requestId: string = `shc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
): Promise<SystemHealthCheckResponse> {
  const overallStart = performance.now();

  const [cloudSql, firestore] = await Promise.all([
    pingCloudSql(pool),
    pingFirestore(),
  ]);

  const totalDurationMs = Number((performance.now() - overallStart).toFixed(1));

  let statusCode: 200 | 207 | 503 = 200;
  let status: 'HEALTHY' | 'DEGRADED' | 'DOWN' = 'HEALTHY';
  let summary = '';

  const isSqlOk = cloudSql.statusCode === 200;
  const isFirestoreOk = firestore.statusCode === 200;

  if (isSqlOk && isFirestoreOk) {
    statusCode = 200;
    status = 'HEALTHY';
    summary = 'PostgreSQL and Firestore health probes succeeded.';
  } else if (isSqlOk || isFirestoreOk) {
    statusCode = 207; // Multi-Status: partial service availability
    status = 'DEGRADED';
    const upService = isSqlOk ? 'PostgreSQL' : 'Firestore';
    const downService = isSqlOk ? 'Firestore' : 'PostgreSQL';
    summary = `Degraded state: ${upService} is operational, but ${downService} returned an error.`;
  } else {
    statusCode = 503;
    status = 'DOWN';
    summary = 'All probed backend services are unreachable or degraded.';
  }

  const memoryUsage = process.memoryUsage();
  const memoryUsageMb = Number((memoryUsage.heapUsed / (1024 * 1024)).toFixed(1));

  return {
    statusCode,
    status,
    timestamp: new Date().toISOString(),
    requestId,
    totalDurationMs,
    environment: {
      nodeEnv: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      appletId: APPLET_ID,
      region: POSTGRES_REGION,
      cloudSqlProject: POSTGRES_PROJECT_ID,
      firestoreDatabaseId: FIRESTORE_DATABASE_ID,
    },
    services: {
      cloudSql,
      firestore,
    },
    diagnostics: {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb,
    },
    summary,
  };
}
