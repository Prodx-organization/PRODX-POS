export interface PostgresServiceHealth {
  service: string;
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

export interface SystemHealthCheckResult {
  statusCode: 200 | 503;
  status: 'HEALTHY' | 'DOWN';
  timestamp: string;
  requestId: string;
  totalDurationMs: number;
  environment: { nodeEnv: string; databaseTarget: string };
  services: { postgres: PostgresServiceHealth };
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
  private listeners = new Set<(result: SystemHealthCheckResult) => void>();
  private autoPingTimer: ReturnType<typeof setInterval> | null = null;

  public static getInstance(): SystemHealthCheckUtility {
    if (!SystemHealthCheckUtility.instance) {
      SystemHealthCheckUtility.instance = new SystemHealthCheckUtility();
    }
    return SystemHealthCheckUtility.instance;
  }

  public async executePing(options?: { timeoutMs?: number }): Promise<SystemHealthCheckResult> {
    const started = performance.now();
    const requestId = `shc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timeout = options?.timeoutMs ?? 10000;
    let payload: any = null;
    let statusCode: 200 | 503 = 503;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const response = await fetch('/api/v1/infrastructure/system-health-check', {
        method: 'GET',
        headers: { Accept: 'application/json', 'x-request-id': requestId },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      payload = await response.json().catch(() => null);
      statusCode = response.status === 200 && payload?.services?.postgres?.statusCode === 200 ? 200 : 503;
    } catch (error) {
      payload = { error: error instanceof Error ? error.message : String(error) };
    }

    const roundTripNetworkMs = Number((performance.now() - started).toFixed(1));
    const postgres: PostgresServiceHealth = payload?.services?.postgres ?? {
      service: 'PostgreSQL',
      statusCode: 503,
      status: 'unreachable',
      latencyMs: 0,
      engine: 'PostgreSQL',
      database: 'unknown',
      error: payload?.error || 'Backend PostgreSQL health endpoint is unreachable.',
    };
    const result: SystemHealthCheckResult = {
      statusCode,
      status: statusCode === 200 ? 'HEALTHY' : 'DOWN',
      timestamp: new Date().toISOString(),
      requestId,
      totalDurationMs: roundTripNetworkMs,
      environment: {
        nodeEnv: payload?.environment?.nodeEnv || 'unknown',
        databaseTarget: payload?.environment?.databaseTarget || 'unknown',
      },
      services: { postgres },
      diagnostics: {
        clientOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        uptimeSeconds: payload?.diagnostics?.uptimeSeconds,
        memoryUsageMb: payload?.diagnostics?.memoryUsageMb,
        roundTripNetworkMs,
      },
      summary: payload?.summary || (statusCode === 200
        ? 'PostgreSQL query probe succeeded.'
        : 'PostgreSQL health could not be verified.'),
      rawJson: JSON.stringify(payload ?? { error: 'Health endpoint unavailable' }, null, 2),
    };
    this.lastResult = result;
    this.listeners.forEach((listener) => {
      try { listener(result); } catch (error) { console.error('[SystemHealthCheck] Listener error:', error); }
    });
    return result;
  }

  public getLastResult(): SystemHealthCheckResult | null { return this.lastResult; }

  public subscribe(callback: (result: SystemHealthCheckResult) => void): () => void {
    this.listeners.add(callback);
    if (this.lastResult) callback(this.lastResult);
    return () => this.listeners.delete(callback);
  }

  public startAutoPing(intervalSeconds = 30): void {
    this.stopAutoPing();
    void this.executePing();
    this.autoPingTimer = setInterval(() => { void this.executePing(); }, Math.max(5000, intervalSeconds * 1000));
  }

  public stopAutoPing(): void {
    if (this.autoPingTimer) clearInterval(this.autoPingTimer);
    this.autoPingTimer = null;
  }

  public isAutoPingActive(): boolean { return this.autoPingTimer !== null; }
}

export const systemHealthCheck = SystemHealthCheckUtility.getInstance();
