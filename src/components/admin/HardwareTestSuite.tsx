import React, { useState, useEffect } from 'react';
import {
  Printer,
  Scan,
  Banknote,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  ShieldCheck,
  Clock,
  Download,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { HardwareTestCardResult, HardwareTestSuiteSummary, HardwareTestStatus } from '../../../server/services/infrastructureAiService';

export interface HardwareTestSuiteProps {
  onTriggerActionPulse?: (peripheralId: string, category: string) => void;
}

export const HardwareTestSuite: React.FC<HardwareTestSuiteProps> = ({ onTriggerActionPulse }) => {
  const { addToast } = useToast();
  const [suiteSummary, setSuiteSummary] = useState<HardwareTestSuiteSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'printer' | 'scanner' | 'drawer'>('all');
  const [simulateFaultScenario, setSimulateFaultScenario] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchLatestSuite = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/infrastructure/hardware-test-suite/latest');
      const data = await res.json();
      if (data.success && data.data) {
        setSuiteSummary(data.data);
      }
    } catch (err) {
      console.error('Failed to load hardware test suite:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestSuite();
  }, []);

  const handleRunFullSuite = async (faultMode = simulateFaultScenario) => {
    try {
      setLoading(true);
      setActionMessage('Antigravity AI กำลังส่งสัญญาณสวี้พตรวจสอบความพร้อมของฮาร์ดแวร์ POS ทุกตัว...');
      
      const res = await fetch('/api/v1/infrastructure/hardware-test-suite/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          simulateFaultAll: faultMode,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSuiteSummary(data.data);
        const passed = data.data.passedCount;
        const total = data.data.totalDevices;
        const failed = data.data.failedCount;

        if (failed > 0) {
          addToast({
            type: 'error',
            title: `ผลการทดสอบ: พบข้อบกพร่อง ${failed} อุปกรณ์`,
            message: `ผ่าน ${passed}/${total} อุปกรณ์ (${data.data.healthScorePercent}%) • กรุณาตรวจสอบการ์ดสถานะ FAIL`,
            durationMs: 6000,
          });
        } else {
          addToast({
            type: 'success',
            title: 'ผลการทดสอบ: ผ่านมาตรฐาน 100% (ALL PASS)',
            message: `อุปกรณ์ต่อพ่วงทั้งหมด ${total} ชิ้น พร้อมเปิดกะและทำงานสมบูรณ์ (${data.data.totalDurationMs}ms)`,
            durationMs: 5000,
          });
        }
        setActionMessage(`[Test Suite Completed] ตรวจสอบอุปกรณ์ ${total} รายการ สำเร็จใน ${data.data.totalDurationMs}ms (สุขภาพระบบ: ${data.data.healthScorePercent}%)`);
      }
    } catch {
      addToast({
        type: 'error',
        title: 'การทดสอบขัดข้อง',
        message: 'ไม่สามารถติดต่อเซอร์วิส Hardware Test Suite ได้',
        durationMs: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestSingleDevice = async (deviceId: string, simulateFault = false) => {
    try {
      setTestingDeviceId(deviceId);
      const res = await fetch('/api/v1/infrastructure/hardware-test-suite/device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, simulateFault }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        // Update suite summary with the new device result
        setSuiteSummary((prev) => {
          if (!prev) return data.suiteSummary || null;
          const updatedResults = prev.results.map((r) => (r.peripheralId === deviceId ? data.data : r));
          const passedCount = updatedResults.filter((r) => r.status === 'PASS').length;
          const failedCount = updatedResults.filter((r) => r.status === 'FAIL').length;
          const warningCount = updatedResults.filter((r) => r.status === 'WARNING').length;
          return {
            ...prev,
            results: updatedResults,
            passedCount,
            failedCount,
            warningCount,
            healthScorePercent: Math.round((passedCount / updatedResults.length) * 100),
          };
        });

        const status = data.data.status;
        addToast({
          type: status === 'PASS' ? 'success' : status === 'WARNING' ? 'info' : 'error',
          title: `ผลทดสอบ: ${data.data.name}`,
          message: `${data.data.status} • ${data.data.summary}`,
          durationMs: 4500,
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'ทดสอบอุปกรณ์ล้มเหลว',
        message: 'เกิดข้อผิดพลาดในการส่งคำสั่งทดสอบอุปกรณ์',
        durationMs: 4000,
      });
    } finally {
      setTestingDeviceId(null);
    }
  };

  const toggleExpand = (cardId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const handleExportReport = () => {
    if (!suiteSummary) return;
    const reportText = [
      '====================================================',
      'PRODX-POS HARDWARE TEST SUITE VERIFICATION REPORT',
      '====================================================',
      `Date/Time: ${new Date(suiteSummary.timestamp).toLocaleString('th-TH')}`,
      `Suite ID: ${suiteSummary.suiteId}`,
      `Total Devices: ${suiteSummary.totalDevices}`,
      `Passed: ${suiteSummary.passedCount} | Failed: ${suiteSummary.failedCount} | Warnings: ${suiteSummary.warningCount}`,
      `Overall Health Score: ${suiteSummary.healthScorePercent}%`,
      `Total Execution Duration: ${suiteSummary.totalDurationMs} ms`,
      '----------------------------------------------------',
      ...suiteSummary.results.flatMap((r) => [
        `[${r.status}] ${r.name} (${r.model}) - Port: ${r.port}`,
        `  Summary: ${r.summary}`,
        `  Sub-Tests:`,
        ...r.subTests.map((s) => `    * [${s.status}] ${s.name}: ${s.metric || ''} -> ${s.details}`),
        r.recommendations ? `  Recommendations:\n${r.recommendations.map((rec) => `    - ${rec}`).join('\n')}` : '',
        '----------------------------------------------------',
      ]),
    ].join('\n');

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prodx-pos-hardware-test-report-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'ส่งออกรายงานสำเร็จ',
      message: 'ดาวน์โหลดไฟล์รายงานผลการทดสอบฮาร์ดแวร์เรียบร้อย',
      durationMs: 3000,
    });
  };

  const filteredResults = suiteSummary?.results.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  }) || [];

  return (
    <div className="bg-card rounded-3xl border border-border border-crisp shadow-sm p-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Comprehensive Hardware Test Suite
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Printers • Scanners • Drawers
            </span>
          </div>
          <p className="text-xs text-text/60 mt-1">
            ชุดทดสอบและรับรองความพร้อมระดับฮาร์ดแวร์ POS ครอบคลุมการสื่อสารพอร์ต, เซนเซอร์กระดาษ, ลำแสงออปติคัลบาร์โค้ด, และวงจรขดลวดโซลินอยด์ 24V
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Fault Simulation Toggle */}
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border border-crisp text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={simulateFaultScenario}
              onChange={(e) => setSimulateFaultScenario(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <span className="text-text/70 flex items-center gap-1 font-medium">
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              จำลองข้อผิดพลาด (Simulate Fault)
            </span>
          </label>

          {/* Export Report */}
          <button
            onClick={handleExportReport}
            disabled={!suiteSummary}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-background hover:bg-card border border-border border-crisp text-text/80 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            title="ดาวน์โหลดรายงานผลการทดสอบฮาร์ดแวร์ทั้งหมด"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออกรายงาน</span>
          </button>

          {/* Run Full Suite Button */}
          <button
            onClick={() => handleRunFullSuite(simulateFaultScenario)}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'กำลังรันชุดทดสอบ...' : 'รันชุดทดสอบทั้งหมด (Run Full Suite)'}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 px-4 py-2.5 rounded-2xl text-xs flex items-center justify-between">
          <span className="font-mono">{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs text-indigo-500 hover:underline cursor-pointer">ปิด</button>
        </div>
      )}

      {/* Executive Test Suite Metrics Bar */}
      {suiteSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Health Score */}
          <div className="p-3.5 rounded-2xl bg-background/80 border border-border border-crisp flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text/50">Overall Health Score</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl font-black font-mono ${
                suiteSummary.healthScorePercent === 100
                  ? 'text-emerald-500'
                  : suiteSummary.healthScorePercent >= 70
                  ? 'text-amber-500'
                  : 'text-rose-500'
              }`}>
                {suiteSummary.healthScorePercent}%
              </span>
              <span className="text-[10px] text-text/40">เกณฑ์มาตรฐาน</span>
            </div>
          </div>

          {/* Total Devices */}
          <div className="p-3.5 rounded-2xl bg-background/80 border border-border border-crisp flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text/50">Total Devices Tested</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-text">{suiteSummary.totalDevices}</span>
              <span className="text-[10px] text-text/40">อุปกรณ์</span>
            </div>
          </div>

          {/* Passed */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span>Passed</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {suiteSummary.passedCount}
              </span>
              <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">พร้อมใช้งาน</span>
            </div>
          </div>

          {/* Failed */}
          <div className={`p-3.5 rounded-2xl flex flex-col justify-between ${
            suiteSummary.failedCount > 0
              ? 'bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-400'
              : 'bg-background/80 border border-border border-crisp text-text/40'
          }`}>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <span>Failed</span>
              <XCircle className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono">{suiteSummary.failedCount}</span>
              <span className="text-[10px]">พบข้อผิดพลาด</span>
            </div>
          </div>

          {/* Warnings */}
          <div className="p-3.5 rounded-2xl bg-background/80 border border-border border-crisp flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-500">
              <span>Warnings</span>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-amber-500">{suiteSummary.warningCount}</span>
              <span className="text-[10px] text-text/40">ข้อสังเกต</span>
            </div>
          </div>

          {/* Execution Time */}
          <div className="p-3.5 rounded-2xl bg-background/80 border border-border border-crisp flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text/50">
              <span>Execution Speed</span>
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-text">{suiteSummary.totalDurationMs}</span>
              <span className="text-[10px] text-text/40">ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs & Quick Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border border-crisp">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'ทั้งหมด (All Hardware)', icon: Activity },
            { id: 'printer', label: 'เครื่องพิมพ์ (Printers)', icon: Printer },
            { id: 'scanner', label: 'สแกนเนอร์ (Scanners)', icon: Scan },
            { id: 'drawer', label: 'ลิ้นชัก (Cash Drawers)', icon: Banknote },
          ].map((cat) => {
            const Icon = cat.icon;
            const count = suiteSummary?.results.filter((r) => cat.id === 'all' || r.category === cat.id).length || 0;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-background hover:bg-card border border-border border-crisp text-text/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-background text-text/60'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-text/50 font-mono">
          ตรวจสอบล่าสุด: {suiteSummary ? new Date(suiteSummary.timestamp).toLocaleTimeString('th-TH') : '-'}
        </div>
      </div>

      {/* PASS / FAIL Status Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredResults.map((result) => {
          const isTesting = testingDeviceId === result.peripheralId;
          const isExpanded = expandedCards[result.id] !== false; // default expanded

          return (
            <div
              key={result.id}
              className={`rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 relative overflow-hidden bg-card animate-card-entrance animate-state-pop ${
                result.status === 'PASS'
                  ? 'border-emerald-500/40 hover:border-emerald-500/70 shadow-sm'
                  : result.status === 'FAIL'
                  ? 'border-rose-500/60 ring-2 ring-rose-500/25 shadow-[0_0_20px_rgba(239,68,68,0.18)]'
                  : 'border-amber-500/50 ring-1 ring-amber-500/20 shadow-sm'
              }`}
            >
              {/* Top Status Accent Bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  result.status === 'PASS'
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500'
                    : result.status === 'FAIL'
                    ? 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 animate-pulse'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500'
                }`}
              />

              {/* Card Header: Device Info & Prominent PASS/FAIL Badge */}
              <div className="flex items-start justify-between gap-3 pt-0.5">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                      result.status === 'PASS'
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                        : result.status === 'FAIL'
                        ? 'bg-rose-500/15 border-rose-500/35 text-rose-600 dark:text-rose-400 animate-pulse'
                        : 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {result.category === 'printer' && <Printer className="w-5 h-5" />}
                    {result.category === 'scanner' && <Scan className="w-5 h-5" />}
                    {result.category === 'drawer' && <Banknote className="w-5 h-5" />}
                    {result.category === 'edc' && <CreditCard className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm text-text leading-tight">{result.name}</h3>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg bg-background border border-border border-crisp text-text/70">
                        {result.port}
                      </span>
                    </div>
                    <div className="text-[11px] text-text/60 font-mono mt-0.5">
                      {result.model} • ทดสอบใน {result.executionTimeMs} ms
                    </div>
                  </div>
                </div>

                {/* Big Prominent PASS / FAIL Status Badge */}
                <div className="shrink-0">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase font-mono shadow-sm ${
                      result.status === 'PASS'
                        ? 'bg-emerald-600 text-white'
                        : result.status === 'FAIL'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {result.status === 'PASS' && <CheckCircle2 className="w-4 h-4" />}
                    {result.status === 'FAIL' && <XCircle className="w-4 h-4" />}
                    {result.status === 'WARNING' && <AlertTriangle className="w-4 h-4" />}
                    <span>{result.status}</span>
                  </div>
                </div>
              </div>

              {/* Summary Status Text */}
              <div
                className={`p-2.5 rounded-xl text-xs font-medium ${
                  result.status === 'PASS'
                    ? 'bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 border border-emerald-500/15'
                    : result.status === 'FAIL'
                    ? 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                }`}
              >
                {result.summary}
              </div>

              {/* Sub-Tests Breakdown Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-text/60 uppercase tracking-wider">
                  <span>Subsystem Verification Checklist ({result.subTests.length} รายการ):</span>
                  <button
                    onClick={() => toggleExpand(result.id)}
                    className="flex items-center gap-1 text-[10px] text-indigo-500 hover:underline cursor-pointer"
                  >
                    <span>{isExpanded ? 'ย่อ' : 'ขยาย'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="space-y-1.5 divide-y divide-border/40">
                    {result.subTests.map((sub) => (
                      <div key={sub.id} className="pt-1.5 first:pt-0 flex items-start justify-between gap-2 text-xs">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0">
                            {sub.status === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                            {sub.status === 'FAIL' && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                            {sub.status === 'WARNING' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          </span>
                          <div>
                            <div className="font-semibold text-text text-[11px] flex items-center gap-1.5">
                              <span>{sub.name}</span>
                              {sub.metric && (
                                <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-normal ${
                                  sub.status === 'FAIL'
                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
                                    : 'bg-background border border-border border-crisp text-text/70'
                                }`}>
                                  {sub.metric}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-text/60 mt-0.5 leading-relaxed">
                              {sub.details}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                            sub.status === 'PASS'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : sub.status === 'FAIL'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actionable Recommendations (if FAIL) */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1.5 text-xs text-rose-700 dark:text-rose-300">
                  <div className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    คำแนะนำในการแก้ไขปัญหา (AI Recommendations):
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-text/80 pl-1">
                    {result.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border border-crisp text-xs">
                <div className="text-[10px] text-text/50 font-mono">
                  ID: {result.peripheralId}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Re-test Button */}
                  <button
                    onClick={() => handleTestSingleDevice(result.peripheralId, false)}
                    disabled={isTesting}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-background hover:bg-card border border-border border-crisp text-text/80 text-[11px] font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    title="สั่งการรันคำสั่งทดสอบเฉพาะอุปกรณ์ชิ้นนี้ซ้ำ"
                  >
                    <RotateCcw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบซ้ำ'}</span>
                  </button>

                  {/* Simulate Fault on this device */}
                  <button
                    onClick={() => handleTestSingleDevice(result.peripheralId, true)}
                    disabled={isTesting}
                    className="px-2 py-1.5 rounded-xl bg-background hover:bg-rose-500/10 hover:border-rose-500/30 border border-border border-crisp text-text/70 hover:text-rose-600 dark:hover:text-rose-400 text-[10px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                    title="ทดสอบจำลองเงื่อนไขขัดข้องเพื่อตรวจสอบการ์ด FAIL"
                  >
                    Simulate Fail
                  </button>

                  {/* Category Action Pulse */}
                  {onTriggerActionPulse && (
                    <button
                      onClick={() => onTriggerActionPulse(result.peripheralId, result.category)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold transition-all cursor-pointer"
                      title="ส่งสัญญาณกระตุ้นการทำงานของฮาร์ดแวร์"
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>
                        {result.category === 'printer'
                          ? 'Print Slip'
                          : result.category === 'scanner'
                          ? 'Trigger Beep'
                          : result.category === 'drawer'
                          ? 'Fire Kick'
                          : 'Send Pulse'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
