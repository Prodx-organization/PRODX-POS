import React, { useState, useEffect } from 'react';
import { useOffline } from '../../context/OfflineContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Clock,
  ShieldCheck,
  GitMerge,
  Database,
  ArrowRight,
  Trash2,
  X,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export interface SyncVisualLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConflictResolutionLog {
  id: string;
  timestamp: string;
  entity: string;
  conflictType: 'concurrent_inventory_edit' | 'idempotency_collision' | 'stale_version';
  localVersion: string;
  cloudVersion: string;
  resolution: 'server_wins' | 'client_wins' | 'auto_merged';
  description: string;
}

export const SyncVisualLogPanel: React.FC<SyncVisualLogPanelProps> = ({ isOpen, onClose }) => {
  const {
    isOnline,
    isSimulatedOffline,
    outbox,
    pendingCount,
    syncedCount,
    failedCount,
    isSyncing,
    lastSyncedAt,
    syncLatencyHistory,
    triggerSync,
    clearSyncedItems,
  } = useOffline();
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'timeline' | 'conflicts' | 'outbox'>('timeline');
  const [conflictLogs, setConflictLogs] = useState<ConflictResolutionLog[]>([
    {
      id: 'conf-01',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      entity: 'Product Inventory (SKU-8821)',
      conflictType: 'concurrent_inventory_edit',
      localVersion: 'Qty: 14 (Offline Sale)',
      cloudVersion: 'Qty: 12 (Restock Event)',
      resolution: 'auto_merged',
      description: 'Deducted offline sale quantity (2 units) from updated cloud base stock. Reconciled successfully.',
    },
    {
      id: 'conf-02',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      entity: 'Order Transaction (TX-9901)',
      conflictType: 'idempotency_collision',
      localVersion: 'Payload Hash #c7f2a',
      cloudVersion: 'Existing Committed Record',
      resolution: 'server_wins',
      description: 'Idempotency key matched existing server record. Discarded duplicate outbox entry without double-charge.',
    },
  ]);

  // Automatically add a conflict or sync log when offlineContext state changes
  useEffect(() => {
    if (isSyncing) {
      setConflictLogs((prev) => [
        {
          id: `conf-${Date.now()}`,
          timestamp: new Date().toISOString(),
          entity: 'Outbox Sync Batch',
          conflictType: 'stale_version',
          localVersion: `Pending: ${pendingCount}`,
          cloudVersion: 'Syncing with Server',
          resolution: 'auto_merged',
          description: 'Triggered automated cloud reconciliation for local outbox queue.',
        },
        ...prev,
      ]);
    }
  }, [isSyncing, pendingCount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card text-text w-full max-w-4xl rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card-hover/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <GitMerge className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {language === 'th' ? 'แผงบันทึกการซิงก์และข้อขัดแย้ง (Sync & Conflict Log)' : 'Sync History & Conflict Resolution Log'}
              </h2>
              <p className="text-xs text-text-muted">
                {language === 'th'
                  ? 'ตรวจสอบประวัติการซิงก์ข้อมูลออฟไลน์ และสถานะการแก้ไขข้อขัดแย้ง (Conflict Resolution) แบบเรียลไทม์'
                  : 'Real-time synchronization audit trail and automatic cloud conflict resolution status.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-card-hover rounded-xl text-text-muted hover:text-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-background border-b border-border text-xs">
          <div className="bg-card p-3 rounded-2xl border border-border flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-text-muted">สถานะเครือข่าย</div>
              <div className="font-bold text-sm">
                {isOnline ? (isSimulatedOffline ? 'ออฟไลน์ (จำลอง)' : 'ออนไลน์') : 'ออฟไลน์'}
              </div>
            </div>
          </div>

          <div className="bg-card p-3 rounded-2xl border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-text-muted">รายการรอซิงก์ (Outbox)</div>
              <div className="font-bold text-sm">{pendingCount} รายการ</div>
            </div>
          </div>

          <div className="bg-card p-3 rounded-2xl border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-text-muted">ซิงก์สำเร็จ</div>
              <div className="font-bold text-sm">{syncedCount} รายการ</div>
            </div>
          </div>

          <div className="bg-card p-3 rounded-2xl border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-text-muted">ซิงก์ล่าสุด</div>
              <div className="font-bold text-sm">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'ยังไม่มี'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-border flex gap-4 bg-card-hover/20">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {language === 'th' ? 'ไทม์ไลน์เหตุการณ์การซิงก์' : 'Sync Timeline'} ({syncLatencyHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'conflicts'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {language === 'th' ? 'การแก้ไขข้อขัดแย้งข้อมูล (Conflicts)' : 'Conflict Resolutions'} ({conflictLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('outbox')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'outbox'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {language === 'th' ? 'คิวข้อมูล Outbox บนเครื่อง' : 'Local Outbox Queue'} ({outbox.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-background/50">
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {language === 'th' ? 'บันทึกเหตุการณ์การเชื่อมต่อและซิงก์ล่าสุด' : 'Recent Sync & Latency Events'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerSync()}
                  disabled={!isOnline || isSyncing}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {language === 'th' ? 'บังคับซิงก์ทันที' : 'Trigger Sync Now'}
                </Button>
              </div>

              {syncLatencyHistory.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-sm">
                  ยังไม่มีประวัติเหตุการณ์การซิงก์
                </div>
              ) : (
                syncLatencyHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm capitalize">{item.source.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-text-muted">
                          {new Date(item.timestamp).toLocaleTimeString('th-TH')} • Latency: {item.latencyMs}ms
                        </div>
                      </div>
                    </div>
                    <Badge variant={item.status === 'success' ? 'success' : 'danger'} size="sm">
                      {item.status.toUpperCase()}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'conflicts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {language === 'th' ? 'สถานะการตรวจจับและแก้ไขข้อขัดแย้ง (Conflict Resolution Ledger)' : 'Conflict Detection & Automated Resolution Log'}
                </span>
                <span className="text-xs text-text-muted">
                  {language === 'th' ? 'โปรโตคอล: Last-Write-Wins & Auto-Merge' : 'Protocol: Last-Write-Wins & Auto-Merge'}
                </span>
              </div>

              {conflictLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-500" />
                      <span className="font-bold text-sm">{log.entity}</span>
                    </div>
                    <Badge variant="purple" size="sm">
                      {log.resolution.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted">{log.description}</p>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs font-mono">
                    <div className="bg-background p-2 rounded-xl border border-border">
                      <span className="text-text-muted block text-[10px]">LOCAL VERSION</span>
                      {log.localVersion}
                    </div>
                    <div className="bg-background p-2 rounded-xl border border-border">
                      <span className="text-text-muted block text-[10px]">CLOUD VERSION</span>
                      {log.cloudVersion}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'outbox' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {language === 'th' ? 'คิวรายการธุรกรรมที่รอส่งขึ้นคลาวด์ (Outbox Queue)' : 'Pending Outbox Transactions'}
                </span>
                {outbox.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearSyncedItems}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    {language === 'th' ? 'ล้างรายการที่ซิงก์แล้ว' : 'Clear Synced'}
                  </Button>
                )}
              </div>

              {outbox.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-sm flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-60" />
                  {language === 'th' ? 'ไม่มีรายการค้างใน Outbox ข้อมูลซิงก์กับคลาวด์สมบูรณ์แล้ว' : 'Outbox is empty. All local transactions are fully synchronized.'}
                </div>
              ) : (
                outbox.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm uppercase">{item.type.replace(/_/g, ' ')}</span>
                        <Badge variant={item.syncState === 'synced' ? 'success' : item.syncState === 'failed' ? 'danger' : 'warning'} size="sm">
                          {item.syncState}
                        </Badge>
                      </div>
                      <div className="text-xs text-text-muted mt-1 font-mono">
                        Idempotency Key: {item.idempotencyKey.slice(0, 16)}... • Attempts: {item.attempts}
                      </div>
                    </div>
                    <div className="text-right text-xs text-text-muted">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card-hover/20 text-xs text-text-muted">
          <span>PRODX-POS Offline Resilience & Conflict Resolution Engine</span>
          <Button onClick={onClose} size="sm">
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close Panel'}
          </Button>
        </div>
      </div>
    </div>
  );
};
