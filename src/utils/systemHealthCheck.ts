import { db } from '../lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

export interface CloudSqlServiceHealth {
  service: string;
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

export interface FirestoreServiceHealth {
  service: string;
  statusCode: number; // 200, 503
  status: 'connected' | 'degraded' | 'unreachable';
  latencyMs: number;
  databaseId: string;
  projectId: string;
  region: string;
  endpoint: string;
  verifiedCollections: string[];
  httpStatus?: number;
  verificationMode: string;
  error?: string;
  clientDirectPingMs?: number;
  clientDirectStatus?: 'verified' | 'offline' | 'skipped';
}

export interface SystemHealthCheckResult {
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
    cloudSql: CloudSqlServiceHealth;
    firestore: FirestoreServiceHealth;
  };
  diagnostics: {
    clientOnline: boolean;
    uptimeSeconds?: number;
    memoryUsageMb?: number;
    roundTripNetworkMs: number;
  };
  summary: string;
  rawJson: string;
}

export class SystemHealthCheckUtility {
  private static instance: SystemHealthCheckUtility;
  private lastResult: SystemHealthCheckResult | null = null;
  private listeners: Set<(result: SystemHealthCheckResult) => void> = new Set();
  private autoPingTimer: ReturnType<typeof setInterval> | null = null;

  public static getInstance(): SystemHealthCheckUtility {
    if (!SystemHealthCheckUtility.instance) {
      SystemHealthCheckUtility.instance = new SystemHealthCheckUtility();
    }
    return SystemHealthCheckUtility.instance;
  }

