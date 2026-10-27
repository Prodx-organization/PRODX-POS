import type { Pool } from 'pg';
import { classifyProductionDatabaseTarget } from '../db/postgres';

export interface PostgresHealthCheckResult {
  service: 'PostgreSQL';
  statusCode: 200 | 503;
  status: 'connected' | 'unreachable';
  latencyMs: number;
  engine: string;
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

export interface SystemHealthCheckResponse {
  statusCode: 200 | 503;
  status: 'HEALTHY' | 'DOWN';
  timestamp: string;
  requestId: string;
  totalDurationMs: number;
  environment: {
    nodeEnv: string;
    databaseTarget: string;
  };
  services: { postgres: PostgresHealthCheckResult };
  diagnostics: {
    uptimeSeconds: number;
    memoryUsageMb: number;
  };
  summary: string;
}

export async function pingPostgres(pool?: Pool): Promise<PostgresHealthCheckResult> {
  const started = performance.now();
  if (!pool) {
    return {
      service: 'PostgreSQL', statusCode: 503, status: 'unreachable',
      latencyMs: Number((performance.now() - started).toFixed(1)),
      engine: 'PostgreSQL', database: 'unknown',
      error: 'PostgreSQL pool not available (DATABASE_URL not configured).',
      code: 'DATABASE_URL_MISSING',
      details: {
        configured: Boolean(process.env.DATABASE_URL),
        target: classifyProductionDatabaseTarget(process.env.DATABASE_URL),
      },
    };
  }

  try {
    const result = await pool.query<{
      ping: number; server_time: string; version: string; database_name: string;
    }>('SELECT 1 AS ping, NOW() AS server_time, version() AS version, current_database() AS database_name');
    const latencyMs = Number((performance.now() - started).toFixed(1));
    const rawVersion = result.rows[0]?.version || 'PostgreSQL';
    const versionMatch = rawVersion.match(/PostgreSQL\s+([\d.]+)/i);
    return {
      service: 'PostgreSQL', statusCode: 200, status: 'connected', latencyMs,
      engine: versionMatch ? `PostgreSQL ${versionMatch[1]}` : 'PostgreSQL',
      database: result.rows[0]?.database_name || 'unknown',
      serverTime: result.rows[0]?.server_time || new Date().toISOString(),
      poolStats: {
        totalConnections: (pool as unknown as { totalCount?: number }).totalCount ?? 1,
        idleConnections: (pool as unknown as { idleCount?: number }).idleCount ?? 1,
        waitingRequests: (pool as unknown as { waitingCount?: number }).waitingCount ?? 0,
      },
      queryProbe: 'SELECT 1 -> OK',
    };
  } catch (error: unknown) {
    const candidate = error && typeof error === 'object'
      ? error as { message?: string; code?: string }
      : {};
    return {
      service: 'PostgreSQL', statusCode: 503, status: 'unreachable',
      latencyMs: Number((performance.now() - started).toFixed(1)),
      engine: 'PostgreSQL', database: 'unknown',
      error: candidate.message || 'Database ping query failed.',
      code: candidate.code || 'QUERY_FAILED',
      details: {
        configured: Boolean(process.env.DATABASE_URL),
        target: classifyProductionDatabaseTarget(process.env.DATABASE_URL),
      },
    };
  }
}

export async function performEndToEndHealthCheck(
  pool?: Pool,
  requestId: string = `shc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
): Promise<SystemHealthCheckResponse> {
  const overallStart = performance.now();
  const postgres = await pingPostgres(pool);
  const totalDurationMs = Number((performance.now() - overallStart).toFixed(1));
  const memoryUsageMb = Number((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(1));
  const healthy = postgres.statusCode === 200;
  return {
    statusCode: healthy ? 200 : 503,
    status: healthy ? 'HEALTHY' : 'DOWN',
    timestamp: new Date().toISOString(), requestId, totalDurationMs,
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      databaseTarget: classifyProductionDatabaseTarget(process.env.DATABASE_URL),
    },
    services: { postgres },
    diagnostics: { uptimeSeconds: Math.floor(process.uptime()), memoryUsageMb },
    summary: healthy ? 'PostgreSQL query probe succeeded.' : 'PostgreSQL query probe failed.',
  };
}
