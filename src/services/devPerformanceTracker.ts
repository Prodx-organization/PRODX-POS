/**
 * PRODX POS - Real-Time Performance & Telemetry Tracker
 * Measures FPS, Database / API Latency, Memory Usage, and Event Loop Lag.
 */

export interface DbOperationLog {
  id: string;
  name: string;
  category: 'IndexedDB' | 'LocalStorage' | 'API' | 'Sync';
  durationMs: number;
  timestamp: number;
  success: boolean;
  sizeBytes?: number;
  details?: string;
}

export interface FpsMetricSample {
  timestamp: number;
  fps: number;
  frameTimeMs: number;
}

export interface MemoryMetricSample {
  timestamp: number;
  usedHeapMb: number;
  totalHeapMb: number;
  heapLimitMb: number;
}

type PerformanceListener = () => void;

class DevPerformanceTracker {
  private static instance: DevPerformanceTracker;

  private dbLogs: DbOperationLog[] = [];
  private maxDbLogs = 100;

  private fpsHistory: FpsMetricSample[] = [];
  private maxFpsSamples = 60;

  private memoryHistory: MemoryMetricSample[] = [];
  private maxMemorySamples = 30;

  private listeners: Set<PerformanceListener> = new Set();

  private isRunning = false;
  private animFrameId: number | null = null;
  private memoryIntervalId: number | null = null;

  private lastFrameTime = performance.now();
  private frameCount = 0;
  private lastFpsCalcTime = performance.now();
  private currentFps = 60;
  private currentFrameTimeMs = 16.6;
  private droppedFramesCount = 0;