  /**
   * Performs an end-to-end ping of backend services (Cloud SQL and Firestore)
   * and returns a status-coded JSON object.
   */
  public async executePing(options?: {
    skipClientFirestoreProbe?: boolean;
    timeoutMs?: number;
  }): Promise<SystemHealthCheckResult> {
    const started = performance.now();
    const requestId = `shc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timeout = options?.timeoutMs ?? 10000;

    // 1. Direct browser-to-Firestore probe (optional client telemetry)
    let clientFirestoreLatencyMs: number | undefined;
    let clientFirestoreStatus: 'verified' | 'offline' | 'skipped' = 'skipped';

    if (!options?.skipClientFirestoreProbe && typeof window !== 'undefined') {
      const clientProbeStart = performance.now();
      try {
        const probeDocRef = doc(db, 'organizations', 'connection-check');
        await Promise.race([
          getDocFromServer(probeDocRef),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore probe timeout')), 4000)),
        ]);
        clientFirestoreLatencyMs = Number((performance.now() - clientProbeStart).toFixed(1));
        clientFirestoreStatus = 'verified';
      } catch (err: unknown) {
        clientFirestoreLatencyMs = Number((performance.now() - clientProbeStart).toFixed(1));
        // A permission error or document not found still verifies that Firestore server accepted the request!
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('permission-denied') || message.includes('not-found') || message.includes('Missing or insufficient permissions')) {
          clientFirestoreStatus = 'verified';
        } else {
          clientFirestoreStatus = 'offline';
        }
      }
    }

    // 2. Ping backend system-health-check endpoint (Cloud SQL + Firestore Backend Probe)
    let backendPayload: any = null;
    let backendStatusCode = 503;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const resp = await fetch('/api/v1/infrastructure/system-health-check', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-request-id': requestId,
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      backendStatusCode = resp.status;
      backendPayload = await resp.json().catch(() => null);
    } catch (err: unknown) {
      console.warn('[SystemHealthCheck] Backend endpoint unreachable:', err);
    }

    const roundTripNetworkMs = Number((performance.now() - started).toFixed(1));

    // 3. Fallback synthesis if server is completely unreachable
    let cloudSqlHealth: CloudSqlServiceHealth;
    let firestoreHealth: FirestoreServiceHealth;
    let finalStatusCode: 200 | 207 | 503 = 503;
    let finalStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN' = 'DOWN';
    let summary = '';

    if (backendPayload && backendPayload.services) {
      cloudSqlHealth = backendPayload.services.cloudSql;
      firestoreHealth = {
        ...backendPayload.services.firestore,
        clientDirectPingMs: clientFirestoreLatencyMs,
        clientDirectStatus: clientFirestoreStatus,
      };
      finalStatusCode = backendPayload.statusCode || (backendStatusCode as any) || 200;
      finalStatus = backendPayload.status || (finalStatusCode === 200 ? 'HEALTHY' : finalStatusCode === 207 ? 'DEGRADED' : 'DOWN');
      summary = backendPayload.summary || 'Backend health status retrieved successfully.';
    } else {
      // Server down or offline fallback
      cloudSqlHealth = {
        service: 'Google Cloud SQL (PostgreSQL)',
        statusCode: 503,
        status: 'unreachable',
        latencyMs: 0,
        engine: 'PostgreSQL 16 (Google Cloud SQL)',
        region: 'asia-southeast1',
        projectId: 'gen-lang-client-0282713343',
        database: 'prodx_pos',
        error: 'Backend API service is unreachable or dev server not responding.',
      };

      firestoreHealth = {
        service: 'Google Cloud Firestore',
        statusCode: clientFirestoreStatus === 'verified' ? 200 : 503,
        status: clientFirestoreStatus === 'verified' ? 'connected' : 'unreachable',
        latencyMs: clientFirestoreLatencyMs ?? 0,
        databaseId: 'ai-studio-prodxpos-069bc919-d8b1-4f51-9f13-c61a86822990',
        projectId: 'modified-bit-mct7q',
        region: 'asia-southeast1',
        endpoint: 'projects/modified-bit-mct7q/databases/ai-studio-prodxpos-069bc919-d8b1-4f51-9f13-c61a86822990',
        verifiedCollections: ['audit_logs', 'AppErrorLog', 'organizations', 'diagnostic_logs'],
        verificationMode: 'client_sdk_probe',
        clientDirectPingMs: clientFirestoreLatencyMs,
        clientDirectStatus: clientFirestoreStatus,
      };

      if (firestoreHealth.statusCode === 200) {
        finalStatusCode = 207;
        finalStatus = 'DEGRADED';
        summary = 'Degraded state: Firestore is operational via direct SDK probe, but Cloud SQL backend API is unreachable.';
      } else {
        finalStatusCode = 503;
        finalStatus = 'DOWN';
        summary = 'Critical failure: Both Cloud SQL and Firestore backend probes are unreachable.';
      }
    }

    const result: SystemHealthCheckResult = {
      statusCode: finalStatusCode,
      status: finalStatus,
      timestamp: new Date().toISOString(),
      requestId,
      totalDurationMs: roundTripNetworkMs,
      environment: {
        nodeEnv: backendPayload?.environment?.nodeEnv || 'development',
        appletId: '069bc919-d8b1-4f51-9f13-c61a86822990',
        region: 'asia-southeast1',
        cloudSqlProject: 'gen-lang-client-0282713343',
        firestoreDatabaseId: 'ai-studio-prodxpos-069bc919-d8b1-4f51-9f13-c61a86822990',
      },
      services: {
        cloudSql: cloudSqlHealth,
        firestore: firestoreHealth,
      },
      diagnostics: {
        clientOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        uptimeSeconds: backendPayload?.diagnostics?.uptimeSeconds,
        memoryUsageMb: backendPayload?.diagnostics?.memoryUsageMb,
        roundTripNetworkMs,
      },
      summary,
      rawJson: JSON.stringify(
        {
          statusCode: finalStatusCode,
          status: finalStatus,
          timestamp: new Date().toISOString(),
          requestId,
          totalDurationMs: roundTripNetworkMs,
          environment: {
            appletId: '069bc919-d8b1-4f51-9f13-c61a86822990',
            region: 'asia-southeast1',
            cloudSqlProject: 'gen-lang-client-0282713343',
            firestoreDatabaseId: 'ai-studio-prodxpos-069bc919-d8b1-4f51-9f13-c61a86822990',
          },
          services: {
            cloudSql: cloudSqlHealth,
            firestore: firestoreHealth,
          },
          summary,
        },
        null,
        2
      ),
    };

    this.lastResult = result;
    this.notifyListeners(result);
    return result;
  }

  public getLastResult(): SystemHealthCheckResult | null {
    return this.lastResult;
  }

  public subscribe(callback: (result: SystemHealthCheckResult) => void): () => void {
    this.listeners.add(callback);
    if (this.lastResult) {
      callback(this.lastResult);
    }
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(result: SystemHealthCheckResult): void {
    this.listeners.forEach((cb) => {
      try {
        cb(result);
      } catch (err) {
        console.error('[SystemHealthCheck] Listener error:', err);
      }
    });
  }

  public startAutoPing(intervalSeconds: number = 30): void {
    this.stopAutoPing();
    this.executePing().catch(() => undefined);
    this.autoPingTimer = setInterval(() => {
      this.executePing().catch(() => undefined);
    }, Math.max(5000, intervalSeconds * 1000));
  }

  public stopAutoPing(): void {
    if (this.autoPingTimer) {
      clearInterval(this.autoPingTimer);
      this.autoPingTimer = null;
    }
  }

  public isAutoPingActive(): boolean {
    return this.autoPingTimer !== null;
  }
}

export const systemHealthCheck = SystemHealthCheckUtility.getInstance();
