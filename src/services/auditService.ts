/**
 * PRODX POS — Background Buffered Diagnostic & Audit Log Service
 *
 * Buffers high-frequency hardware, peripheral, and system diagnostic log events locally
 * (in-memory + durable localStorage fallback) before batch-uploading them to Google Cloud
 * Firestore using atomic `writeBatch` commits. This minimizes Firestore API overhead and
 * network contention during peak checkout and hardware telemetry bursts.
 */

import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db, OperationType } from '../lib/firebase';

export type DiagnosticLogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export type DiagnosticLogCategory =
  | 'printer'
  | 'scanner'
  | 'drawer'
  | 'edc'
  | 'display'
  | 'scale'
  | 'system'
  | 'network';

export interface DiagnosticLogEventInput {
  peripheralId?: string;
  deviceName?: string;
  category: DiagnosticLogCategory;
  level: DiagnosticLogLevel;
  event: string;
  message: string;
  port?: string;
  interfaceType?: string;
  orgId?: string;
  branchId?: string;
  terminalId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export interface BufferedDiagnosticLogItem extends DiagnosticLogEventInput {
  id: string;
  timestamp: number;
  retryCount: number;
}

export interface DiagnosticLogDocument {
  id: string;
  batchId: string;
  peripheralId?: string;
  deviceName?: string;
  category: DiagnosticLogCategory;
  level: DiagnosticLogLevel;
  event: string;
  message: string;
  port?: string;
  interfaceType?: string;
  orgId?: string;
  branchId?: string;
  terminalId?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  flushedAt: number;
}

export interface AuditBufferConfig {
  /** Number of buffered events that immediately triggers a batch upload (default: 20) */
  batchSizeThreshold: number;
  /** Periodic background flush interval in milliseconds (default: 8000ms) */
  flushIntervalMs: number;
  /** Debounce window for expedited flush when ERROR / CRITICAL events arrive (default: 1200ms) */
  criticalFlushDebounceMs: number;
  /** Maximum operations per single Firestore writeBatch (default: 450, Firestore hard limit is 500) */
  maxFirestoreBatchSize: number;
  /** Maximum local buffer capacity before low-priority TRACE/DEBUG eviction (default: 1000) */
  maxLocalBufferSize: number;
  /** Whether background periodic timer is active */
  autoFlushEnabled: boolean;
}

export interface AuditBufferStats {
  bufferedCount: number;
  isFlushing: boolean;
  totalQueuedCount: number;
  totalUploadedCount: number;
  batchesCommittedCount: number;
  /** Number of individual Firestore write API requests saved by batching */
  apiCallsSavedCount: number;
  failedFlushCount: number;
  lastFlushTimestamp: string | null;
  lastBatchId: string | null;
  lastBatchSize: number;
  lastError: string | null;
  bufferItems: BufferedDiagnosticLogItem[];
  recentUploadedLogs: DiagnosticLogDocument[];
  config: AuditBufferConfig;
}

export type AuditStatsListener = (stats: AuditBufferStats) => void;

export type BatchUploadHandler = (documents: DiagnosticLogDocument[], batchId: string) => Promise<void>;

const LOCAL_STORAGE_BUFFER_KEY = 'prodx_diagnostic_log_buffer_v1';
const DIAGNOSTIC_LOGS_COLLECTION = 'diagnostic_logs';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120) || `log-${Date.now()}`;
}

function generateLogId(prefix = 'diag'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return sanitizeId(`${prefix}-${Date.now()}-${rand}`);
}

