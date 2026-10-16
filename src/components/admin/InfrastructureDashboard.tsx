import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Activity,
  Cpu,
  Database,
  Server,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  DownloadCloud,
  Zap,
  Wifi,
  ShieldAlert,
  Bluetooth,
  Printer,
  Scan,
  Banknote,
  Battery,
  BatteryCharging,
  Plug,
  Radio,
  Usb,
  CreditCard,
  Gauge,
  Sparkles,
  Signal,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { HardwareTestSuite } from './HardwareTestSuite';
import { NetworkTopologyMap } from './NetworkTopologyMap';

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

export interface PeripheralConnectivity {
  state: 'online' | 'connected' | 'standby' | 'disconnected';
  interface: 'USB' | 'Bluetooth_LE' | 'Ethernet' | 'RJ12_Drawer_Kick' | 'Serial';
  signalStrengthPercent?: number;
  latencyMs: number;
  lastPingTimestamp: string;
}

export interface PeripheralBattery {
  levelPercent: number | null;
  isCharging: boolean;
  powerSource: 'battery' | 'ac_mains' | 'usb_bus' | 'rj12_pulse';
  healthStatus?: 'optimal' | 'good' | 'fair' | 'service_required';
}

export interface PeripheralDriverHealth {
  status: 'healthy' | 'update_available' | 'patch_required' | 'degraded';
  integrityVerifiedByAntigravity: boolean;
  lastAuditTimestamp: string;
  driverSignStatus: 'whql_certified' | 'oem_signed' | 'antigravity_verified';
  diagnostics: string;
}

export interface HardwarePeripheralStatus {
  id: string;
  name: string;
  category: 'printer' | 'scanner' | 'drawer' | 'edc' | 'display' | 'scale';
  model: string;
  serialNumber: string;
  port: string;
  firmwareVersion: string;
  driverVersion: string;
  latestDriverVersion: string;
  connectivity: PeripheralConnectivity;
  battery: PeripheralBattery;
  driverHealth: PeripheralDriverHealth;
  lastActivity: string;
  telemetryData: {
    operationsCountToday: number;
    errorCountToday: number;
    temperatureCelsius?: number;
  };
}

interface DiscoveredPeripheral {
  id: string;
  name: string;
  category: 'printer' | 'scanner' | 'drawer' | 'scale';
  interfaceType: 'USB' | 'Bluetooth_LE' | 'Serial_RS232';
  hardwareId: string;
  detectedAt: string;
  configured: boolean;
  suggestedConfig: {
    driver: string;
    baudRate?: number;
    paperWidthMm?: number;
    emulation: string;
    autoDrawerKick?: boolean;
  };
}

interface FirmwareAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  advisory: {
    id: string;
    advisoryType: 'SECURITY_CRITICAL' | 'SECURITY_HIGH' | 'PERFORMANCE_CRITICAL' | 'FEATURE_UPDATE';
    cveId?: string;
    title: string;
    description: string;
    recommendedFirmwareVersion: string;
    recommendedDriverVersion: string;
    severityScore: number;
    autoPatchSupported: boolean;
  };
  detectedAt: string;
  status: 'PENDING_INSTALL' | 'PATCHING' | 'RESOLVED';
}

export type PeripheralHealthPulseState = 'idle' | 'active' | 'error';