  private eventLoopLagMs = 0;

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): DevPerformanceTracker {
    if (!DevPerformanceTracker.instance) {
      DevPerformanceTracker.instance = new DevPerformanceTracker();
    }
    return DevPerformanceTracker.instance;
  }

  public subscribe(listener: PerformanceListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Starts frame loop and memory telemetry intervals
   */
  public startMonitoring() {
    if (this.isRunning) return;

    // This tracker may be imported by Node-based tests. Keep browser-only
    // telemetry dormant unless the required browser APIs are available.
    if (
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function' ||
      typeof window.setInterval !== 'function'
    ) {
      return;
    }

    this.isRunning = true;

    // Frame Rate Loop using requestAnimationFrame
    const tick = (now: number) => {
      if (!this.isRunning) return;

      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.frameCount++;

      if (delta > 32) {
        // Delta > 32ms means frame took >2 ticks at 60Hz (~dropped frame)
        this.droppedFramesCount++;
      }

      // Update FPS every 500ms
      if (now - this.lastFpsCalcTime >= 500) {
        const timeDiff = now - this.lastFpsCalcTime;
        this.currentFps = Math.min(120, Math.round((this.frameCount * 1000) / timeDiff));
        this.currentFrameTimeMs = parseFloat((timeDiff / this.frameCount).toFixed(1));

        this.fpsHistory.push({
          timestamp: now,
          fps: this.currentFps,
          frameTimeMs: this.currentFrameTimeMs,
        });

        if (this.fpsHistory.length > this.maxFpsSamples) {
          this.fpsHistory.shift();
        }

        this.frameCount = 0;
        this.lastFpsCalcTime = now;

        // Measure event loop lag
        const expectedTime = now + 100;
        setTimeout(() => {
          const actualTime = performance.now();
          this.eventLoopLagMs = Math.max(0, parseFloat((actualTime - expectedTime).toFixed(1)));
          this.notifyListeners();
        }, 100);
      }

      this.animFrameId = window.requestAnimationFrame(tick);
    };

    this.animFrameId = window.requestAnimationFrame(tick);

    // Memory Telemetry Interval
    this.sampleMemory();
    this.memoryIntervalId = window.setInterval(() => {
      this.sampleMemory();
    }, 2000);
  }

  private sampleMemory() {
    if (typeof window === 'undefined') return;

    const perf = window.performance as any;
    let usedMb = 0;
    let totalMb = 0;
    let limitMb = 0;

    if (perf && perf.memory) {
      usedMb = parseFloat((perf.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1));
      totalMb = parseFloat((perf.memory.totalJSHeapSize / (1024 * 1024)).toFixed(1));
      limitMb = parseFloat((perf.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(1));
    } else {
      // Fallback estimate based on DOM element count & heuristics
      const domNodes = document.querySelectorAll('*').length;
      usedMb = parseFloat((25 + domNodes * 0.015).toFixed(1));
      totalMb = parseFloat((usedMb * 1.5).toFixed(1));
      limitMb = 2048;
    }

    this.memoryHistory.push({
      timestamp: Date.now(),
      usedHeapMb: usedMb,
      totalHeapMb: totalMb,
      heapLimitMb: limitMb,
    });

    if (this.memoryHistory.length > this.maxMemorySamples) {
      this.memoryHistory.shift();
    }

    this.notifyListeners();
  }

  /**
   * Log an API / Database operation duration
   */
  public recordDbOp(op: Omit<DbOperationLog, 'id' | 'timestamp'>) {
    const entry: DbOperationLog = {
      ...op,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };

    this.dbLogs.unshift(entry);
    if (this.dbLogs.length > this.maxDbLogs) {
      this.dbLogs.pop();
    }

    this.notifyListeners();
  }

  /**
   * Wraps an async DB or API function call to automatically measure latency
   */
  public async measureDbOp<T>(
    name: string,
    category: 'IndexedDB' | 'LocalStorage' | 'API' | 'Sync',
    fn: () => Promise<T>,
    details?: string
  ): Promise<T> {
    const start = performance.now();
    let success = true;
    try {
      const result = await fn();
      const durationMs = parseFloat((performance.now() - start).toFixed(2));
      let sizeBytes: number | undefined = undefined;

      if (Array.isArray(result)) {
        sizeBytes = result.length;
      }

      this.recordDbOp({
        name,
        category,
        durationMs,
        success: true,
        sizeBytes,
        details,
      });

      return result;
    } catch (err) {
      const durationMs = parseFloat((performance.now() - start).toFixed(2));
      this.recordDbOp({
        name,
        category,
        durationMs,
        success: false,
        details: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Run interactive database benchmarks
   */
  public async runDbBenchmark(): Promise<{
    readAvgMs: number;
    writeAvgMs: number;
    p95Ms: number;
    operationsCount: number;
  }> {
    const startOverall = performance.now();
    const readDurations: number[] = [];
    const writeDurations: number[] = [];

    // Test LocalStorage Write/Read benchmark
    for (let i = 0; i < 20; i++) {
      const testKey = `__prodx_bench_${i}`;
      const payload = JSON.stringify({ id: i, data: 'x'.repeat(1000), ts: Date.now() });

      const wStart = performance.now();
      localStorage.setItem(testKey, payload);
      const wDur = performance.now() - wStart;
      writeDurations.push(wDur);

      const rStart = performance.now();
      localStorage.getItem(testKey);
      const rDur = performance.now() - rStart;
      readDurations.push(rDur);

      localStorage.removeItem(testKey);
    }

    // Record total benchmark execution as a DB telemetry event
    const totalMs = parseFloat((performance.now() - startOverall).toFixed(2));
    const allDurations = [...readDurations, ...writeDurations].sort((a, b) => a - b);
    const readAvgMs = parseFloat((readDurations.reduce((a, b) => a + b, 0) / readDurations.length).toFixed(2));
    const writeAvgMs = parseFloat((writeDurations.reduce((a, b) => a + b, 0) / writeDurations.length).toFixed(2));
    const p95Idx = Math.floor(allDurations.length * 0.95);
    const p95Ms = parseFloat((allDurations[p95Idx] || 0).toFixed(2));

    this.recordDbOp({
      name: 'Benchmark DB Stress Test (40 Ops)',
      category: 'IndexedDB',
      durationMs: totalMs,
      success: true,
      details: `Read Avg: ${readAvgMs}ms | Write Avg: ${writeAvgMs}ms | P95: ${p95Ms}ms`,
    });

    return {
      readAvgMs,
      writeAvgMs,
      p95Ms,
      operationsCount: 40,
    };
  }

  /**
   * Clear all telemetry logs
   */
  public clearLogs() {
    this.dbLogs = [];
    this.droppedFramesCount = 0;
    this.notifyListeners();
  }

  // Getters
  public getFpsData() {
    const fpsValues = this.fpsHistory.map((s) => s.fps);
    const avgFps = fpsValues.length
      ? Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length)
      : this.currentFps;
    const minFps = fpsValues.length ? Math.min(...fpsValues) : this.currentFps;
    const maxFps = fpsValues.length ? Math.max(...fpsValues) : this.currentFps;

    return {
      currentFps: this.currentFps,
      frameTimeMs: this.currentFrameTimeMs,
      avgFps,
      minFps,
      maxFps,
      droppedFrames: this.droppedFramesCount,
      history: this.fpsHistory,
      eventLoopLagMs: this.eventLoopLagMs,
    };
  }

  public getDbData() {
    const durations = this.dbLogs.map((l) => l.durationMs).sort((a, b) => a - b);
    const totalCount = this.dbLogs.length;
    const errorCount = this.dbLogs.filter((l) => !l.success).length;

    const avgMs = totalCount
      ? parseFloat((this.dbLogs.reduce((acc, l) => acc + l.durationMs, 0) / totalCount).toFixed(2))
      : 0;
    const p95Idx = Math.floor(durations.length * 0.95);
    const p95Ms = durations.length ? parseFloat(durations[p95Idx].toFixed(2)) : 0;
    const lastOp = this.dbLogs[0];

    return {
      lastMs: lastOp ? lastOp.durationMs : 0,
      avgMs,
      p95Ms,
      totalCount,
      errorCount,
      logs: this.dbLogs,
    };
  }

  public getMemoryData() {
    const lastSample = this.memoryHistory[this.memoryHistory.length - 1];
    const perf = typeof window !== 'undefined' ? (window.performance as any) : null;
    const hasNativeMemory = !!(perf && perf.memory);

    const domNodes = typeof document !== 'undefined' ? document.querySelectorAll('*').length : 0;

    return {
      hasNativeMemory,
      usedHeapMb: lastSample ? lastSample.usedHeapMb : 0,
      totalHeapMb: lastSample ? lastSample.totalHeapMb : 0,
      heapLimitMb: lastSample ? lastSample.heapLimitMb : 2048,
      domNodesCount: domNodes,
      history: this.memoryHistory,
    };
  }
}

export const devPerformanceTracker = DevPerformanceTracker.getInstance();
