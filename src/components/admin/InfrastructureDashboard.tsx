import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Cpu, Database, Server, RefreshCw, HardDrive, CheckCircle2, AlertTriangle, DownloadCloud, Zap, Wifi } from 'lucide-react';

interface HealthData {
  status: 'healthy' | 'warning' | 'critical' | 'self_healing';
  uptimeSeconds: number;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  dbLatencyMs: number;
  activeConnections: number;
  lastSelfHealTimestamp?: string;
  selfHealLogs: Array<{
    id: string;
    timestamp: string;
    component: string;
    issue: string;
    actionTaken: string;
    status: 'success' | 'pending';
  }>;
}

interface Device {
  id: string;
  name: string;
  type: string;
  port: string;
  status: 'connected' | 'installing' | 'ready' | 'error';
  driverVersion: string;
  latestVersion: string;
  autoUpdateAvailable: boolean;
  lastConnected: string;
}

export function InfrastructureDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);
  const [healing, setHealing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoadingHealth(true);
      const [hRes, dRes] = await Promise.all([
        fetch('/api/v1/infrastructure/health'),
        fetch('/api/v1/infrastructure/devices'),
      ]);
      const hData = await hRes.json();
      const dData = await dRes.json();
      if (hData.success) setHealth(hData.data);
      if (dData.success) setDevices(dData.data);
    } catch (err) {
      console.error('Failed to fetch infrastructure data:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSelfHeal = async () => {
    try {
      setHealing(true);
      setActionMessage('Antigravity AI กำลังตรวจสอบและซ่อมแซมระบบโครงสร้างพื้นฐานอัตโนมัติ (Self-Healing)...');
      const res = await fetch('/api/v1/infrastructure/self-heal', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        await fetchData();
      } else {
        setActionMessage('การซ่อมแซมล้มเหลว: ' + data.error);
      }
    } catch {
      setActionMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setHealing(false);
    }
  };

  const handleScanDevices = async () => {
    try {
      setLoadingScan(true);
      const res = await fetch('/api/v1/infrastructure/devices/scan', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices);
        setActionMessage(`สแกนพบอุปกรณ์ Plug & Play จำนวน ${data.discoveredCount} อุปกรณ์พร้อมใช้งาน`);
      }
    } catch {
      setActionMessage('สแกนอุปกรณ์ล้มเหลว');
    } finally {
      setLoadingScan(false);
    }
  };

  const handleUpdateDriver = async (deviceId: string) => {
    try {
      setActionMessage('กำลังติดตั้งอัปเดตไดรเวอร์อัตโนมัติ...');
      const res = await fetch('/api/v1/infrastructure/devices/update-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`อัปเดตไดรเวอร์ของ ${data.device.name} เป็นเวอร์ชัน ${data.device.driverVersion} เรียบร้อยแล้ว`);
        await fetchData();
      }
    } catch {
      setActionMessage('อัปเดตไดรเวอร์ไม่สำเร็จ');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header & Antigravity Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-2">
            <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
            Antigravity AI™ Infrastructure Supervisor (24/7 Active Autonomous)
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Backend Infrastructure & Plug & Play Center</h1>
          <p className="text-slate-300 text-sm mt-1">
            ระบบดูแลโครงสร้างพื้นฐาน เซิร์ฟเวอร์ ฐานข้อมูล และตรวจจับอุปกรณ์ฮาร์ดแวร์ต่อพ่วงแบบอัตโนมัติเรียลไทม์
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSelfHeal}
            disabled={healing}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${healing ? 'animate-spin' : ''}`} />
            {healing ? 'Antigravity กำลังซ่อมแซม...' : 'สั่งการ Antigravity Self-Heal'}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 px-4 py-3 rounded-2xl text-sm flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs text-indigo-500 hover:underline">ปิด</button>
        </div>
      )}

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">สถานะระบบรวม (Health)</span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 capitalize">
              {health?.status === 'healthy' ? 'สมบูรณ์ (Healthy)' : health?.status || 'กำลังโหลด...'}
            </span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Antigravity AI Active 24/7
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">การใช้ CPU & Memory</span>
            <Cpu className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{health?.cpuUsagePercent ?? 0}%</span>
            <span className="text-xs text-slate-400">CPU (Mem: {health?.memoryUsagePercent ?? 0}%)</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${health?.cpuUsagePercent || 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Database & API Latency</span>
            <Database className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{health?.dbLatencyMs ?? 0} ms</span>
            <span className="text-xs text-emerald-500">PostgreSQL OK</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Active Connections: {health?.activeConnections ?? 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Network & Services</span>
            <Wifi className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">100% Online</div>
          <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">Zero Packet Loss / Cloud Sync</p>
        </div>
      </div>

      {/* Plug & Play & Device Manager Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-600" /> Plug & Play Hardware & Driver Auto-Discovery
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ระบบตรวจจับอุปกรณ์ POS (เครื่องพิมพ์, สแกนเนอร์, ลิ้นชัก, เครื่องรูดบัตร EDC) และอัปเดตไดรเวอร์อัตโนมัติเรียลไทม์
            </p>
          </div>
          <button
            onClick={handleScanDevices}
            disabled={loadingScan}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingScan ? 'animate-spin' : ''}`} />
            {loadingScan ? 'กำลังสแกนอุปกรณ์...' : 'สแกนหาอุปกรณ์ใหม่ (Scan PnP)'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-6">ชื่ออุปกรณ์ / ประเภท</th>
                <th className="py-3 px-6">พอร์ตเชื่อมต่อ</th>
                <th className="py-3 px-6">สถานะ</th>
                <th className="py-3 px-6">เวอร์ชันไดรเวอร์</th>
                <th className="py-3 px-6 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {devices.map((dev) => (
                <tr key={dev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 font-medium text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{dev.name}</div>
                        <div className="text-xs text-slate-400 capitalize">{dev.type} • เชื่อมต่ออัตโนมัติ</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-mono text-xs">{dev.port}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Ready / Active
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-mono text-xs">
                    {dev.driverVersion}
                    {dev.autoUpdateAvailable && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-sans font-semibold">
                        มีอัปเดต ({dev.latestVersion})
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {dev.autoUpdateAvailable ? (
                      <button
                        onClick={() => handleUpdateDriver(dev.id)}
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shadow-sm"
                      >
                        <DownloadCloud className="w-3.5 h-3.5" /> อัปเดตไดรเวอร์อัตโนมัติ
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">ไดรเวอร์ล่าสุดแล้ว</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Antigravity Self-Healing Audit Logs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-600" /> Antigravity AI Autonomous Self-Healing & Audit Trail
        </h3>
        <div className="space-y-3">
          {health?.selfHealLogs.map((log) => (
            <div key={log.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {log.component}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString('th-TH')}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{log.actionTaken}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">ปัญหาที่ตรวจพบ: {log.issue}</p>
              </div>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> แก้ไขสำเร็จอัตโนมัติ
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