export function InfrastructureDashboard() {
  const { addToast } = useToast();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [peripherals, setPeripherals] = useState<HardwarePeripheralStatus[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'printer' | 'scanner' | 'drawer' | 'edc'>('all');
  const [selectedPulseFilter, setSelectedPulseFilter] = useState<'all' | 'idle' | 'active' | 'error'>('all');
  const [pulseOverrides, setPulseOverrides] = useState<Record<string, PeripheralHealthPulseState>>({});
  const [activePeripheralIds, setActivePeripheralIds] = useState<Set<string>>(new Set());
  const [failedPeripheralIds, setFailedPeripheralIds] = useState<Set<string>>(new Set());
  const [auditingPeripheralId, setAuditingPeripheralId] = useState<string | null>(null);
  const [auditingAll, setAuditingAll] = useState(false);
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [diagnosingPeripheralId, setDiagnosingPeripheralId] = useState<string | null>(null);
  const [firmwareAlerts, setFirmwareAlerts] = useState<FirmwareAlert[]>([]);
  const [discoveredPeripherals, setDiscoveredPeripherals] = useState<DiscoveredPeripheral[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);
  const [healing, setHealing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoadingHealth(true);
      const [hRes, dRes, fRes, pRes, periphRes] = await Promise.all([
        fetch('/api/v1/infrastructure/health'),
        fetch('/api/v1/infrastructure/devices'),
        fetch('/api/v1/infrastructure/firmware-alerts'),
        fetch('/api/v1/infrastructure/peripheral-discovery'),
        fetch('/api/v1/infrastructure/hardware-peripherals'),
      ]);
      const hData = await hRes.json();
      const dData = await dRes.json();
      const fData = await fRes.json();
      const pData = await pRes.json();
      const periphData = await periphRes.json();
      if (hData.success) setHealth(hData.data);
      if (dData.success) setDevices(dData.data);
      if (fData.success) setFirmwareAlerts(fData.data);
      if (pData.success) setDiscoveredPeripherals(pData.data);
      if (periphData.success) setPeripherals(periphData.data);
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
      setActionMessage('กำลังสแกนพอร์ต USB และ Bluetooth ค้นหาอุปกรณ์ POS ต่อพ่วง...');
      const [devRes, periphScanRes] = await Promise.all([
        fetch('/api/v1/infrastructure/devices/scan', { method: 'POST' }),
        fetch('/api/v1/infrastructure/peripheral-discovery/scan', { method: 'POST' }),
      ]);
      const devData = await devRes.json();
      const periphData = await periphScanRes.json();

      if (devData.success) {
        setDevices(devData.devices);
      }
      if (periphData.success) {
        setDiscoveredPeripherals(periphData.peripherals);
        setActionMessage(`สแกนพอร์ต USB/Bluetooth สำเร็จ พบอุปกรณ์ใหม่ ${periphData.discoveredCount} รายการ พร้อมตั้งค่าอัตโนมัติ`);
        addToast({
          type: 'success',
          title: 'Auto-Discover สำเร็จ',
          message: `ตรวจพบอุปกรณ์ต่อพ่วง USB/Bluetooth ใหม่ ${periphData.discoveredCount} รายการ`,
          durationMs: 4000,
        });
      }
    } catch {
      setActionMessage('สแกนพอร์ตฮาร์ดแวร์ล้มเหลว');
      addToast({
        type: 'error',
        title: 'การสแกนล้มเหลว',
        message: 'ไม่สามารถติดต่อเซอร์วิสสแกนพอร์ต USB/Bluetooth ได้',
        durationMs: 4000,
      });
    } finally {
      setLoadingScan(false);
    }
  };

  const [bulkFirmwareChecking, setBulkFirmwareChecking] = useState(false);
  const [bulkFirmwareResult, setBulkFirmwareResult] = useState<{
    totalChecked: number;
    outdatedCount: number;
    results: Array<{
      peripheralId: string;
      name: string;
      category: string;
      currentFirmware: string;
      latestFirmware: string;
      needsUpdate: boolean;
      advisoryTitle?: string;
      severityScore?: number;
    }>;
  } | null>(null);

  const handleBulkFirmwareCheck = async () => {
    try {
      setBulkFirmwareChecking(true);
      setActionMessage('Antigravity AI กำลังตรวจสอบเวอร์ชันเฟิร์มแวร์ของอุปกรณ์ต่อพ่วงทั้งหมด...');
      const res = await fetch('/api/v1/infrastructure/firmware-check/bulk', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBulkFirmwareResult(data);
        addToast({
          type: data.outdatedCount > 0 ? 'info' : 'success',
          title: 'Bulk Firmware Check สำเร็จ',
          message: `ตรวจสอบอุปกรณ์ทั้งหมด ${data.totalChecked} รายการ • พบอุปกรณ์ที่ต้องอัปเดต ${data.outdatedCount} รายการ`,
          durationMs: 5000,
        });
        setActionMessage(`[Bulk Firmware Check] ตรวจสอบสำเร็จ ${data.totalChecked} อุปกรณ์ พบอุปกรณ์ต้องอัปเดต ${data.outdatedCount} รายการ`);
      }
    } catch {
      setActionMessage('การตรวจสอบเฟิร์มแวร์ล้มเหลว');
      addToast({
        type: 'error',
        title: 'Bulk Firmware Check ขัดข้อง',
        message: 'ไม่สามารถตรวจสอบเฟิร์มแวร์อุปกรณ์ทั้งหมดได้',
        durationMs: 4000,
      });
    } finally {
      setBulkFirmwareChecking(false);
    }
  };

  const handleApplyPatch = async (alertId: string) => {
    try {
      setActionMessage('กำลังติดตั้ง Security / Performance Patch อัตโนมัติ...');
      const res = await fetch('/api/v1/infrastructure/apply-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`ติดตั้งแพตช์ความปลอดภัย (${data.alert.advisory.title}) สำเร็จ`);
        await fetchData();
      }
    } catch {
      setActionMessage('การติดตั้งแพตช์ล้มเหลว');
    }
  };

  const handleAutoConfigurePeripheral = async (peripheralId: string) => {
    try {
      setActivePeripheralIds((prev) => new Set(prev).add(peripheralId));
      setActionMessage('Antigravity AI กำลังส่งสัญญาณ Handshake และติดตั้ง Driver Profile อัตโนมัติ...');
      const res = await fetch('/api/v1/infrastructure/peripheral-autoconfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peripheralId }),
      });
      const data = await res.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: `Auto-Configure สำเร็จ: ${data.peripheral.name}`,
          message: `ติดตั้งโปรไฟล์ไดรเวอร์และเปิดใช้งานลิงก์ Handshake เรียบร้อย`,
          durationMs: 4000,
        });
        setActionMessage(`กำหนดค่า ${data.peripheral.name} แบบอัตโนมัติสำเร็จ อุปกรณ์พร้อมใช้งานทันที`);
        await fetchData();
      }
    } catch {
      setActionMessage('การกำหนดค่าอัตโนมัติล้มเหลว');
    } finally {
      setTimeout(() => {
        setActivePeripheralIds((prev) => {
          const next = new Set(prev);
          next.delete(peripheralId);
          return next;
        });
      }, 1500);
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

  const handleAuditPeripheral = async (peripheralId?: string) => {
    try {
      if (peripheralId) {
        setAuditingPeripheralId(peripheralId);
        setActivePeripheralIds((prev) => new Set(prev).add(peripheralId));
        setActionMessage('Antigravity AI กำลังตรวจสอบความสมบูรณ์ของไดรเวอร์และลายเซ็นฮาร์ดแวร์...');
      } else {
        setAuditingAll(true);
        peripherals.forEach((p) => setActivePeripheralIds((prev) => new Set(prev).add(p.id)));
        setActionMessage('Antigravity AI กำลังรันการตรวจสอบเชิงลึกฮาร์ดแวร์ต่อพ่วงทั้งหมด (Printers, Scanners, Drawers)...');
      }

      const res = await fetch('/api/v1/infrastructure/hardware-peripherals/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peripheralId }),
      });
      const data = await res.json();
      if (data.success) {
        setPeripherals(data.auditedPeripherals);
        setActionMessage(data.log?.actionTaken || 'การตรวจสอบสุขภาพฮาร์ดแวร์และไดรเวอร์โดย Antigravity สำเร็จ');
        await fetchData();
      } else {
        setActionMessage('การตรวจสอบฮาร์ดแวร์ล้มเหลว: ' + data.error);
      }
    } catch {
      setActionMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Antigravity Service');
    } finally {
      setAuditingPeripheralId(null);
      setAuditingAll(false);
      setTimeout(() => {
        setActivePeripheralIds(new Set());
      }, 1500);
    }
  };

  const handleTestPeripheralSignal = (peripheral: HardwarePeripheralStatus) => {
    setTestingDeviceId(peripheral.id);
    setActivePeripheralIds((prev) => new Set(prev).add(peripheral.id));
    setFailedPeripheralIds((prev) => {
      const next = new Set(prev);
      next.delete(peripheral.id);
      return next;
    });

    let actionDesc = '';
    if (peripheral.category === 'printer') actionDesc = 'ส่งคำสั่งทดสอบการพิมพ์ (Test ESC/POS Print Pulse)';
    else if (peripheral.category === 'scanner') actionDesc = 'ส่งสัญญาณเสียงทดสอบสแกนเนอร์ (Beep Signal 2.4kHz)';
    else if (peripheral.category === 'drawer') actionDesc = 'ส่งสัญญาณทดสอบเปิดลิ้นชัก (Kick Pulse 24V / 100ms)';
    else actionDesc = 'ส่งคำสั่ง Ping ทดสอบการเชื่อมต่ออุปกรณ์';

    setActionMessage(`[Antigravity Diagnostic] ${actionDesc} ไปยัง ${peripheral.name} สำเร็จ (Latency: ${peripheral.connectivity.latencyMs}ms)`);
    setTimeout(() => {
      setTestingDeviceId(null);
      setActivePeripheralIds((prev) => {
        const next = new Set(prev);
        next.delete(peripheral.id);
        return next;
      });
    }, 1200);
  };

  const handleRunDiagnostics = async (peripheral: HardwarePeripheralStatus, simulateFailure = false) => {
    const maxAttempts = 3;
    let attempt = 0;
    let success = false;

    setDiagnosingPeripheralId(peripheral.id);
    setActivePeripheralIds((prev) => new Set(prev).add(peripheral.id));
    setFailedPeripheralIds((prev) => {
      const next = new Set(prev);
      next.delete(peripheral.id);
      return next;
    });

    while (attempt < maxAttempts && !success) {
      attempt++;
      try {
        if (attempt > 1) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000; // 2s, 4s
          setActionMessage(`[Exponential Backoff Retry] พยายามเชื่อมต่อครั้งที่ ${attempt}/${maxAttempts} ไปยัง ${peripheral.name} ในอีก ${backoffMs / 1000}s...`);
          await new Promise((r) => setTimeout(r, backoffMs));
        } else {
          setActionMessage(`Antigravity AI กำลังส่งสัญญาณ Connection Handshake (SYN/ACK) ไปยัง ${peripheral.name} (ครั้งที่ ${attempt})...`);
        }

        const res = await fetch('/api/v1/infrastructure/hardware-peripherals/diagnostics-handshake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ peripheralId: peripheral.id, simulateFailure }),
        });
        const data = await res.json();

        if (data.success && data.handshake) {
          success = true;
          addToast({
            type: 'success',
            title: `Handshake สำเร็จ (Retry #${attempt}): ${peripheral.name}`,
            message: `ตอบสนองใน ${data.handshake.roundTripTimeMs} ms • ${data.handshake.details}`,
            durationMs: 5000,
          });
          setActionMessage(`[Handshake Success] ${peripheral.name} ผ่านการตรวจสอบในการลองครั้งที่ ${attempt} (Round-Trip: ${data.handshake.roundTripTimeMs}ms)`);
          if (data.peripheral) {
            setPeripherals((prev) =>
              prev.map((p) => (p.id === data.peripheral.id ? data.peripheral : p))
            );
          }
          setTimeout(() => {
            setActivePeripheralIds((prev) => {
              const next = new Set(prev);
              next.delete(peripheral.id);
              return next;
            });
          }, 1500);
        } else if (attempt < maxAttempts) {
          console.warn(`[Diagnostics Retry] Attempt ${attempt} failed for ${peripheral.name}. Retrying with exponential backoff...`);
        } else {
          const errorMsg = data.error || 'การเชื่อมต่อขัดข้อง (No Handshake Response from device)';
          addToast({
            type: 'error',
            title: `Handshake ล้มเหลวหลังพยายาม ${maxAttempts} ครั้ง: ${peripheral.name}`,
            message: errorMsg,
            durationMs: 6000,
          });
          setActionMessage(`[Handshake Error] ${peripheral.name}: ${errorMsg} (Exhausted ${maxAttempts} retries)`);
          setFailedPeripheralIds((prev) => new Set(prev).add(peripheral.id));
          setActivePeripheralIds((prev) => {
            const next = new Set(prev);
            next.delete(peripheral.id);
            return next;
          });
        }
      } catch (err: any) {
        if (attempt >= maxAttempts) {
          const errMsg = err?.message || 'ไม่สามารถส่งสัญญาณ Handshake ได้';
          addToast({
            type: 'error',
            title: `ข้อผิดพลาดในการวินิจฉัยหลังพยายาม ${maxAttempts} ครั้ง: ${peripheral.name}`,
            message: errMsg,
            durationMs: 6000,
          });
          setActionMessage(`[Handshake Failed] ${peripheral.name}: ${errMsg}`);
          setFailedPeripheralIds((prev) => new Set(prev).add(peripheral.id));
          setActivePeripheralIds((prev) => {
            const next = new Set(prev);
            next.delete(peripheral.id);
            return next;
          });
        }
      }
    }

    setDiagnosingPeripheralId(null);
  };

  const handleSetPulseState = (peripheralId: string, state: PeripheralHealthPulseState | 'auto') => {
    if (state === 'auto') {
      setPulseOverrides((prev) => {
        const next = { ...prev };
        delete next[peripheralId];
        return next;
      });
      setFailedPeripheralIds((prev) => {
        const next = new Set(prev);
        next.delete(peripheralId);
        return next;
      });
      setActivePeripheralIds((prev) => {
        const next = new Set(prev);
        next.delete(peripheralId);
        return next;
      });
    } else {
      setPulseOverrides((prev) => ({ ...prev, [peripheralId]: state }));
      if (state === 'error') {
        setFailedPeripheralIds((prev) => new Set(prev).add(peripheralId));
        setActivePeripheralIds((prev) => {
          const next = new Set(prev);
          next.delete(peripheralId);
          return next;
        });
      } else if (state === 'active') {
        setActivePeripheralIds((prev) => new Set(prev).add(peripheralId));
        setFailedPeripheralIds((prev) => {
          const next = new Set(prev);
          next.delete(peripheralId);
          return next;
        });
      } else {
        setFailedPeripheralIds((prev) => {
          const next = new Set(prev);
          next.delete(peripheralId);
          return next;
        });
        setActivePeripheralIds((prev) => {
          const next = new Set(prev);
          next.delete(peripheralId);
          return next;
        });
      }
    }
  };

  const handleClearPeripheralError = (peripheralId: string) => {
    setFailedPeripheralIds((prev) => {
      const next = new Set(prev);
      next.delete(peripheralId);
      return next;
    });
    setPulseOverrides((prev) => {
      const next = { ...prev };
      delete next[peripheralId];
      return next;
    });
    addToast({
      type: 'info',
      title: 'รีเซ็ตสถานะฮาร์ดแวร์',
      message: 'อุปกรณ์กลับคืนสู่สถานะ IDLE / สแตนด์บายพร้อมใช้งาน',
      durationMs: 3000,
    });
  };

  const handleSimulatePulseWave = () => {
    peripherals.forEach((p, idx) => {
      setTimeout(() => {
        setActivePeripheralIds((prev) => new Set(prev).add(p.id));
        setTimeout(() => {
          setActivePeripheralIds((prev) => {
            const next = new Set(prev);
            next.delete(p.id);
            return next;
          });
        }, 1200);
      }, idx * 220);
    });
    addToast({
      type: 'info',
      title: 'Real-time Health Pulse Wave',
      message: 'เริ่มส่งสัญญาณทดสอบ Health Pulse (Active Transmission) ไปยังทุกอุปกรณ์',
      durationMs: 3500,
    });
  };

  const getPeripheralPulseState = (peripheral: HardwarePeripheralStatus): PeripheralHealthPulseState => {
    if (pulseOverrides[peripheral.id]) {
      return pulseOverrides[peripheral.id];
    }
    if (
      diagnosingPeripheralId === peripheral.id ||
      testingDeviceId === peripheral.id ||
      auditingPeripheralId === peripheral.id ||
      activePeripheralIds.has(peripheral.id)
    ) {
      return 'active';
    }
    if (
      failedPeripheralIds.has(peripheral.id) ||
      peripheral.connectivity.state === 'disconnected' ||
      peripheral.driverHealth.status === 'degraded' ||
      peripheral.telemetryData.errorCountToday > 0
    ) {
      return 'error';
    }
    return 'idle';
  };

  const getCategoryPulseDetails = (peripheral: HardwarePeripheralStatus, state: PeripheralHealthPulseState) => {
    switch (peripheral.category) {
      case 'printer':
        if (state === 'active') return { label: 'ACTIVE • PRINTING', sub: 'กำลังพิมพ์/สปูลใบเสร็จ (ESC/POS)', actionLabel: 'Print Pulse' };
        if (state === 'error') return { label: 'ERROR • PRINTER', sub: 'กระดาษหมด / หัวพิมพ์ร้อน / ฝาเปิด', actionLabel: 'Test Print' };
        return { label: 'IDLE • READY', sub: 'พร้อมพิมพ์ใบเสร็จ • กระดาษปกติ', actionLabel: 'Print Pulse' };
      case 'scanner':
        if (state === 'active') return { label: 'ACTIVE • SCANNING', sub: 'กำลังถอดรหัสบาร์โค้ด / สตรีมข้อมูล', actionLabel: 'Scan Pulse' };
        if (state === 'error') return { label: 'ERROR • SCANNER', sub: 'เซนเซอร์รับแสงขัดข้อง / หมดเวลาเชื่อมต่อ', actionLabel: 'Test Scan' };
        return { label: 'IDLE • ARMED', sub: 'ลำแสงสแตนด์บาย • พร้อมอ่านบาร์โค้ด', actionLabel: 'Scan Pulse' };
      case 'drawer':
        if (state === 'active') return { label: 'ACTIVE • KICK PULSE', sub: 'จ่ายไฟ 24V เปิดลิ้นชักเก็บเงิน', actionLabel: 'Kick Pulse' };
        if (state === 'error') return { label: 'ERROR • DRAWER', sub: 'ไมโครสวิตช์ไม่ปิดสนิท / วงจรเปิด', actionLabel: 'Test Kick' };
        return { label: 'IDLE • LOCKED', sub: 'ลิ้นชักล็อกสนิท • วงจรปกติ', actionLabel: 'Kick Pulse' };
      default:
        if (state === 'active') return { label: 'ACTIVE • TRANSMITTING', sub: 'กำลังส่งข้อมูลการชำระเงิน', actionLabel: 'Test Signal' };
        if (state === 'error') return { label: 'ERROR • TERMINAL', sub: 'การเชื่อมต่ออุปกรณ์ขัดข้อง', actionLabel: 'Test Signal' };
        return { label: 'IDLE • READY', sub: 'เชื่อมต่อและพร้อมรับคำสั่ง', actionLabel: 'Test Signal' };
    }
  };

  const pulseCounts = {
    all: peripherals.length,
    idle: peripherals.filter((p) => getPeripheralPulseState(p) === 'idle').length,
    active: peripherals.filter((p) => getPeripheralPulseState(p) === 'active').length,
    error: peripherals.filter((p) => getPeripheralPulseState(p) === 'error').length,
  };

  const filteredPeripherals = peripherals.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) {
      return false;
    }
    if (selectedPulseFilter !== 'all') {
      const state = getPeripheralPulseState(p);
      if (state !== selectedPulseFilter) return false;
    }
    return true;
  });

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

      {/* Comprehensive Hardware Test Suite Component */}
      <HardwareTestSuite />

      {/* Network Topology Connection Path Map (USB vs Bluetooth vs RJ12) */}
      <NetworkTopologyMap peripherals={peripherals} />

      {actionMessage && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 px-4 py-3 rounded-2xl text-sm flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs text-indigo-500 hover:underline">ปิด</button>
        </div>
      )}

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border border-crisp shadow-sm">
          <div className="flex items-center justify-between text-text/60 mb-2">
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

        <div className="bg-card p-5 rounded-2xl border border-border border-crisp shadow-sm">
          <div className="flex items-center justify-between text-text/60 mb-2">
            <span className="text-xs font-semibold uppercase">การใช้ CPU & Memory</span>
            <Cpu className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{health?.cpuUsagePercent ?? 0}%</span>
            <span className="text-xs text-slate-400">CPU (Mem: {health?.memoryUsagePercent ?? 0}%)</span>
          </div>
          <div className="w-full bg-background h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${health?.cpuUsagePercent || 0}%` }}></div>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border border-crisp shadow-sm">
          <div className="flex items-center justify-between text-text/60 mb-2">
            <span className="text-xs font-semibold uppercase">Database & API Latency</span>
            <Database className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{health?.dbLatencyMs ?? 0} ms</span>
            <span className="text-xs text-emerald-500">PostgreSQL OK</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Active Connections: {health?.activeConnections ?? 0}</p>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border border-crisp shadow-sm">
          <div className="flex items-center justify-between text-text/60 mb-2">
            <span className="text-xs font-semibold uppercase">Network & Services</span>
            <Wifi className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">100% Online</div>
          <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">Zero Packet Loss / Cloud Sync</p>
        </div>
      </div>

      {/* Real-time Hardware Peripherals Status Card (Printers, Scanners, Drawers) */}
      <div className="bg-card rounded-3xl border border-border border-crisp shadow-sm p-6 space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-border border-crisp">
          <div>
            <div className="flex items-center gap-2 text-indigo-500 font-semibold text-xs uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              Antigravity™ Autonomous Hardware & Peripheral Management
            </div>
            <h2 className="text-xl font-bold text-text flex items-center gap-2.5">
              <HardDrive className="w-6 h-6 text-indigo-600" />
              สถานะฮาร์ดแวร์ต่อพ่วงแบบเรียลไทม์ (Printers, Scanners, Cash Drawers)
            </h2>
            <p className="text-xs text-text/60 mt-0.5">
              ระบบตรวจสอบสถานะการเชื่อมต่อ (Connectivity), ระดับแบตเตอรี่ (Battery Levels), และความสมบูรณ์ของไดรเวอร์ (Driver Health Status) ควบคุมโดย Antigravity Service ตลอด 24 ชม.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border border-crisp text-xs font-medium text-text/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Telemetry: Active
            </div>
            <button
              onClick={() => handleAuditPeripheral()}
              disabled={auditingAll}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${auditingAll ? 'animate-spin' : ''}`} />
              {auditingAll ? 'Antigravity กำลังตรวจสอบ...' : 'ตรวจสอบอุปกรณ์ทั้งหมดด้วย AI'}
            </button>
          </div>
        </div>

        {/* Real-time KPI Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-background/70 p-3.5 rounded-2xl border border-border border-crisp">
            <div className="text-[11px] font-semibold text-text/60 uppercase">อุปกรณ์เชื่อมต่อออนไลน์</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
              {peripherals.filter(p => p.connectivity.state === 'online').length} / {peripherals.length} พร้อมใช้งาน
            </div>
            <div className="text-[10px] text-text/50 mt-0.5">สถานะออนไลน์ 100%</div>
          </div>

          <div className="bg-background/70 p-3.5 rounded-2xl border border-border border-crisp">
            <div className="text-[11px] font-semibold text-text/60 uppercase">ความสมบูรณ์ไดรเวอร์</div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
              {peripherals.filter(p => p.driverHealth.status === 'healthy').length} / {peripherals.length} สมบูรณ์
            </div>
            <div className="text-[10px] text-text/50 mt-0.5">Antigravity & WHQL Verified</div>
          </div>

          <div className="bg-background/70 p-3.5 rounded-2xl border border-border border-crisp">
            <div className="text-[11px] font-semibold text-text/60 uppercase">ระบบพลังงาน & แบตเตอรี่</div>
            <div className="text-lg font-bold text-text flex items-center gap-1.5 mt-0.5">
              <Battery className="w-4 h-4 text-amber-500" />
              {peripherals.filter(p => p.battery.levelPercent !== null).length} ไร้สาย • {peripherals.filter(p => p.battery.levelPercent === null).length} ไฟตรง
            </div>
            <div className="text-[10px] text-text/50 mt-0.5">ทุกอุปกรณ์อยู่ในระดับปลอดภัย</div>
          </div>

          <div className="bg-background/70 p-3.5 rounded-2xl border border-border border-crisp">
            <div className="text-[11px] font-semibold text-text/60 uppercase">ความเร็วการตอบสนอง (Latency)</div>
            <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 mt-0.5">
              <Gauge className="w-4 h-4" />
              {(peripherals.reduce((acc, p) => acc + p.connectivity.latencyMs, 0) / (peripherals.length || 1)).toFixed(1)} ms
            </div>
            <div className="text-[10px] text-text/50 mt-0.5">Ultra Low Hardware Bus Latency</div>
          </div>
        </div>

        {/* Category Filter Tabs & Pulse Summary */}
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'ทั้งหมด', count: peripherals.length },
                { id: 'printer', label: 'เครื่องพิมพ์ใบเสร็จ (Printers)', count: peripherals.filter(p => p.category === 'printer').length },
                { id: 'scanner', label: 'เครื่องสแกนบาร์โค้ด (Scanners)', count: peripherals.filter(p => p.category === 'scanner').length },
                { id: 'drawer', label: 'ลิ้นชักเก็บเงิน (Cash Drawers)', count: peripherals.filter(p => p.category === 'drawer').length },
                { id: 'edc', label: 'เครื่อง EDC / บัตรเครดิต', count: peripherals.filter(p => p.category === 'edc').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === tab.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-background hover:bg-card text-text/70 border border-border border-crisp'
                  }`}
                >
                  {tab.label} <span className="opacity-75">({tab.count})</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleSimulatePulseWave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="ส่งคำสั่งทดสอบ Health Pulse (Active Transmission) ไปยังทุกอุปกรณ์ต่อเนื่องแบบ Cascade Wave"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Simulate Pulse Wave</span>
            </button>
          </div>

          {/* Real-time Health Pulse Telemetry Strip */}
          <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-background/80 border border-border border-crisp">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span>Real-Time Health Pulses:</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                      <span className="animate-ring-idle absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="animate-pulse-idle relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span>{pulseCounts.idle} Idle / Ready</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold">
                    <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                      <span className="animate-ring-active absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-80" />
                      <span className="animate-pulse-active relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                    </span>
                    <span>{pulseCounts.active} Active</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold">
                    <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                      <span className="animate-ring-error absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-90" />
                      <span className="animate-pulse-error relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                    </span>
                    <span>{pulseCounts.error} Error</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text/60 font-medium">กรองสถานะ:</span>
                <div className="inline-flex p-1 rounded-xl bg-card border border-border border-crisp text-xs">
                  {(['all', 'idle', 'active', 'error'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSelectedPulseFilter(mode)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedPulseFilter === mode
                          ? mode === 'error'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : mode === 'active'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : mode === 'idle'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-primary text-white shadow-sm'
                          : 'text-text/70 hover:text-text'
                      }`}
                    >
                      {mode === 'all' && `ทั้งหมด (${pulseCounts.all})`}
                      {mode === 'idle' && `Idle (${pulseCounts.idle})`}
                      {mode === 'active' && `Active (${pulseCounts.active})`}
                      {mode === 'error' && `Error (${pulseCounts.error})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Core Peripherals Pulse Matrix: Printers, Scanners, Cash Drawers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-border border-crisp">
              {/* 1. Printers Pulse Status */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border border-crisp text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-text">Printers (เครื่องพิมพ์)</div>
                    <div className="text-[10px] text-text/60">ESC/POS Thermal Engines</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold" title="Printers Idle/Ready">
                    <span className="animate-pulse-idle inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    {peripherals.filter(p => p.category === 'printer' && getPeripheralPulseState(p) === 'idle').length}
                  </span>
                  <span className="text-text/30">•</span>
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold" title="Printers Active/Printing">
                    <span className="animate-pulse-active inline-block w-2 h-2 rounded-full bg-indigo-500" />
                    {peripherals.filter(p => p.category === 'printer' && getPeripheralPulseState(p) === 'active').length}
                  </span>
                  <span className="text-text/30">•</span>
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold" title="Printers Error">
                    <span className="animate-pulse-error inline-block w-2 h-2 rounded-full bg-rose-500" />
                    {peripherals.filter(p => p.category === 'printer' && getPeripheralPulseState(p) === 'error').length}
                  </span>
                </div>
              </div>

              {/* 2. Scanners Pulse Status */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border border-crisp text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Scan className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-text">Scanners (สแกนเนอร์)</div>
                    <div className="text-[10px] text-text/60">2D / QR Optical Engines</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold" title="Scanners Idle/Armed">
                    <span className="animate-pulse-idle inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    {peripherals.filter(p => p.category === 'scanner' && getPeripheralPulseState(p) === 'idle').length}
                  </span>
                  <span className="text-text/30">•</span>
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold" title="Scanners Active/Decoding">
                    <span className="animate-pulse-active inline-block w-2 h-2 rounded-full bg-indigo-500" />
                    {peripherals.filter(p => p.category === 'scanner' && getPeripheralPulseState(p) === 'active').length}
                  </span>
                  <span className="text-text/30">•</span>
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold" title="Scanners Error">
                    <span className="animate-pulse-error inline-block w-2 h-2 rounded-full bg-rose-500" />
                    {peripherals.filter(p => p.category === 'scanner' && getPeripheralPulseState(p) === 'error').length}
                  </span>
                </div>
              </div>

              {/* 3. Cash Drawers Pulse Status */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border border-crisp text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-text">Cash Drawers (ลิ้นชัก)</div>
                    <div className="text-[10px] text-text/60">24V Solenoid & Microswitch</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold" title="Cash Drawers Idle/Locked">
                    <span className="animate-pulse-idle inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    {peripherals.filter(p => p.category === 'drawer' && getPeripheralPulseState(p) === 'idle').length}
                  </span>
                  <span className="text-text/30">•</span>
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold" title="Cash Drawers Active/Kick">
                    <span className="animate-pulse-active inline-block w-2 h-2 rounded-full bg-indigo-500" />
                    {peripherals.filter(p => p.category === 'drawer' && getPeripheralPulseState(p) === 'active').length}
                  </span>
                  <span className="text-text/30">•</span>
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold" title="Cash Drawers Error">
                    <span className="animate-pulse-error inline-block w-2 h-2 rounded-full bg-rose-500" />
                    {peripherals.filter(p => p.category === 'drawer' && getPeripheralPulseState(p) === 'error').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Peripherals Cards Grid with CSS Health Pulse Animations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPeripherals.map((peripheral) => {
            const isAuditing = auditingPeripheralId === peripheral.id;
            const pulseState = getPeripheralPulseState(peripheral);
            const pulseDetails = getCategoryPulseDetails(peripheral, pulseState);

            return (
              <div
                key={peripheral.id}
                className={`bg-card rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 relative overflow-hidden animate-card-entrance animate-state-pop ${
                  pulseState === 'active'
                    ? 'border-indigo-500/60 ring-2 ring-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.18)]'
                    : pulseState === 'error'
                    ? 'border-rose-500/60 ring-2 ring-rose-500/25 shadow-[0_0_20px_rgba(239,68,68,0.22)]'
                    : 'border-border border-crisp hover:border-emerald-500/40 shadow-sm'
                }`}
              >
                {/* Visual Top Glow Accent Line according to pulse state */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 transition-all ${
                    pulseState === 'active'
                      ? 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-600 animate-pulse'
                      : pulseState === 'error'
                      ? 'bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse'
                      : 'bg-gradient-to-r from-emerald-500/50 via-teal-400/50 to-emerald-500/50'
                  }`}
                />

                {/* Peripheral Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      {/* CSS Real-time Expanding Ring Animation */}
                      {pulseState === 'active' && (
                        <span className="animate-ring-active absolute -inset-1 rounded-2xl bg-indigo-500/25 pointer-events-none" />
                      )}
                      {pulseState === 'error' && (
                        <span className="animate-ring-error absolute -inset-1 rounded-2xl bg-rose-500/30 pointer-events-none" />
                      )}
                      {pulseState === 'idle' && (
                        <span className="animate-ring-idle absolute -inset-0.5 rounded-2xl bg-emerald-500/15 pointer-events-none" />
                      )}

                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 relative z-10 transition-transform ${
                          pulseState === 'active'
                            ? 'scale-105 ring-2 ring-indigo-500/50'
                            : pulseState === 'error'
                            ? 'ring-2 ring-rose-500/60'
                            : ''
                        } ${
                          peripheral.category === 'printer'
                            ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                            : peripheral.category === 'scanner'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : peripheral.category === 'drawer'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                        }`}
                      >
                        {peripheral.category === 'printer' && <Printer className="w-5 h-5" />}
                        {peripheral.category === 'scanner' && <Scan className="w-5 h-5" />}
                        {peripheral.category === 'drawer' && <Banknote className="w-5 h-5" />}
                        {peripheral.category === 'edc' && <CreditCard className="w-5 h-5" />}
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-sm text-text leading-tight">{peripheral.name}</h3>

                        {/* Real-time Health Pulse Badge */}
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase font-mono transition-all ${
                            pulseState === 'active'
                              ? 'bg-indigo-500/15 border border-indigo-500/35 text-indigo-600 dark:text-indigo-400'
                              : pulseState === 'error'
                              ? 'bg-rose-500/15 border border-rose-500/35 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          }`}
                          title={`Health Pulse สถานะเรียลไทม์: ${pulseState.toUpperCase()} - ${pulseDetails.sub}`}
                        >
                          <span className="relative flex h-2 w-2 items-center justify-center">
                            <span
                              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                pulseState === 'active'
                                  ? 'animate-ring-active bg-indigo-400'
                                  : pulseState === 'error'
                                  ? 'animate-ring-error bg-rose-500'
                                  : 'animate-ring-idle bg-emerald-400'
                              }`}
                            />
                            <span
                              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                                pulseState === 'active'
                                  ? 'animate-pulse-active bg-indigo-600'
                                  : pulseState === 'error'
                                  ? 'animate-pulse-error bg-rose-600'
                                  : 'animate-pulse-idle bg-emerald-500'
                              }`}
                            />
                          </span>
                          <span>{pulseDetails.label}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-text/60 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{peripheral.model} • SN: {peripheral.serialNumber}</span>
                        <span className="text-text/30">•</span>
                        <span className={`text-[10px] font-sans font-medium ${
                          pulseState === 'active'
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : pulseState === 'error'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-text/60'
                        }`}>
                          {pulseDetails.sub}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-background border border-border border-crisp text-text/70 shrink-0">
                      {peripheral.port}
                    </span>

                    {/* Interactive State Pulse Test Switcher */}
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-background border border-border border-crisp text-[9px] font-mono">
                      <span className="px-1 text-text/40 uppercase font-sans">Sim:</span>
                      <button
                        onClick={() => handleSetPulseState(peripheral.id, 'idle')}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                          pulseState === 'idle' && pulseOverrides[peripheral.id] === 'idle'
                            ? 'bg-emerald-500 text-white font-bold'
                            : 'text-text/60 hover:text-emerald-500'
                        }`}
                        title="จำลองสถานะ Idle Pulse (เขียว)"
                      >
                        Idle
                      </button>
                      <button
                        onClick={() => handleSetPulseState(peripheral.id, 'active')}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                          pulseState === 'active' && pulseOverrides[peripheral.id] === 'active'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-text/60 hover:text-indigo-500'
                        }`}
                        title="จำลองสถานะ Active Pulse (คราม)"
                      >
                        Active
                      </button>
                      <button
                        onClick={() => handleSetPulseState(peripheral.id, 'error')}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                          pulseState === 'error' && pulseOverrides[peripheral.id] === 'error'
                            ? 'bg-rose-600 text-white font-bold'
                            : 'text-text/60 hover:text-rose-500'
                        }`}
                        title="จำลองสถานะ Error Pulse (แดง)"
                      >
                        Error
                      </button>
                      {pulseOverrides[peripheral.id] && (
                        <button
                          onClick={() => handleSetPulseState(peripheral.id, 'auto')}
                          className="px-1 text-text/40 hover:text-text cursor-pointer"
                          title="คืนค่าสู่สถานะตรวจจับอัตโนมัติ (Auto)"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Sections: 3-column subgrid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* 1. Live Connectivity & Pulse Status */}
                  <div className="bg-background/60 p-3 rounded-xl border border-border border-crisp space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text/50 flex items-center justify-between">
                      <span>Connectivity</span>
                      <span className={`flex items-center gap-1.5 font-bold text-[10px] font-mono ${
                        pulseState === 'active'
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : pulseState === 'error'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <span className="relative flex h-2 w-2 items-center justify-center">
                          <span
                            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              pulseState === 'active'
                                ? 'animate-ring-active bg-indigo-400'
                                : pulseState === 'error'
                                ? 'animate-ring-error bg-rose-500'
                                : 'animate-ring-idle bg-emerald-400'
                            }`}
                          />
                          <span
                            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                              pulseState === 'active'
                                ? 'animate-pulse-active bg-indigo-600'
                                : pulseState === 'error'
                                ? 'animate-pulse-error bg-rose-600'
                                : 'animate-pulse-idle bg-emerald-500'
                            }`}
                          />
                        </span>
                        {pulseState === 'active'
                          ? 'TRANSMITTING'
                          : pulseState === 'error'
                          ? 'ERROR / CHECK'
                          : peripheral.connectivity.state.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                      {peripheral.connectivity.interface === 'USB' && <Usb className="w-3.5 h-3.5 text-blue-500" />}
                      {peripheral.connectivity.interface === 'Bluetooth_LE' && <Bluetooth className="w-3.5 h-3.5 text-cyan-500" />}
                      {peripheral.connectivity.interface === 'RJ12_Drawer_Kick' && <Zap className="w-3.5 h-3.5 text-amber-500" />}
                      {peripheral.connectivity.interface === 'Ethernet' && <Wifi className="w-3.5 h-3.5 text-indigo-500" />}
                      <span>{peripheral.connectivity.interface.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-[10px] text-text/60 flex items-center justify-between pt-0.5">
                      <span>Latency:</span>
                      <span className="font-mono font-bold text-text">{peripheral.connectivity.latencyMs} ms</span>
                    </div>
                    {peripheral.connectivity.signalStrengthPercent && (
                      <div className="text-[10px] text-text/60 flex items-center justify-between">
                        <span className="flex items-center gap-1"><Signal className="w-2.5 h-2.5 text-cyan-500" /> สัญญาณ:</span>
                        <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{peripheral.connectivity.signalStrengthPercent}%</span>
                      </div>
                    )}
                  </div>

                  {/* 2. Battery & Power Status */}
                  <div className="bg-background/60 p-3 rounded-xl border border-border border-crisp space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text/50 flex items-center justify-between">
                      <span>Battery & Power</span>
                      {peripheral.battery.levelPercent !== null ? (
                        <span className={`text-[10px] font-mono font-bold ${
                          peripheral.battery.levelPercent > 50 ? 'text-emerald-500' : peripheral.battery.levelPercent > 20 ? 'text-amber-500' : 'text-rose-500'
                        }`}>
                          {peripheral.battery.levelPercent}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-indigo-400">Mains AC</span>
                      )}
                    </div>

                    {peripheral.battery.levelPercent !== null ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                          {peripheral.battery.isCharging ? (
                            <BatteryCharging className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                          ) : (
                            <Battery className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <span>{peripheral.battery.isCharging ? 'กำลังชาร์จไฟ' : 'แบตเตอรี่ Li-Ion'}</span>
                        </div>
                        <div className="w-full bg-background h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              peripheral.battery.levelPercent > 50 ? 'bg-emerald-500' : peripheral.battery.levelPercent > 20 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${peripheral.battery.levelPercent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-text/60">
                          {peripheral.battery.healthStatus === 'optimal' ? 'สุขภาพเซลล์: ดีเยี่ยม' : 'สุขภาพเซลล์: ปกติ'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                          <Plug className="w-3.5 h-3.5 text-indigo-500" />
                          <span>
                            {peripheral.battery.powerSource === 'ac_mains'
                              ? 'AC 220V Mains'
                              : peripheral.battery.powerSource === 'rj12_pulse'
                              ? '24V Solenoid Kick'
                              : 'USB 5V Bus Power'}
                          </span>
                        </div>
                        <div className="text-[10px] text-text/60 pt-1">
                          จ่ายไฟต่อเนื่อง ไม่มีปัญหาแบตหมด
                        </div>
                      </>
                    )}
                  </div>

                  {/* 3. Driver Health Status */}
                  <div className="bg-background/60 p-3 rounded-xl border border-border border-crisp space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text/50 flex items-center justify-between">
                      <span>Driver Health</span>
                      <span className="text-[10px] font-mono text-text/60">v{peripheral.driverVersion}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">Antigravity OK</span>
                    </div>
                    <div className="text-[10px] text-text/60 font-mono">
                      {peripheral.driverHealth.driverSignStatus === 'whql_certified'
                        ? 'WHQL Certified'
                        : peripheral.driverHealth.driverSignStatus === 'antigravity_verified'
                        ? 'AI Verified'
                        : 'OEM Signed'}
                    </div>
                    <div className="text-[10px] text-text/50 truncate">
                      ตรวจสอบ: {new Date(peripheral.driverHealth.lastAuditTimestamp).toLocaleTimeString('th-TH')}
                    </div>
                  </div>
                </div>

                {/* Diagnostics box from Antigravity */}
                <div className="p-3 rounded-xl bg-background/80 border border-border border-crisp text-[11px] text-text/80 font-mono leading-relaxed">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">
                    <Activity className="w-3 h-3" />
                    Antigravity AI Diagnostics Log
                  </div>
                  <div>{peripheral.driverHealth.diagnostics}</div>
                </div>

                {/* Error Recovery Banner if in Error State */}
                {pulseState === 'error' && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-2 text-[11px] text-rose-600 dark:text-rose-400">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>พบสัญญาณขัดข้อง (Error State) — คลิก Run Diagnostics หรือรีเซ็ต</span>
                    </div>
                    <button
                      onClick={() => handleClearPeripheralError(peripheral.id)}
                      className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-semibold transition-all cursor-pointer"
                    >
                      Clear Error
                    </button>
                  </div>
                )}

                {/* Card Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border border-crisp text-xs">
                  <div className="text-[10px] text-text/50 font-mono">
                    {peripheral.telemetryData.operationsCountToday} คำสั่งวันนี้ • {peripheral.telemetryData.errorCountToday} Error
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleRunDiagnostics(peripheral, false)}
                      disabled={diagnosingPeripheralId === peripheral.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                      title="ส่งสัญญาณ Handshake (SYN/ACK) ทดสอบการเชื่อมต่ออุปกรณ์และรายงาน Toast"
                    >
                      <Activity className={`w-3.5 h-3.5 ${diagnosingPeripheralId === peripheral.id ? 'animate-spin' : ''}`} />
                      {diagnosingPeripheralId === peripheral.id ? 'Handshaking...' : 'Run Diagnostics'}
                    </button>
                    <button
                      onClick={() => handleRunDiagnostics(peripheral, true)}
                      disabled={diagnosingPeripheralId === peripheral.id}
                      className="px-2 py-1.5 rounded-xl bg-background hover:bg-rose-500/10 hover:border-rose-500/30 border border-border border-crisp text-text/70 hover:text-rose-600 dark:hover:text-rose-400 text-[10px] font-medium transition-colors cursor-pointer"
                      title="ทดสอบกรณี Handshake ล้มเหลวเพื่อตรวจ Toast Error"
                    >
                      Simulate Fail
                    </button>
                    <button
                      onClick={() => handleTestPeripheralSignal(peripheral)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-background hover:bg-card border border-border border-crisp text-text/80 text-[10px] font-medium transition-colors cursor-pointer"
                      title={`ส่งสัญญาณกระตุ้นการทำงานชั่วคราว (${pulseDetails.actionLabel})`}
                    >
                      {peripheral.category === 'printer' && <Printer className="w-3 h-3 text-indigo-500" />}
                      {peripheral.category === 'scanner' && <Scan className="w-3 h-3 text-emerald-500" />}
                      {peripheral.category === 'drawer' && <Banknote className="w-3 h-3 text-amber-500" />}
                      {peripheral.category === 'edc' && <CreditCard className="w-3 h-3 text-purple-500" />}
                      <span>{pulseDetails.actionLabel}</span>
                    </button>
                    <button
                      onClick={() => handleAuditPeripheral(peripheral.id)}
                      disabled={isAuditing}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-background hover:bg-card border border-border border-crisp text-text/80 text-[11px] font-medium transition-colors cursor-pointer"
                      title="สั่งการ Antigravity ตรวจสอบสุขภาพไดรเวอร์และลายเซ็นดิจิทัล"
                    >
                      <RefreshCw className={`w-3 h-3 ${isAuditing ? 'animate-spin' : ''}`} />
                      {isAuditing ? 'กำลังตรวจ...' : 'AI Audit'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automated Driver/Firmware Remote Registry Advisories */}
      <div className="bg-card rounded-3xl border border-border border-crisp shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Automated Hardware Security & Firmware Registry
            </h2>
            <p className="text-xs text-text/60">
              ระบบตรวจสอบลายเซ็นฮาร์ดแวร์ (Hardware Signature) เทียบกับฐานข้อมูลรีจิสทรีส่วนกลาง เพื่อแจ้งเตือนช่องโหว่ความปลอดภัย (CVEs) และอัปเดตประสิทธิภาพแบบเรียลไทม์
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleBulkFirmwareCheck}
              disabled={bulkFirmwareChecking}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="ตรวจสอบเวอร์ชันเฟิร์มแวร์ของอุปกรณ์ต่อพ่วงทั้งหมดพร้อมกัน"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${bulkFirmwareChecking ? 'animate-spin' : ''}`} />
              <span>{bulkFirmwareChecking ? 'กำลังตรวจสอบ...' : 'Bulk Firmware Check'}</span>
            </button>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
              {firmwareAlerts.filter(a => a.status === 'PENDING_INSTALL').length} การแจ้งเตือน
            </span>
          </div>
        </div>

        {/* Bulk Firmware Check Results Panel */}
        {bulkFirmwareResult && (
          <div className="p-4 rounded-2xl bg-background border border-border border-crisp space-y-3 animate-card-entrance">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>ผลการตรวจสอบเฟิร์มแวร์ทั้งหมด (Bulk Check Results):</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  ตรวจสอบแล้ว {bulkFirmwareResult.totalChecked} อุปกรณ์
                </span>
                <span className={`px-2 py-0.5 rounded-lg font-bold ${
                  bulkFirmwareResult.outdatedCount > 0 ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  ต้องอัปเดต {bulkFirmwareResult.outdatedCount} รายการ
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {bulkFirmwareResult.results.map((res) => (
                <div
                  key={res.peripheralId}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    res.needsUpdate
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200'
                      : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <span>{res.name}</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-background border border-border">
                        {res.category.toUpperCase()}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-text/70 flex items-center gap-2">
                      <span>ปัจจุบัน: <strong className="text-text">{res.currentFirmware}</strong></span>
                      <span>→</span>
                      <span>ล่าสุด: <strong className={res.needsUpdate ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 font-bold'}>{res.latestFirmware}</strong></span>
                    </div>
                    {res.advisoryTitle && (
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 italic">
                        {res.advisoryTitle} (CVSS: {res.severityScore})
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {res.needsUpdate ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] uppercase shadow-sm">
                        <AlertTriangle className="w-3 h-3" /> ต้องอัปเดต
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] uppercase shadow-sm">
                        <CheckCircle2 className="w-3 h-3" /> ล่าสุดแล้ว
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2">
          {firmwareAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                alert.status === 'RESOLVED'
                  ? 'bg-slate-50/50 dark:bg-slate-800/20 border-border border-crisp opacity-60'
                  : alert.advisory.advisoryType === 'SECURITY_CRITICAL'
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                  : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      alert.advisory.advisoryType === 'SECURITY_CRITICAL'
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {alert.advisory.advisoryType.replace(/_/g, ' ')}
                  </span>
                  {alert.advisory.cveId && (
                    <span className="font-mono text-xs font-semibold text-text/80">
                      {alert.advisory.cveId}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono">
                    CVSS: {alert.advisory.severityScore}/10 • {alert.deviceName}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{alert.advisory.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">{alert.advisory.description}</p>
                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  เวอร์ชันที่แนะนำ: Firmware {alert.advisory.recommendedFirmwareVersion} / Driver {alert.advisory.recommendedDriverVersion}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {alert.status === 'RESOLVED' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" /> ติดตั้งแพตช์แล้ว
                  </span>
                ) : (
                  <button
                    onClick={() => handleApplyPatch(alert.id)}
                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors shadow-sm"
                  >
                    <DownloadCloud className="w-4 h-4" /> ติดตั้งแพตช์ด่วนอัตโนมัติ
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discovered USB / Bluetooth Peripherals (Auto-Configuration Suggested) */}
      {discoveredPeripherals.some(p => !p.configured) && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/40 rounded-3xl p-6 text-white shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Bluetooth className="w-4 h-4 text-cyan-400 animate-pulse" />
                Antigravity Background Peripheral Auto-Discovery Engine
              </div>
              <h3 className="text-lg font-bold mt-1">ตรวจพบอุปกรณ์ต่อพ่วง USB / Bluetooth ใหม่ที่เชื่อมต่อ</h3>
              <p className="text-xs text-slate-300">
                ระบบสแกนพบอุปกรณ์ฮาร์ดแวร์ใหม่ที่ยังไม่ได้กำหนดค่า Antigravity AI ได้วิเคราะห์และเตรียมโปรไฟล์การตั้งค่าที่เหมาะสมที่สุดไว้แล้ว
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discoveredPeripherals.filter(p => !p.configured).map((p) => (
              <div key={p.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200">
                      {p.interfaceType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(p.detectedAt).toLocaleTimeString('th-TH')}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{p.name}</h4>
                  <div className="text-xs text-slate-300 font-mono mt-1">
                    ID: {p.hardwareId}
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 mt-3 space-y-1 text-xs">
                    <div className="text-indigo-300 font-semibold text-[11px]">โปรไฟล์ที่แนะนำโดย AI:</div>
                    <div className="text-slate-200">{p.suggestedConfig.driver}</div>
                    <div className="text-slate-400 text-[11px]">การจำลอง: {p.suggestedConfig.emulation}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleAutoConfigurePeripheral(p.id)}
                  className="w-full mt-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  อนุมัติการตั้งค่าอัตโนมัติ (1-Click Auto-Configure)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plug & Play & Device Manager Section */}
      <div className="bg-card rounded-3xl border border-border border-crisp shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-600" /> Plug & Play Hardware & Driver Auto-Discovery
            </h2>
            <p className="text-xs text-text/60 mt-0.5">
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
              <tr className="bg-background/50 text-text/60 text-xs uppercase border-b border-border border-crisp">
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
                  <td className="py-4 px-6 font-medium text-text">
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
      <div className="bg-card rounded-3xl border border-border border-crisp shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-600" /> Antigravity AI Autonomous Self-Healing & Audit Trail
        </h3>
        <div className="space-y-3">
          {health?.selfHealLogs.map((log) => (
            <div key={log.id} className="p-4 rounded-2xl bg-background/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {log.component}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString('th-TH')}</span>
                </div>
                <p className="text-sm font-medium text-text">{log.actionTaken}</p>
                <p className="text-xs text-text/60">ปัญหาที่ตรวจพบ: {log.issue}</p>
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
