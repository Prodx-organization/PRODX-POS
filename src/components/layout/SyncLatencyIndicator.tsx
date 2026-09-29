import React, { useState, useRef, useEffect } from 'react';
import { useOffline, SyncLatencyQuality, computeLatencyQuality } from '../../context/OfflineContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Activity,
  Zap,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Server,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge, BadgeVariant } from '../common/Badge';

export interface SyncLatencyIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const SyncLatencyIndicator: React.FC<SyncLatencyIndicatorProps> = ({
  className = '',
  compact = false,
}) => {
  const {
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    syncLatencyMs,
    syncLatencyQuality,
    syncLatencyHistory,
    avgSyncLatencyMs,
    minSyncLatencyMs,
    maxSyncLatencyMs,
    lastSyncCycleAt,
    isMeasuringLatency,
    measureSyncLatency,
    isSyncing,
    pendingCount,
  } = useOffline();

  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Color mapping based on latency quality
  const getQualityTheme = (quality: SyncLatencyQuality): {
    dotBg: string;
    dotRing: string;
    textColor: string;
    border: string;
    bgLight: string;
    badgeVariant: BadgeVariant;
    label: string;
    shortLabel: string;
  } => {
    switch (quality) {
      case 'optimal':
        return {
          dotBg: 'bg-emerald-500',
          dotRing: 'ring-emerald-500/30',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          border: 'border-emerald-500/30',
          bgLight: 'bg-emerald-500/10',
          badgeVariant: 'success',
          label: t.syncLatency.statusOptimal,
          shortLabel: language === 'th' ? 'ดีเยี่ยม' : 'Optimal',
        };
      case 'good':
        return {
          dotBg: 'bg-lime-500',
          dotRing: 'ring-lime-500/30',
          textColor: 'text-lime-600 dark:text-lime-400',
          border: 'border-lime-500/30',
          bgLight: 'bg-lime-500/10',
          badgeVariant: 'success',
          label: t.syncLatency.statusGood,
          shortLabel: language === 'th' ? 'ดี' : 'Good',
        };
      case 'moderate':
        return {
          dotBg: 'bg-amber-500',
          dotRing: 'ring-amber-500/30',
          textColor: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-500/30',
          bgLight: 'bg-amber-500/10',
          badgeVariant: 'warning',
          label: t.syncLatency.statusModerate,
          shortLabel: language === 'th' ? 'ปานกลาง' : 'Moderate',
        };
      case 'high':
        return {
          dotBg: 'bg-orange-500',
          dotRing: 'ring-orange-500/30',
          textColor: 'text-orange-600 dark:text-orange-400',
          border: 'border-orange-500/30',
          bgLight: 'bg-orange-500/10',
          badgeVariant: 'warning',
          label: t.syncLatency.statusHigh,
          shortLabel: language === 'th' ? 'สูง' : 'High',
        };
      case 'poor':
        return {
          dotBg: 'bg-rose-500',
          dotRing: 'ring-rose-500/30',
          textColor: 'text-rose-600 dark:text-rose-400',
          border: 'border-rose-500/30',
          bgLight: 'bg-rose-500/10',
          badgeVariant: 'danger',
          label: t.syncLatency.statusPoor,
          shortLabel: language === 'th' ? 'วิกฤต' : 'Critical',
        };
      case 'offline':
      default:
        return {
          dotBg: 'bg-zinc-500',
          dotRing: 'ring-zinc-500/30',
          textColor: 'text-text/40',
          border: 'border-border',
          bgLight: 'bg-zinc-500/10',
          badgeVariant: 'neutral',
          label: t.syncLatency.statusOffline,
          shortLabel: language === 'th' ? 'ออฟไลน์' : 'Offline',
        };
    }
  };

  const theme = getQualityTheme(syncLatencyQuality);

  const formatCycleTime = (isoString?: string | null) => {
    if (!isoString) return language === 'th' ? 'ยังไม่มีรอบ' : 'None';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleMeasureLatency = () => {
    void measureSyncLatency();
  };


  return (
    <div className={`relative inline-flex items-center ${className}`} ref={popoverRef}>
      {/* Footer Trigger Button */}
      <button
        id="footer-sync-latency-btn"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={`${t.syncLatency.title}: ${syncLatencyMs !== null ? `${syncLatencyMs}ms (${theme.shortLabel})` : t.syncLatency.statusOffline}`}
        className={`group flex items-center gap-1.5 px-2 py-0.5 rounded transition-all cursor-pointer select-none font-mono text-[10px] tracking-wider uppercase border border-crisp ${
          isOpen
            ? 'bg-primary/10 border-primary/40 text-primary'
            : 'bg-background/80 hover:bg-card hover:border-border text-text/70 hover:text-text border-border'
        }`}
      >
        {/* Animated pulse indicator */}
        <span className="relative flex h-2 w-2 items-center justify-center">
          {isOnline && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.dotBg}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${theme.dotBg}`} />
        </span>

        {/* Activity / Sync icon */}
        <Activity
          className={`h-3 w-3 shrink-0 transition-transform ${
            isMeasuringLatency || isSyncing
              ? 'animate-spin text-primary'
              : theme.textColor
          }`}
        />

        {/* Latency Label and Numbers */}
        <span className="hidden sm:inline-block text-text/50 font-semibold">
          {t.syncLatency.footerLabel}:
        </span>

        <span className={`font-bold ${theme.textColor}`}>
          {isOnline && syncLatencyMs !== null ? `${syncLatencyMs}ms` : '-- ms'}
        </span>

        {/* Short Status pill on wide screens */}
        {!compact && (
          <span
            className={`hidden xl:inline-block px-1 py-0.2 rounded text-[9px] font-bold uppercase tracking-tight ${theme.bgLight} ${theme.textColor}`}
          >
            {theme.shortLabel}
          </span>
        )}
      </button>

      {/* Interactive Diagnostics Popover / Flyout (Opens upward from footer) */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t.syncLatency.title}
          className="absolute bottom-full right-0 mb-2 w-[340px] sm:w-[380px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-border border-crisp bg-card/95 backdrop-blur-md shadow-2xl z-50 p-4 text-xs font-sans text-text animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${theme.bgLight} ${theme.textColor}`}>
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight">{t.syncLatency.title}</h4>
                <p className="text-[11px] text-text/60 leading-tight">
                  {t.syncLatency.roundTripSummary}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-text/40 hover:text-text hover:bg-card-hover p-1 rounded-md transition-colors"
              aria-label="Close sync latency flyout"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Cloud Database Connection Status Banner */}
          <div className="mt-3 p-2.5 rounded-lg bg-background/80 border border-border border-crisp flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className={`h-4 w-4 ${isOnline ? 'text-primary' : 'text-text/40'}`} />
              <div>
                <div className="text-[11px] font-bold text-text/80">
                  {t.syncLatency.cloudDb}
                </div>
                <div className="text-[10px] text-text/50">
                  {isOnline
                    ? t.syncLatency.cloudDbConnected
                    : t.syncLatency.statusOffline}
                </div>
              </div>
            </div>

            <Badge variant={theme.badgeVariant} size="sm">
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Badge>
          </div>

          {/* Hero Latency Gauge / Metric */}
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-background/90 to-card border border-border border-crisp">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-text/50">
                  {t.syncLatency.rtt}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-3xl font-extrabold font-mono tracking-tight ${theme.textColor}`}>
                    {isOnline && syncLatencyMs !== null ? syncLatencyMs : '--'}
                  </span>
                  <span className="text-xs font-mono text-text/50">ms</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <Badge variant={theme.badgeVariant} size="md" className="font-bold">
                  {theme.label}
                </Badge>
                <span className="text-[10px] text-text/50 font-mono">
                  {t.syncLatency.lastCycle}: {formatCycleTime(lastSyncCycleAt)}
                </span>
              </div>
            </div>

            {/* Sparkline / Recent Sync Cycles Visual Bar */}
            <div className="mt-3 pt-2.5 border-t border-border/60">
              <div className="flex items-center justify-between text-[10px] text-text/60 mb-1.5 font-mono">
                <span>{t.syncLatency.syncHistory}</span>
                <span>{avgSyncLatencyMs}ms avg</span>
              </div>

              <div className="h-9 w-full flex items-end gap-1 bg-background/60 p-1 rounded-md border border-border/40">
                {syncLatencyHistory.slice(0, 16).reverse().map((rec, idx) => {
                  const maxVal = Math.max(100, maxSyncLatencyMs);
                  const heightPercent = rec.status === 'success'
                    ? Math.max(15, Math.min(100, (rec.latencyMs / maxVal) * 100))
                    : 100;

                  const barQuality = computeLatencyQuality(
                    rec.status === 'success' ? rec.latencyMs : null,
                    rec.status === 'success'
                  );
                  const barTheme = getQualityTheme(barQuality);

                  return (
                    <div
                      key={rec.id || idx}
                      title={`${rec.latencyMs}ms (${rec.source}) - ${new Date(rec.timestamp).toLocaleTimeString()}`}
                      className={`flex-1 rounded-t-sm transition-all duration-300 hover:opacity-100 ${
                        rec.status === 'success' ? barTheme.dotBg : 'bg-rose-500/50'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Latency Breakdown Architecture */}
          <div className="mt-3 p-3 rounded-lg bg-background/60 border border-border border-crisp space-y-2">
            <div className="text-[11px] font-bold text-text/80 flex items-center justify-between">
              <span>{t.syncLatency.breakdownTitle}</span>
              <span className="text-[10px] font-mono text-primary">
                100% Client-Cloud Sync
              </span>
            </div>

            <div className="space-y-1.5 text-[10px] font-mono">
              {/* Step 1: Local */}
              <div className="flex items-center justify-between text-text/70">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                  {t.syncLatency.localDb}
                </span>
                <span className="font-semibold text-text/90">
                  {isOnline ? '1 - 3 ms' : '0 ms'}
                </span>
              </div>

              {/* Step 2: Network Transport */}
              <div className="flex items-center justify-between text-text/70">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80" />
                  {t.syncLatency.network}
                </span>
                <span className="font-semibold text-text/90">
                  {isOnline && syncLatencyMs !== null
                    ? `${Math.max(1, syncLatencyMs - 6)} ms`
                    : '-- ms'}
                </span>
              </div>

              {/* Step 3: Cloud DB Write / Ack */}
              <div className="flex items-center justify-between text-text/70">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                  {t.syncLatency.cloudAck}
                </span>
                <span className="font-semibold text-text/90">
                  {isOnline ? '3 - 6 ms' : '-- ms'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics 3-Col Grid */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-2 rounded-lg bg-background/50 border border-border border-crisp">
              <div className="text-[9px] uppercase tracking-wider text-text/50">{t.syncLatency.minLatency}</div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {minSyncLatencyMs > 0 ? `${minSyncLatencyMs}ms` : '--'}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-background/50 border border-border border-crisp">
              <div className="text-[9px] uppercase tracking-wider text-text/50">{t.syncLatency.avgLatency}</div>
              <div className="text-xs font-bold text-primary mt-0.5">
                {avgSyncLatencyMs > 0 ? `${avgSyncLatencyMs}ms` : '--'}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-background/50 border border-border border-crisp">
              <div className="text-[9px] uppercase tracking-wider text-text/50">{t.syncLatency.maxLatency}</div>
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {maxSyncLatencyMs > 0 ? `${maxSyncLatencyMs}ms` : '--'}
              </div>
            </div>
          </div>



          {/* Action Trigger Buttons */}
          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-2">
            <Button
              id="sync-latency-ping-btn"
              variant="outline"
              size="sm"
              onClick={handleMeasureLatency}
              isLoading={isMeasuringLatency}
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isMeasuringLatency ? 'animate-spin' : ''}`} />}
              className="flex-1 text-xs"
            >
              {t.syncLatency.pingNow}
            </Button>

            <Button
              id="sync-latency-offline-toggle-btn"
              variant={isSimulatedOffline ? 'danger' : 'ghost'}
              size="sm"
              onClick={toggleSimulatedOffline}
              leftIcon={isSimulatedOffline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              {isSimulatedOffline ? (language === 'th' ? 'ยกเลิกออฟไลน์' : 'Go Online') : (language === 'th' ? 'ลองตัดเน็ต' : 'Test Offline')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