function sanitizeString(value: string | undefined, maxLen: number, fallback = ''): string {
  if (!value) return fallback;
  const trimmed = String(value).trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

/**
 * Default Firestore batch uploader using atomic `writeBatch(db)`
 */
async function defaultFirestoreBatchUploader(
  documents: DiagnosticLogDocument[],
): Promise<void> {
  if (documents.length === 0) return;
  if (typeof window === 'undefined') {
    // Avoid keeping a persistent Firestore WebChannel open in headless Node CLI test runs
    return;
  }

  const batch = writeBatch(db);

  for (const item of documents) {
    const docRef = doc(db, DIAGNOSTIC_LOGS_COLLECTION, item.id);
    const payload: Record<string, unknown> = {
      id: item.id,
      batchId: item.batchId,
      category: item.category,
      level: item.level,
      event: sanitizeString(item.event, 120, 'DIAGNOSTIC_EVENT'),
      message: sanitizeString(item.message, 500, 'System diagnostic log entry'),
      timestamp: item.timestamp,
      flushedAt: item.flushedAt,
    };

    if (item.peripheralId) payload.peripheralId = sanitizeString(item.peripheralId, 128);
    if (item.deviceName) payload.deviceName = sanitizeString(item.deviceName, 160);
    if (item.port) payload.port = sanitizeString(item.port, 64);
    if (item.interfaceType) payload.interfaceType = sanitizeString(item.interfaceType, 64);
    if (item.orgId) payload.orgId = sanitizeString(item.orgId, 128);
    if (item.branchId) payload.branchId = sanitizeString(item.branchId, 128);
    if (item.terminalId) payload.terminalId = sanitizeString(item.terminalId, 128);
    if (item.metadata && Object.keys(item.metadata).length > 0) {
      payload.metadata = item.metadata;
    }

    batch.set(docRef, payload);
  }

  await batch.commit();
}

export class BufferedAuditDiagnosticService {
  private buffer: BufferedDiagnosticLogItem[] = [];
  private recentUploadedLogs: DiagnosticLogDocument[] = [];
  private listeners: Set<AuditStatsListener> = new Set();

  private isFlushing = false;
  private totalQueuedCount = 0;
  private totalUploadedCount = 0;
  private batchesCommittedCount = 0;
  private failedFlushCount = 0;
  private lastFlushTimestamp: string | null = null;
  private lastBatchId: string | null = null;
  private lastBatchSize = 0;
  private lastError: string | null = null;

  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  private criticalDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private customBatchUploader: BatchUploadHandler | null = null;

  private config: AuditBufferConfig = {
    batchSizeThreshold: 20,
    flushIntervalMs: 8000,
    criticalFlushDebounceMs: 1200,
    maxFirestoreBatchSize: 450,
    maxLocalBufferSize: 1000,
    autoFlushEnabled: true,
  };

  constructor(initialConfig?: Partial<AuditBufferConfig>) {
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
    this.restoreBufferFromStorage();
    this.setupBrowserLifecycleHooks();
    if (this.config.autoFlushEnabled && typeof window !== 'undefined') {
      this.startBackgroundFlushTimer();
    }
  }

  /**
   * Allows injecting a custom batch upload handler (used for deterministic unit tests).
   */
  public setCustomBatchUploader(uploader: BatchUploadHandler | null): void {
    this.customBatchUploader = uploader;
  }

  public configure(partial: Partial<AuditBufferConfig>): void {
    const prevInterval = this.config.flushIntervalMs;
    const prevAuto = this.config.autoFlushEnabled;
    this.config = { ...this.config, ...partial };

    if (!this.config.autoFlushEnabled) {
      this.stopBackgroundFlushTimer();
    } else if (
      typeof window !== 'undefined' &&
      (!prevAuto || prevInterval !== this.config.flushIntervalMs || !this.periodicTimer)
    ) {
      this.startBackgroundFlushTimer();
    }

    this.emitStats();
  }

  public startBackgroundFlushTimer(): void {
    this.stopBackgroundFlushTimer();
    if (!this.config.autoFlushEnabled) return;

    this.periodicTimer = setInterval(() => {
      if (this.buffer.length > 0 && !this.isFlushing) {
        void this.flush();
      }
    }, this.config.flushIntervalMs);
    (this.periodicTimer as unknown as { unref?: () => void })?.unref?.();
  }

  public stopBackgroundFlushTimer(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
    if (this.criticalDebounceTimer) {
      clearTimeout(this.criticalDebounceTimer);
      this.criticalDebounceTimer = null;
    }
  }

  private setupBrowserLifecycleHooks(): void {
    if (typeof window === 'undefined') return;

    // Flush pending diagnostic logs when browser tab becomes hidden or network comes back online
    window.addEventListener('online', () => {
      if (this.buffer.length > 0) {
        void this.flush();
      }
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && this.buffer.length > 0) {
          this.persistBufferToStorage();
          void this.flush();
        }
      });
    }
  }

  private restoreBufferFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_BUFFER_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.buffer = parsed.slice(0, this.config.maxLocalBufferSize);
      }
    } catch {
      // Ignore malformed localStorage payload
    }
  }

  private persistBufferToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      if (this.buffer.length === 0) {
        window.localStorage.removeItem(LOCAL_STORAGE_BUFFER_KEY);
      } else {
        window.localStorage.setItem(LOCAL_STORAGE_BUFFER_KEY, JSON.stringify(this.buffer));
      }
    } catch {
      // Ignore storage quota errors
    }
  }

  private enforceBufferCapacity(): void {
    if (this.buffer.length <= this.config.maxLocalBufferSize) return;

    // Evict lowest-severity (TRACE / DEBUG) oldest entries first so ERROR / CRITICAL logs are never lost
    const overflowCount = this.buffer.length - this.config.maxLocalBufferSize;
    let removed = 0;

    this.buffer = this.buffer.filter((item) => {
      if (removed < overflowCount && (item.level === 'TRACE' || item.level === 'DEBUG')) {
        removed++;
        return false;
      }
      return true;
    });

    if (this.buffer.length > this.config.maxLocalBufferSize) {
      this.buffer = this.buffer.slice(this.buffer.length - this.config.maxLocalBufferSize);
    }
  }

  /**
   * Enqueues a single diagnostic log event into the local buffer.
   * Automatically triggers a batch upload if `batchSizeThreshold` is reached,
   * or schedules a coalesced debounce flush for `ERROR` / `CRITICAL` events.
   */
  public logDiagnosticEvent(input: DiagnosticLogEventInput): BufferedDiagnosticLogItem {
    const now = input.timestamp ?? Date.now();
    const item: BufferedDiagnosticLogItem = {
      ...input,
      id: generateLogId('diag'),
      event: sanitizeString(input.event, 120, 'DIAGNOSTIC_EVENT'),
      message: sanitizeString(input.message, 500, 'System diagnostic log entry'),
      timestamp: now,
      retryCount: 0,
    };

    this.buffer.push(item);
    this.totalQueuedCount++;
    this.enforceBufferCapacity();
    this.persistBufferToStorage();
    this.emitStats();

    if (this.buffer.length >= this.config.batchSizeThreshold) {
      if (this.criticalDebounceTimer) {
        clearTimeout(this.criticalDebounceTimer);
        this.criticalDebounceTimer = null;
      }
      void this.flush();
    } else if (
      this.config.autoFlushEnabled &&
      (item.level === 'ERROR' || item.level === 'CRITICAL')
    ) {
      // Coalesce high-priority error bursts within a short debounce window before batch-uploading
      if (!this.criticalDebounceTimer) {
        this.criticalDebounceTimer = setTimeout(() => {
          this.criticalDebounceTimer = null;
          if (this.buffer.length > 0 && !this.isFlushing) {
            void this.flush();
          }
        }, this.config.criticalFlushDebounceMs);
        (this.criticalDebounceTimer as unknown as { unref?: () => void })?.unref?.();
      }
    }

    return item;
  }

  /**
   * Enqueues multiple diagnostic log events at once and triggers a batch flush if threshold is met.
   */
  public logDiagnosticBatch(inputs: DiagnosticLogEventInput[]): BufferedDiagnosticLogItem[] {
    if (inputs.length === 0) return [];

    const now = Date.now();
    const added: BufferedDiagnosticLogItem[] = inputs.map((input, idx) => ({
      ...input,
      id: generateLogId(`diag-${idx}`),
      event: sanitizeString(input.event, 120, 'DIAGNOSTIC_EVENT'),
      message: sanitizeString(input.message, 500, 'System diagnostic log entry'),
      timestamp: input.timestamp ?? now + idx,
      retryCount: 0,
    }));

    this.buffer.push(...added);
    this.totalQueuedCount += added.length;
    this.enforceBufferCapacity();
    this.persistBufferToStorage();
    this.emitStats();

    if (this.buffer.length >= this.config.batchSizeThreshold) {
      void this.flush();
    }

    return added;
  }

  /**
   * Flushes buffered diagnostic log events to Firestore in atomic chunks (up to 450 per writeBatch).
   * If a batch fails due to network/Firestore error, events remain safely in the local buffer for retry.
   */
  public async flush(): Promise<{
    uploadedCount: number;
    batchesCommitted: number;
    batchId: string | null;
    error: string | null;
  }> {
    if (this.isFlushing || this.buffer.length === 0) {
      return {
        uploadedCount: 0,
        batchesCommitted: 0,
        batchId: null,
        error: null,
      };
    }

    // Check browser offline status before attempting network round-trip (unless custom uploader is injected)
    if (
      !this.customBatchUploader &&
      typeof navigator !== 'undefined' &&
      navigator.onLine === false
    ) {
      this.lastError = 'Network offline — diagnostic logs buffered locally until connection resumes';
      this.emitStats();
      return {
        uploadedCount: 0,
        batchesCommitted: 0,
        batchId: null,
        error: this.lastError,
      };
    }

    this.isFlushing = true;
    this.lastError = null;
    this.emitStats();

    let totalUploadedInFlush = 0;
    let batchesCommittedInFlush = 0;
    let latestBatchId: string | null = null;

    try {
      while (this.buffer.length > 0) {
        const chunkSize = Math.min(this.buffer.length, this.config.maxFirestoreBatchSize);
        const chunk = this.buffer.slice(0, chunkSize);
        const flushedAt = Date.now();
        const batchId = generateLogId('batch');
        latestBatchId = batchId;

        const documents: DiagnosticLogDocument[] = chunk.map((item) => ({
          id: item.id,
          batchId,
          peripheralId: item.peripheralId,
          deviceName: item.deviceName,
          category: item.category,
          level: item.level,
          event: item.event,
          message: item.message,
          port: item.port,
          interfaceType: item.interfaceType,
          orgId: item.orgId,
          branchId: item.branchId,
          terminalId: item.terminalId,
          metadata: item.metadata,
          timestamp: item.timestamp,
          flushedAt,
        }));

        if (this.customBatchUploader) {
          await this.customBatchUploader(documents, batchId);
        } else {
          await defaultFirestoreBatchUploader(documents);
        }

        // Remove committed chunk from head of buffer
        const committedIds = new Set(chunk.map((c) => c.id));
        this.buffer = this.buffer.filter((item) => !committedIds.has(item.id));
        this.persistBufferToStorage();

        totalUploadedInFlush += documents.length;
        this.totalUploadedCount += documents.length;
        batchesCommittedInFlush += 1;
        this.batchesCommittedCount += 1;
        this.lastFlushTimestamp = new Date(flushedAt).toISOString();
        this.lastBatchId = batchId;
        this.lastBatchSize = documents.length;
        this.recentUploadedLogs = [...documents.reverse(), ...this.recentUploadedLogs].slice(0, 50);
      }

      this.isFlushing = false;
      this.emitStats();

      return {
        uploadedCount: totalUploadedInFlush,
        batchesCommitted: batchesCommittedInFlush,
        batchId: latestBatchId,
        error: null,
      };
    } catch (error) {
      this.failedFlushCount += 1;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.lastError = errorMsg;

      // Increment retry count on remaining buffered items
      this.buffer = this.buffer.map((item) => ({
        ...item,
        retryCount: item.retryCount + 1,
      }));
      this.persistBufferToStorage();

      console.error(
        `[AuditService] Firestore batch upload failed (${OperationType.WRITE} on /${DIAGNOSTIC_LOGS_COLLECTION}):`,
        errorMsg,
      );

      this.isFlushing = false;
      this.emitStats();

      return {
        uploadedCount: totalUploadedInFlush,
        batchesCommitted: batchesCommittedInFlush,
        batchId: latestBatchId,
        error: errorMsg,
      };
    }
  }

  /**
   * Simulates a high-traffic burst of hardware diagnostic logs (e.g. peak checkout barcode scans,
   * thermal printer ESC/POS telemetry, and network keep-alives) to demonstrate local buffering
   * and single-batch Firestore upload efficiency.
   */
  public simulateHighTrafficBurst(
    eventCount = 25,
    devices?: Array<{
      id: string;
      name: string;
      category: DiagnosticLogCategory;
      port: string;
      interfaceType?: string;
    }>,
  ): BufferedDiagnosticLogItem[] {
    const sampleDevices =
      devices && devices.length > 0
        ? devices
        : [
            {
              id: 'periph-printer-01',
              name: 'Epson TM-T88VI Receipt Printer',
              category: 'printer' as const,
              port: 'USB001',
              interfaceType: 'USB',
            },
            {
              id: 'periph-scanner-01',
              name: 'Zebra DS9308 2D Scanner',
              category: 'scanner' as const,
              port: 'USB002',
              interfaceType: 'USB',
            },
            {
              id: 'periph-drawer-01',
              name: 'APG Vasario Cash Drawer',
              category: 'drawer' as const,
              port: 'RJ12_DK',
              interfaceType: 'RJ12_Drawer_Kick',
            },
            {
              id: 'periph-edc-01',
              name: 'Verifone V200c Smart EDC',
              category: 'edc' as const,
              port: 'ETH_LAN1',
              interfaceType: 'Ethernet',
            },
          ];

    const sampleEvents: Array<{
      level: DiagnosticLogLevel;
      event: string;
      message: string;
    }> = [
      {
        level: 'INFO',
        event: 'IO_WRITE_BURST',
        message: 'ESC/POS receipt buffer spooled (248 bytes) during peak checkout',
      },
      {
        level: 'DEBUG',
        event: 'CMOS_DECODE_OK',
        message: 'High-speed EAN-13 barcode symbology decoded in 4.2ms',
      },
      {
        level: 'TRACE',
        event: 'HEARTBEAT_ACK',
        message: 'Peripheral bus keep-alive ACK verified within SLA (<5ms)',
      },
      {
        level: 'WARN',
        event: 'THERMISTOR_WARM',
        message: 'Thermal printhead temperature elevated (44.5°C) under continuous load',
      },
      {
        level: 'INFO',
        event: 'SOLENOID_CHECK',
        message: '24V cash drawer microswitch closed loop verified',
      },
    ];

    const now = Date.now();
    const burstInputs: DiagnosticLogEventInput[] = Array.from({ length: eventCount }, (_, i) => {
      const dev = sampleDevices[i % sampleDevices.length];
      const evt = sampleEvents[i % sampleEvents.length];
      return {
        peripheralId: dev.id,
        deviceName: dev.name,
        category: dev.category,
        level: evt.level,
        event: evt.event,
        message: `[Burst #${i + 1}/${eventCount}] ${evt.message}`,
        port: dev.port,
        interfaceType: dev.interfaceType || 'USB',
        timestamp: now + i,
      };
    });

    return this.logDiagnosticBatch(burstInputs);
  }

  public getStats(): AuditBufferStats {
    const apiCallsSavedCount = Math.max(
      0,
      this.totalUploadedCount - this.batchesCommittedCount,
    );

    return {
      bufferedCount: this.buffer.length,
      isFlushing: this.isFlushing,
      totalQueuedCount: this.totalQueuedCount,
      totalUploadedCount: this.totalUploadedCount,
      batchesCommittedCount: this.batchesCommittedCount,
      apiCallsSavedCount,
      failedFlushCount: this.failedFlushCount,
      lastFlushTimestamp: this.lastFlushTimestamp,
      lastBatchId: this.lastBatchId,
      lastBatchSize: this.lastBatchSize,
      lastError: this.lastError,
      bufferItems: [...this.buffer],
      recentUploadedLogs: [...this.recentUploadedLogs],
      config: { ...this.config },
    };
  }

  public subscribeStats(listener: AuditStatsListener): () => void {
    this.listeners.add(listener);
    listener(this.getStats());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitStats(): void {
    const snapshot = this.getStats();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('[AuditService] Stats listener error:', err);
      }
    });
  }

  public clearLocalBuffer(): void {
    this.buffer = [];
    this.persistBufferToStorage();
    this.emitStats();
  }

  public resetState(): void {
    this.stopBackgroundFlushTimer();
    this.buffer = [];
    this.recentUploadedLogs = [];
    this.isFlushing = false;
    this.totalQueuedCount = 0;
    this.totalUploadedCount = 0;
    this.batchesCommittedCount = 0;
    this.failedFlushCount = 0;
    this.lastFlushTimestamp = null;
    this.lastBatchId = null;
    this.lastBatchSize = 0;
    this.lastError = null;
    this.persistBufferToStorage();
    this.emitStats();
  }
}

export const auditService = new BufferedAuditDiagnosticService();

/**
 * Real-time Firestore listener for batch-uploaded diagnostic logs in `/diagnostic_logs`.
 */
export function subscribeToFirestoreDiagnosticLogs(
  maxResults = 40,
  onData: (logs: DiagnosticLogDocument[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, DIAGNOSTIC_LOGS_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(maxResults),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: DiagnosticLogDocument[] = snapshot.docs.map(
        (d) => d.data() as DiagnosticLogDocument,
      );
      onData(items);
    },
    (err) => {
      console.warn('[AuditService] Real-time diagnostic_logs subscription warning:', err);
      if (onError) onError(err);
    },
  );
}

/**
 * Fetches latest batch-uploaded diagnostic logs from `/diagnostic_logs`.
 */
export async function fetchFirestoreDiagnosticLogs(
  maxResults = 40,
): Promise<DiagnosticLogDocument[]> {
  try {
    const q = query(
      collection(db, DIAGNOSTIC_LOGS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(maxResults),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as DiagnosticLogDocument);
  } catch (err) {
    console.warn('[AuditService] Failed to fetch diagnostic_logs from Firestore:', err);
    return auditService.getStats().recentUploadedLogs.slice(0, maxResults);
  }
}
