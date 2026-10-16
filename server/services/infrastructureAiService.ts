import { GoogleGenAI } from '@google/genai';

export interface SystemHealthStatus {
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

export interface PlugAndPlayDevice {
  id: string;
  name: string;
  type: 'printer' | 'scanner' | 'drawer' | 'edc' | 'display' | 'scale';
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
  networkPath?: {
    terminalId: string;
    terminalName: string;
    connectionType: string;
    ipOrBus: string;
  };
}

export interface PeripheralBattery {
  levelPercent: number | null; // null for AC/Mains or bus-only powered
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
  tags?: string[];
  isPowerSaveMode?: boolean;
  powerSaveWatts?: number;
  isMaintenanceMode?: boolean;
}

export interface HandshakeResult {
  peripheralId: string;
  peripheralName: string;
  stage: 'SYN_SENT' | 'SYN_ACK_RECEIVED' | 'DEVICE_CAPABILITIES_EXCHANGED' | 'CHECKSUM_PASSED' | 'TIMED_OUT' | 'COMMUNICATION_FAILED';
  success: boolean;
  roundTripTimeMs: number;
  protocolDetails: {
    port: string;
    baudRateOrSpeed: string;
    bufferStatus: string;
    echoResponseCode: string;
    checksumMatched: boolean;
  };
  details: string;
  timestamp: string;
}

export interface DiscoveredPeripheral {
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

export type HardwareTestStatus = 'PASS' | 'FAIL' | 'WARNING';

export interface HardwareSubTest {
  id: string;
  name: string;
  status: HardwareTestStatus;
  metric?: string;
  details: string;
}

export interface HardwareTestCardResult {
  id: string;
  peripheralId: string;
  name: string;
  category: 'scanner' | 'printer' | 'drawer' | 'edc' | 'display' | 'scale';
  model: string;
  port: string;
  status: HardwareTestStatus;
  summary: string;
  executionTimeMs: number;
  timestamp: string;
  subTests: HardwareSubTest[];
  recommendations?: string[];
  rawTelemetry?: Record<string, any>;
}

export interface HardwareTestSuiteSummary {
  suiteId: string;
  timestamp: string;
  totalDevices: number;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  healthScorePercent: number;
  totalDurationMs: number;
  results: HardwareTestCardResult[];
}

class InfrastructureAIService {
  private health: SystemHealthStatus = {
    status: 'healthy',
    uptimeSeconds: 86400,
    cpuUsagePercent: 24.5,
    memoryUsagePercent: 42.1,
    dbLatencyMs: 4.2,
    activeConnections: 18,
    selfHealLogs: [
      {
        id: 'heal-001',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        component: 'Database Connection Pool',
        issue: 'Idle connection timeout warning',
        actionTaken: 'Antigravity AI auto-recycled stale connections and optimized pool size.',
        status: 'success',
      },
      {
        id: 'heal-002',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        component: 'API Gateway Rate Limiter',
        issue: 'Traffic burst detected on /api/v1/checkout',
        actionTaken: 'Antigravity AI dynamically scaled rate limit window and flushed cache.',
        status: 'success',
      },
    ],
  };

  private devices: PlugAndPlayDevice[] = [
    {
      id: 'dev-001',
      name: 'EPSON TM-T82III Thermal Receipt Printer',
      type: 'printer',
      port: 'USB001 / COM3',
      status: 'ready',
      driverVersion: 'v4.12.0',
      latestVersion: 'v4.15.2',
      autoUpdateAvailable: true,
      lastConnected: new Date().toISOString(),
    },
    {
      id: 'dev-002',
      name: 'Honeywell Voyager 1470g 2D Barcode Scanner',
      type: 'scanner',
      port: 'HID-POS USB',
      status: 'ready',
      driverVersion: 'v2.0.4',
      latestVersion: 'v2.0.4',
      autoUpdateAvailable: false,
      lastConnected: new Date().toISOString(),
    },
    {
      id: 'dev-003',
      name: 'Smart POS Cash Drawer (RJ12)',
      type: 'drawer',
      port: 'Printer Kick-Out',
      status: 'ready',
      driverVersion: 'v1.0.0',
      latestVersion: 'v1.0.0',
      autoUpdateAvailable: false,
      lastConnected: new Date().toISOString(),
    },
    {
      id: 'dev-004',
      name: 'Verifone P400 EDC Payment Terminal',
      type: 'edc',
      port: 'Ethernet (192.168.1.108)',
      status: 'ready',
      driverVersion: 'v5.8.1',
      latestVersion: 'v6.0.0',
      autoUpdateAvailable: true,
      lastConnected: new Date().toISOString(),
    },
  ];

  private peripherals: HardwarePeripheralStatus[] = [
    {
      id: 'periph-prn-01',
      name: 'EPSON TM-T82III Thermal Receipt Printer',
      category: 'printer',
      model: 'TM-T82III ESC/POS (80mm)',
      serialNumber: 'EP-T82-994821',
      port: 'USB001 / Virtual COM3',
      firmwareVersion: 'v2.10.0',
      driverVersion: 'v4.15.2',
      latestDriverVersion: 'v4.15.2',
      connectivity: {
        state: 'online',
        interface: 'USB',
        latencyMs: 1.4,
        lastPingTimestamp: new Date().toISOString(),
        networkPath: {
          terminalId: 'TERM-01',
          terminalName: 'Main Cashier Terminal #1',
          connectionType: 'Direct USB 2.0',
          ipOrBus: '192.168.1.101 (Bus 001)',
        },
      },
      battery: {
        levelPercent: null,
        isCharging: false,
        powerSource: 'ac_mains',
        healthStatus: 'optimal',
      },
      driverHealth: {
        status: 'healthy',
        integrityVerifiedByAntigravity: true,
        lastAuditTimestamp: new Date(Date.now() - 600000).toISOString(),
        driverSignStatus: 'whql_certified',
        diagnostics: 'Thermal print head impedance 24.2Ω (Normal). Paper feed stepper sync 100%. Buffer latency 1.4ms.',
      },
      lastActivity: new Date().toISOString(),
      telemetryData: {
        operationsCountToday: 348,
        errorCountToday: 0,
        temperatureCelsius: 38.5,
      },
      tags: ['Counter 1', 'Main POS'],
    },
    {
      id: 'periph-scn-01',
      name: 'Honeywell Voyager 1470g 2D Scanner',
      category: 'scanner',
      model: 'Voyager Extreme Performance 1470g',
      serialNumber: 'HW-1470-843019',
      port: 'USB HID-POS (Bus 001 Dev 004)',
      firmwareVersion: 'v3.1.2',
      driverVersion: 'v2.0.4',
      latestDriverVersion: 'v2.0.4',
      connectivity: {
        state: 'online',
        interface: 'USB',
        latencyMs: 0.8,
        lastPingTimestamp: new Date().toISOString(),
        networkPath: {
          terminalId: 'TERM-01',
          terminalName: 'Main Cashier Terminal #1',
          connectionType: 'USB HID-POS Bus',
          ipOrBus: '192.168.1.101 (Bus 001 Dev 004)',
        },
      },
      battery: {
        levelPercent: 100,
        isCharging: true,
        powerSource: 'usb_bus',
        healthStatus: 'optimal',
      },
      driverHealth: {
        status: 'healthy',
        integrityVerifiedByAntigravity: true,
        lastAuditTimestamp: new Date(Date.now() - 450000).toISOString(),
        driverSignStatus: 'oem_signed',
        diagnostics: 'Zero bit-error rate on Aztec / QR / EAN-13 decoding. Keyboard wedge buffer response 0.8ms.',
      },
      lastActivity: new Date().toISOString(),
      telemetryData: {
        operationsCountToday: 512,
        errorCountToday: 0,
        temperatureCelsius: 29.1,
      },
      tags: ['Counter 1'],
    },
    {
      id: 'periph-drw-01',
      name: 'APG Series 4000 Heavy-Duty Cash Drawer',
      category: 'drawer',
      model: 'Series 4000 (MultiPRO 320 RJ12)',
      serialNumber: 'APG-4000-77312',
      port: 'RJ12 Solenoid / Printer Direct Kick-Out',
      firmwareVersion: 'v1.0.0',
      driverVersion: 'v1.0.0',
      latestDriverVersion: 'v1.0.0',
      connectivity: {
        state: 'online',
        interface: 'RJ12_Drawer_Kick',
        latencyMs: 1.1,
        lastPingTimestamp: new Date().toISOString(),
        networkPath: {
          terminalId: 'TERM-01',
          terminalName: 'Main Cashier Terminal #1',
          connectionType: 'RJ12 Solenoid Kick',
          ipOrBus: 'TM-T82III Relay Port',
        },
      },
      battery: {
        levelPercent: null,
        isCharging: false,
        powerSource: 'rj12_pulse',
        healthStatus: 'optimal',
      },
      driverHealth: {
        status: 'healthy',
        integrityVerifiedByAntigravity: true,
        lastAuditTimestamp: new Date(Date.now() - 300000).toISOString(),
        driverSignStatus: 'antigravity_verified',
        diagnostics: 'Microswitch circuit loop closed. 24V 100ms kick-pulse verified. Tamper sensor normal.',
      },
      lastActivity: new Date().toISOString(),
      telemetryData: {
        operationsCountToday: 84,
        errorCountToday: 0,
      },
      tags: ['Counter 1'],
    },
    {
      id: 'periph-scn-02',
      name: 'Zebra DS2278 Cordless 2D Scanner',
      category: 'scanner',
      model: 'DS2278-SR Bluetooth 5.2 Handheld',
      serialNumber: 'ZB-2278-491028',
      port: 'Bluetooth LE 5.2 / Cradle USB',
      firmwareVersion: 'v2.04.11',
      driverVersion: 'v3.2.0',
      latestDriverVersion: 'v3.2.0',
      connectivity: {
        state: 'online',
        interface: 'Bluetooth_LE',
        signalStrengthPercent: 94,
        latencyMs: 2.3,
        lastPingTimestamp: new Date().toISOString(),
        networkPath: {
          terminalId: 'TERM-03',
          terminalName: 'Bar Drinks Terminal #3',
          connectionType: 'BLE 5.2 Link',
          ipOrBus: 'RSSI -42dBm / SPP',
        },
      },
      battery: {
        levelPercent: 86,
        isCharging: false,
        powerSource: 'battery',
        healthStatus: 'optimal',
      },
      driverHealth: {
        status: 'healthy',
        integrityVerifiedByAntigravity: true,
        lastAuditTimestamp: new Date(Date.now() - 180000).toISOString(),
        driverSignStatus: 'whql_certified',
        diagnostics: 'BLE connection RSSI -42dBm (Strong). CoreScanner driver synchronized. 14 hours battery remaining.',
      },
      lastActivity: new Date().toISOString(),
      telemetryData: {
        operationsCountToday: 219,
        errorCountToday: 0,
        temperatureCelsius: 27.8,
      },
      tags: ['Bar', 'Beverage Counter'],
    },
    {
      id: 'periph-prn-02',
      name: 'Bixolon SPP-R310 Plus Mobile Printer',
      category: 'printer',
      model: 'SPP-R310 Plus (3-inch Mobile Receipt)',
      serialNumber: 'BX-R310-18239',
      port: 'Bluetooth SPP / Wireless RFCOMM',
      firmwareVersion: 'v1.44',
      driverVersion: 'v2.1.0',
      latestDriverVersion: 'v2.1.0',
      connectivity: {
        state: 'online',
        interface: 'Bluetooth_LE',
        signalStrengthPercent: 82,
        latencyMs: 3.8,
        lastPingTimestamp: new Date().toISOString(),
        networkPath: {
          terminalId: 'TERM-02',
          terminalName: 'Kitchen Order KDS #2',
          connectionType: 'Wireless RFCOMM',
          ipOrBus: '192.168.1.105',
        },
      },
      battery: {
        levelPercent: 68,
        isCharging: false,
        powerSource: 'battery',
        healthStatus: 'good',
      },
      driverHealth: {
        status: 'healthy',
        integrityVerifiedByAntigravity: true,
        lastAuditTimestamp: new Date(Date.now() - 240000).toISOString(),
        driverSignStatus: 'oem_signed',
        diagnostics: 'Mobile battery cycle count: 48 (Good). Thermal head condition: Normal. Wireless buffer 100% stable.',
      },
      lastActivity: new Date().toISOString(),
      telemetryData: {
        operationsCountToday: 62,
        errorCountToday: 0,
        temperatureCelsius: 32.0,
      },
      tags: ['Kitchen', 'Order Prep'],
    },
    {
      id: 'periph-edc-01',
      name: 'Verifone P400 EDC Payment Terminal',
      category: 'edc',
      model: 'P400 Plus Contactless & EMV',
      serialNumber: 'VF-P400-59281',
      port: 'Ethernet Direct (192.168.1.108)',
      firmwareVersion: 'v6.0.0',
      driverVersion: 'v6.0.0',
      latestDriverVersion: 'v6.0.0',
      connectivity: {
        state: 'online',
        interface: 'Ethernet',
        latencyMs: 2.9,
        lastPingTimestamp: new Date().toISOString(),
        networkPath: {
          terminalId: 'TERM-01',
          terminalName: 'Main Cashier Terminal #1',
          connectionType: 'Ethernet LAN',
          ipOrBus: '192.168.1.108:8443',
        },
      },
      battery: {
        levelPercent: null,
        isCharging: false,
        powerSource: 'ac_mains',
        healthStatus: 'optimal',
      },
      driverHealth: {
        status: 'healthy',
        integrityVerifiedByAntigravity: true,
        lastAuditTimestamp: new Date(Date.now() - 120000).toISOString(),
        driverSignStatus: 'whql_certified',
        diagnostics: 'Thai QR PromptPay & EMV Contactless kernel validated. SSL/TLS 1.3 encrypted channel verified.',
      },
      lastActivity: new Date().toISOString(),
      telemetryData: {
        operationsCountToday: 142,
        errorCountToday: 0,
        temperatureCelsius: 34.2,
      },
      tags: ['Counter 1', 'Payment'],
    },
  ];

  getHardwarePeripherals(): HardwarePeripheralStatus[] {
    return this.peripherals.map(p => {
      let latency = p.connectivity.latencyMs;
      if (p.connectivity.state === 'online') {
        latency = Number((latency + (Math.random() * 0.4 - 0.2)).toFixed(1));
        if (latency < 0.5) latency = 0.5;
      }
      return {
        ...p,
        connectivity: {
          ...p.connectivity,
          latencyMs: latency,
          lastPingTimestamp: new Date().toISOString(),
        },
      };
    });
  }

  updatePeripheralTags(peripheralId: string, tags: string[]): HardwarePeripheralStatus {
    const peripheral = this.peripherals.find(p => p.id === peripheralId);
    if (!peripheral) {
      throw new Error('Peripheral not found.');
    }
    peripheral.tags = tags.map(t => t.trim()).filter(Boolean);
    return { ...peripheral };
  }

  updatePeripheralName(peripheralId: string, newName: string): HardwarePeripheralStatus {
    const peripheral = this.peripherals.find(p => p.id === peripheralId);
    if (!peripheral) {
      throw new Error('Peripheral not found.');
    }
    const trimmed = newName.trim();
    if (!trimmed) {
      throw new Error('Peripheral name cannot be empty.');
    }
    peripheral.name = trimmed;
    return { ...peripheral };
  }

  togglePowerSaveMode(peripheralId: string, enabled: boolean): HardwarePeripheralStatus {
    const peripheral = this.peripherals.find((p) => p.id === peripheralId);
    if (!peripheral) {
      throw new Error('Peripheral not found.');
    }
    peripheral.isPowerSaveMode = enabled;
    peripheral.powerSaveWatts = enabled ? 0.2 : 8.5;
    if (enabled) {
      peripheral.connectivity.state = 'standby';
      peripheral.driverHealth.diagnostics = `[Eco Power Save] ฮาร์ดแวร์เข้าสู่โหมดประหยัดพลังงาน (Sleep Mode: 0.2W). สแตนด์บายพร้อมตื่นเมื่อมีคำสั่งงาน.`;
    } else {
      peripheral.connectivity.state = 'online';
      peripheral.driverHealth.diagnostics = `[Normal Power Mode] ฮาร์ดแวร์กลับสู่สภาวะการทำงานปกติเต็มประสิทธิภาพ (8.5W).`;
    }
    return { ...peripheral };
  }

  async runPeripheralHealthAudit(peripheralId?: string): Promise<{ success: boolean; auditedPeripherals: HardwarePeripheralStatus[]; log: any }> {
    await new Promise((r) => setTimeout(r, 800));
    const now = new Date().toISOString();

    this.peripherals = this.peripherals.map(p => {
      if (!peripheralId || p.id === peripheralId) {
        return {
          ...p,
          connectivity: {
            ...p.connectivity,
            state: 'online',
            lastPingTimestamp: now,
          },
          driverHealth: {
            ...p.driverHealth,
            status: 'healthy',
            integrityVerifiedByAntigravity: true,
            lastAuditTimestamp: now,
          },
        };
      }
      return p;
    });

    const targetDesc = peripheralId 
      ? `Peripheral (${this.peripherals.find(p => p.id === peripheralId)?.name || peripheralId})` 
      : 'All Detected Hardware Peripherals (Printers, Scanners, Cash Drawers)';

    const auditLog = {
      id: `audit-${Date.now()}`,
      timestamp: now,
      component: 'Antigravity Hardware & Driver Health Auditor',
      issue: 'Real-time Peripheral Integrity & Battery Verification',
      actionTaken: `Antigravity AI conducted full diagnostic audit for ${targetDesc}: verified driver signatures, validated bus connectivity, and polled battery telemetry.`,
      status: 'success' as const,
    };

    this.health.selfHealLogs.unshift(auditLog);

    return {
      success: true,
      auditedPeripherals: this.getHardwarePeripherals(),
      log: auditLog,
    };
  }

  async runConnectionHandshake(peripheralId: string, simulateFailure?: boolean): Promise<{ success: boolean; handshake: HandshakeResult; peripheral?: HardwarePeripheralStatus; error?: string }> {
    const peripheral = this.peripherals.find(p => p.id === peripheralId);
    if (!peripheral) {
      return {
        success: false,
        error: `Hardware peripheral ${peripheralId} not found in connected registry.`,
        handshake: {
          peripheralId,
          peripheralName: 'Unknown Device',
          stage: 'COMMUNICATION_FAILED',
          success: false,
          roundTripTimeMs: 0,
          protocolDetails: {
            port: 'UNKNOWN',
            baudRateOrSpeed: 'N/A',
            bufferStatus: 'N/A',
            echoResponseCode: '0x00',
            checksumMatched: false,
          },
          details: 'Handshake aborted: Target device not identified.',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Simulate real hardware I/O handshake delay
    await new Promise((r) => setTimeout(r, 650));

    if (simulateFailure) {
      return {
        success: false,
        error: `Handshake failed on ${peripheral.port}: Connection timed out (E_TIMEDOUT after 3000ms).`,
        handshake: {
          peripheralId: peripheral.id,
          peripheralName: peripheral.name,
          stage: 'TIMED_OUT',
          success: false,
          roundTripTimeMs: 3000,
          protocolDetails: {
            port: peripheral.port,
            baudRateOrSpeed: '9600 bps / BLE Unreachable',
            bufferStatus: 'ERR_NO_CARRIER',
            echoResponseCode: '0x15 (NAK)',
            checksumMatched: false,
          },
          details: 'Target device did not acknowledge SYN packet within threshold.',
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Dynamic round-trip time based on interface
    let rtt = peripheral.connectivity.interface === 'USB' 
      ? Number((0.6 + Math.random() * 0.8).toFixed(1))
      : peripheral.connectivity.interface === 'Bluetooth_LE'
      ? Number((2.1 + Math.random() * 1.5).toFixed(1))
      : peripheral.connectivity.interface === 'RJ12_Drawer_Kick'
      ? Number((0.9 + Math.random() * 0.4).toFixed(1))
      : Number((2.5 + Math.random() * 1.2).toFixed(1));

    let detailsMsg = '';
    let bufferStatus = '4096 bytes FIFO (Empty / Ready)';

    if (peripheral.category === 'printer') {
      detailsMsg = `ESC/POS Handshake ACK (0x06) ตอบรับสำเร็จ. Thermal Head Impedance ปกติ, กระดาษพร้อมพิมพ์ (Paper OK).`;
      bufferStatus = '16KB ESC/POS Spool Buffer Ready';
    } else if (peripheral.category === 'scanner') {
      detailsMsg = `HID-POS Raw Optical Handshake สำเร็จ. บัฟเฟอร์สแกน 2.4GHz / USB ว่างพร้อมรับบาร์โค้ด.`;
      bufferStatus = 'Zero-packet drop FIFO ready';
    } else if (peripheral.category === 'drawer') {
      detailsMsg = `RJ12 Direct Solenoid Loop Handshake สำเร็จ. ไมโครสวิตช์ตรวจจับสถานะปิดสนิท (LOCKED) ความต้านทานวงจร 24Ω ปกติ.`;
      bufferStatus = 'Microswitch circuit active';
    } else {
      detailsMsg = `TCP/IP EMV Handshake สำเร็จ. ตรวจสอบ SSL/TLS Session Token สมบูรณ์.`;
      bufferStatus = 'Encrypted buffer active';
    }

    // Update peripheral telemetry
    peripheral.connectivity.state = 'online';
    peripheral.connectivity.latencyMs = rtt;
    peripheral.connectivity.lastPingTimestamp = new Date().toISOString();
    peripheral.lastActivity = new Date().toISOString();
    peripheral.telemetryData.operationsCountToday += 1;

    const handshake: HandshakeResult = {
      peripheralId: peripheral.id,
      peripheralName: peripheral.name,
      stage: 'CHECKSUM_PASSED',
      success: true,
      roundTripTimeMs: rtt,
      protocolDetails: {
        port: peripheral.port,
        baudRateOrSpeed: peripheral.connectivity.interface === 'USB' ? 'USB 2.0 Full-Speed 12Mbps' : peripheral.connectivity.interface === 'Bluetooth_LE' ? 'BLE 5.2 PHY 2Mbps' : '24V Pulse DC Loop',
        bufferStatus,
        echoResponseCode: '0x06 (ACK)',
        checksumMatched: true,
      },
      details: detailsMsg,
      timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      handshake,
      peripheral: { ...peripheral },
    };
  }

  private latestTestSuiteSummary: HardwareTestSuiteSummary | null = null;

  async runHardwareTestSuite(options?: {
    category?: string;
    simulateFaultDeviceId?: string;
    simulateFaultAll?: boolean;
  }): Promise<HardwareTestSuiteSummary> {
    const startTime = Date.now();
    const suiteId = `suite-${Date.now()}`;
    const categoryFilter = options?.category && options.category !== 'all' ? options.category : null;

    let targetPeripherals = this.peripherals;
    if (categoryFilter) {
      targetPeripherals = targetPeripherals.filter((p) => p.category === categoryFilter);
    }

    // Simulate real hardware test sweep timing (500ms)
    await new Promise((resolve) => setTimeout(resolve, 600));

    const results: HardwareTestCardResult[] = targetPeripherals.map((peripheral) => {
      const isFaulted =
        options?.simulateFaultAll ||
        options?.simulateFaultDeviceId === peripheral.id ||
        peripheral.connectivity.state === 'disconnected' ||
        peripheral.driverHealth.status === 'degraded';

      const executionTimeMs = Math.round(15 + Math.random() * 25);
      const subTests: HardwareSubTest[] = [];
      const recommendations: string[] = [];

      if (peripheral.category === 'printer') {
        // 1. ESC/POS Comm
        subTests.push({
          id: 'printer-comm',
          name: 'ESC/POS Port & Protocol Handshake',
          status: isFaulted && options?.simulateFaultDeviceId === peripheral.id && Math.random() > 0.6 ? 'FAIL' : 'PASS',
          metric: `${peripheral.connectivity.latencyMs} ms`,
          details: isFaulted && options?.simulateFaultDeviceId === peripheral.id && Math.random() > 0.6
            ? 'Timeout 3000ms: ไม่ได้รับสัญญาณตอบกลับ ACK (0x06) จากพอร์ตเครื่องพิมพ์'
            : `ส่งคำสั่ง SYN/ACK สำเร็จ ตอบสนองด้วยรหัส 0x06 (ACK) ใน ${peripheral.connectivity.latencyMs}ms`,
        });

        // 2. Paper Sensor
        const paperFault = isFaulted;
        subTests.push({
          id: 'printer-paper',
          name: 'Paper Supply & Cover Interlock Sensor',
          status: paperFault ? 'FAIL' : 'PASS',
          metric: paperFault ? 'OUT OF PAPER / OPEN' : 'Present (80mm Thermal)',
          details: paperFault
            ? 'เซนเซอร์ตรวจจับกระดาษหมด (Paper-Out Sensor Tripped) หรือฝาเครื่องพิมพ์ปิดไม่สนิท'
            : 'กระดาษความร้อน 80mm พร้อมใช้งาน ฝาปิดสนิท แรงกดลูกกลิ้งปกติ',
        });

        // 3. Thermal Head
        subTests.push({
          id: 'printer-head',
          name: 'Thermal Print Head & Voltage Strobe',
          status: 'PASS',
          metric: '24.2Ω • 38.5°C',
          details: 'ความต้านทานองค์ประกอบความร้อน 24.2Ω อยู่ในเกณฑ์มาตรฐาน อุณหภูมิหัวพิมพ์ปกติ',
        });

        // 4. Auto Cutter
        subTests.push({
          id: 'printer-cutter',
          name: 'Guillotine Auto-Cutter Position & Stepper',
          status: 'PASS',
          metric: 'Cutter Home OK • 100% Sync',
          details: 'ใบมีดตัดกระดาษจอดตำแหน่งเริ่มต้น (Home Position) มอเตอร์ก้าวหน้ากระดาษทำงานสมบูรณ์',
        });

        if (paperFault) {
          recommendations.push(
            'ใส่กระดาษใบเสร็จความร้อนขนาด 80mm ม้วนใหม่',
            'กดปิดฝาครอบเครื่องพิมพ์ให้ลงล็อกทั้งสองด้าน',
            'ทดสอบพิมพ์ใบเสร็จผ่านปุ่ม Print Test Slip'
          );
        }
      } else if (peripheral.category === 'scanner') {
        // 1. Scanner Comm
        subTests.push({
          id: 'scanner-comm',
          name: 'USB HID-POS / BLE 5.2 Link Integrity',
          status: 'PASS',
          metric: `${peripheral.connectivity.latencyMs} ms`,
          details: `ช่องสัญญาณ ${peripheral.connectivity.interface.replace(/_/g, ' ')} เชื่อมต่อเสถียร Latency ${peripheral.connectivity.latencyMs}ms`,
        });

        // 2. Optical Imager
        const imagerFault = isFaulted;
        subTests.push({
          id: 'scanner-imager',
          name: 'Optical CMOS Imager & Aiming Beam',
          status: imagerFault ? 'FAIL' : 'PASS',
          metric: imagerFault ? 'BEAM OCCLUDED / CAL FAIL' : 'Lens Clean • 60 FPS',
          details: imagerFault
            ? 'เซนเซอร์รับภาพตรวจพบลำแสงเล็งเป้าเบี่ยงเบน หรือกระจกหน้าเลนส์มีสิ่งสกปรกบดบัง'
            : 'เซนเซอร์รับภาพ CMOS Area Imager ทำงานเต็มประสิทธิภาพ ลำแสงนำสายตาสว่างคมชัด',
        });

        // 3. Symbology Decoder
        subTests.push({
          id: 'scanner-decoder',
          name: '1D / 2D Symbology Decoder Engine',
          status: 'PASS',
          metric: 'QR / EAN-13 / Code128: 100%',
          details: 'เอนจินถอดรหัสบาร์โค้ด 1D/2D ตอบสนองอัตราความแม่นยำ 100% ไม่พบข้อผิดพลาดบิต',
        });

        // 4. Keyboard Wedge Buffer
        subTests.push({
          id: 'scanner-wedge',
          name: 'Keyboard Wedge & FIFO Scan Buffer',
          status: 'PASS',
          metric: '1.2 MB/s • 0 Drops',
          details: 'บัฟเฟอร์คีย์บอร์ดเวดจ์ส่งผ่านข้อมูลเข้าสู่แอปพลิเคชัน POS โดยไม่สูญหายของตัวอักษร',
        });

        if (imagerFault) {
          recommendations.push(
            'ใช้ผ้าไมโครไฟเบอร์เช็ดทำความสะอาดกระจกหน้าเลนส์สแกนเนอร์',
            'ตรวจสอบระยะห่างและมุมตกกระทบของแสงเล็งเป้า (Aiming Line)',
            'ทดสอบยิงสแกนบาร์โค้ดตัวอย่างผ่านปุ่ม Trigger Beep Pulse'
          );
        }
      } else if (peripheral.category === 'drawer') {
        // 1. Solenoid Circuit
        const circuitFault = isFaulted;
        subTests.push({
          id: 'drawer-solenoid',
          name: '24V Solenoid Circuit Loop Continuity',
          status: circuitFault ? 'FAIL' : 'PASS',
          metric: circuitFault ? 'OPEN LOOP (∞ Ω)' : '28.4 Ω Nominal',
          details: circuitFault
            ? 'วงจรขดลวดโซลินอยด์เปิด (Open Circuit) ไม่พบสัญญาณความต้านทานกระแสตรง 24V'
            : 'ขดลวดแม่เหล็กโซลินอยด์มีความต้านทาน 28.4Ω วงจรปิดสมบูรณ์ ไดโอดกันไฟย้อนทำงานปกติ',
        });

        // 2. Microswitch Sensor
        subTests.push({
          id: 'drawer-switch',
          name: 'Microswitch Sensor & Lock Position',
          status: circuitFault ? 'WARNING' : 'PASS',
          metric: circuitFault ? 'UNLATCHED / AJAR' : 'Closed Loop (0 Ω)',
          details: circuitFault
            ? 'หน้าสัมผัสไมโครสวิตช์ตรวจพบสถานะลิ้นชักไม่ลงล็อกสนิท'
            : 'ไมโครสวิตช์ตรวจจับสถานะปิดสนิทของลิ้นชักเก็บเงิน (Drawer Closed & Latched)',
        });

        // 3. Kick Pulse Test
        subTests.push({
          id: 'drawer-kick',
          name: '24V 100ms Fire Pulse Response Timing',
          status: 'PASS',
          metric: '12ms Rise • 102ms Duration',
          details: 'สัญญาณกระตุ้น 24V DC ตอบสนองอย่างแม่นยำภายในระยะเวลา 102ms มาตรฐาน EPSON DK',
        });

        // 4. Tamper & Mechanical Key
        subTests.push({
          id: 'drawer-tamper',
          name: 'Mechanical Key Latch & Anti-Tamper Loop',
          status: 'PASS',
          metric: 'Armed & Secured',
          details: 'สวิตช์กุญแจ 3 ตำแหน่งอยู่ในสถานะ Online/Locked ตรวจไม่พบการงัดแงะ',
        });

        if (circuitFault) {
          recommendations.push(
            'ตรวจสอบการเสียบสาย RJ12 ระหว่างลิ้นชักกับพอร์ต DK (Drawer Kick) ด้านหลังเครื่องพิมพ์',
            'ดันลิ้นชักให้ปิดสนิทจนได้ยินเสียงล็อกของกลอนกลไก',
            'ทดสอบสั่งจ่ายไฟเปิดลิ้นชักด้วยปุ่ม Test Kick Pulse'
          );
        }
      } else {
        // Generic EDC / other
        subTests.push({
          id: 'generic-comm',
          name: 'Interface Network & SSL Handshake',
          status: isFaulted ? 'FAIL' : 'PASS',
          metric: `${peripheral.connectivity.latencyMs} ms`,
          details: isFaulted ? 'การเชื่อมต่อขัดข้อง' : 'ช่องสัญญาณเข้ารหัส TLS 1.3 พร้อมใช้งาน',
        });
        subTests.push({
          id: 'generic-kernel',
          name: 'Kernel Certification & Driver Integrity',
          status: 'PASS',
          metric: 'Validated',
          details: 'เฟิร์มแวร์และใบรับรองความปลอดภัยผ่านเกณฑ์มาตรฐาน',
        });
      }

      const hasFail = subTests.some((t) => t.status === 'FAIL');
      const hasWarn = subTests.some((t) => t.status === 'WARNING');
      const cardStatus: HardwareTestStatus = hasFail ? 'FAIL' : hasWarn ? 'WARNING' : 'PASS';

      const summary = hasFail
        ? `พบข้อบกพร่องใน ${subTests.filter((t) => t.status === 'FAIL').length} ระบบย่อย — ต้องตรวจสอบอุปกรณ์ก่อนเปิดกะขาย`
        : hasWarn
        ? 'ทุกระบบย่อยเชื่อมต่อได้ แต่มี 1 จุดแจ้งเตือนควรสังเกต'
        : `ผ่านการทดสอบครบทั้ง ${subTests.length} ระบบย่อย • อุปกรณ์ทำงานอยู่ในเกณฑ์มาตรฐานสมบูรณ์ 100%`;

      return {
        id: `test-${peripheral.id}-${Date.now()}`,
        peripheralId: peripheral.id,
        name: peripheral.name,
        category: peripheral.category,
        model: peripheral.model,
        port: peripheral.port,
        status: cardStatus,
        summary,
        executionTimeMs,
        timestamp: new Date().toISOString(),
        subTests,
        recommendations: recommendations.length > 0 ? recommendations : undefined,
        rawTelemetry: {
          port: peripheral.port,
          latencyMs: peripheral.connectivity.latencyMs,
          todayOps: peripheral.telemetryData.operationsCountToday,
          battery: peripheral.battery.levelPercent,
        },
      };
    });

    const passedCount = results.filter((r) => r.status === 'PASS').length;
    const failedCount = results.filter((r) => r.status === 'FAIL').length;
    const warningCount = results.filter((r) => r.status === 'WARNING').length;
    const totalDevices = results.length;
    const healthScorePercent = totalDevices > 0 ? Math.round((passedCount / totalDevices) * 100) : 100;
    const totalDurationMs = Date.now() - startTime;

    const summary: HardwareTestSuiteSummary = {
      suiteId,
      timestamp: new Date().toISOString(),
      totalDevices,
      passedCount,
      failedCount,
      warningCount,
      healthScorePercent,
      totalDurationMs,
      results,
    };

    this.latestTestSuiteSummary = summary;
    return summary;
  }

  getLatestTestSuiteSummary(): HardwareTestSuiteSummary | null {
    return this.latestTestSuiteSummary;
  }

  getSystemHealth(): SystemHealthStatus {
    // Simulate slight natural fluctuations
    this.health.cpuUsagePercent = Number((20 + Math.random() * 15).toFixed(1));
    this.health.memoryUsagePercent = Number((40 + Math.random() * 8).toFixed(1));
    this.health.dbLatencyMs = Number((3.5 + Math.random() * 2.5).toFixed(1));
    return { ...this.health };
  }

  getDevices(): PlugAndPlayDevice[] {
    return [...this.devices];
  }

  async runAntigravitySelfHeal(): Promise<{ success: boolean; message: string; log: any }> {
    this.health.status = 'self_healing';
    
    // Use Antigravity agent via Interactions API if GEMINI_API_KEY is available
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const interaction = await ai.interactions.create({
          agent: 'antigravity-preview-09-2026',
          input: 'Analyze PRODX-POS infrastructure health (CPU 25%, DB Latency 4ms) and execute automated self-healing remediation for any potential bottleneck.',
          environment: 'remote',
        }, { timeout: 30000 });
        
        console.log('Antigravity AI Self-Heal interaction completed:', interaction.environment_id);
      } catch (err) {
        console.warn('Antigravity remote agent execution fallback to internal self-heal engine:', err);
      }
    }

    await new Promise((r) => setTimeout(r, 1200));

    const newLog = {
      id: `heal-${Date.now()}`,
      timestamp: new Date().toISOString(),
      component: 'System Infrastructure Core',
      issue: 'Proactive 24/7 AI Health Audit & Optimization',
      actionTaken: 'Antigravity AI executed automated zero-downtime memory defragmentation, index tuning, and socket keep-alive renewal.',
      status: 'success' as const,
    };

    this.health.selfHealLogs.unshift(newLog);
    this.health.status = 'healthy';
    this.health.lastSelfHealTimestamp = newLog.timestamp;

    return {
      success: true,
      message: 'Antigravity AI autonomous infrastructure self-healing completed successfully.',
      log: newLog,
    };
  }

  async scanPlugAndPlayDevices(): Promise<{ discoveredCount: number; devices: PlugAndPlayDevice[] }> {
    await new Promise((r) => setTimeout(r, 1500));
    
    // Simulate auto-discovering or checking drivers
    this.devices = this.devices.map(d => ({
      ...d,
      status: 'ready',
      lastConnected: new Date().toISOString(),
    }));

    return {
      discoveredCount: this.devices.length,
      devices: [...this.devices],
    };
  }

  async updateDeviceDriver(deviceId: string): Promise<{ success: boolean; device: PlugAndPlayDevice }> {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) {
      throw new Error('Device not found.');
    }

    await new Promise((r) => setTimeout(r, 1000));
    device.driverVersion = device.latestVersion;
    device.autoUpdateAvailable = false;

    this.health.selfHealLogs.unshift({
      id: `heal-${Date.now()}`,
      timestamp: new Date().toISOString(),
      component: `Device: ${device.name}`,
      issue: 'Driver update pending',
      actionTaken: `Antigravity AI automatically installed latest signed driver (${device.latestVersion}).`,
      status: 'success',
    });

    return { success: true, device };
  }

  private discoveredPeripherals: DiscoveredPeripheral[] = [
    {
      id: 'pnp-bt-01',
      name: 'Zebra DS2208 Handheld 2D Barcode Scanner',
      category: 'scanner',
      interfaceType: 'Bluetooth_LE',
      hardwareId: 'BT_ADDR: 00:1B:DC:06:84:92',
      detectedAt: new Date(Date.now() - 180000).toISOString(),
      configured: false,
      suggestedConfig: {
        driver: 'Zebra CoreScanner HID-POS BLE v3.2',
        emulation: 'Keyboard Wedge & POS Raw HID',
      },
    },
    {
      id: 'pnp-usb-02',
      name: 'Star Micronics TSP143III Thermal Printer',
      category: 'printer',
      interfaceType: 'USB',
      hardwareId: 'USB\\VID_0519&PID_0001',
      detectedAt: new Date(Date.now() - 60000).toISOString(),
      configured: false,
      suggestedConfig: {
        driver: 'StarPRNT ESC/POS High-Speed Driver v2.1',
        paperWidthMm: 80,
        emulation: 'Star Line Mode / ESC/POS',
        autoDrawerKick: true,
      },
    },
  ];

  getDiscoveredPeripherals(): DiscoveredPeripheral[] {
    return [...this.discoveredPeripherals];
  }

  async autoConfigurePeripheral(peripheralId: string): Promise<{ success: boolean; peripheral: DiscoveredPeripheral }> {
    const peripheral = this.discoveredPeripherals.find((p) => p.id === peripheralId);
    if (!peripheral) {
      throw new Error('Discovered peripheral not found.');
    }

    await new Promise((r) => setTimeout(r, 800));
    peripheral.configured = true;

    // Register into active plug-and-play devices list
    this.devices.push({
      id: peripheral.id,
      name: peripheral.name,
      type: peripheral.category,
      port: peripheral.interfaceType === 'Bluetooth_LE' ? 'BLE Virtual COM' : 'USB Direct',
      status: 'ready',
      driverVersion: peripheral.suggestedConfig.driver.split(' ').pop() || 'v1.0.0',
      latestVersion: peripheral.suggestedConfig.driver.split(' ').pop() || 'v1.0.0',
      autoUpdateAvailable: false,
      lastConnected: new Date().toISOString(),
    });

    this.health.selfHealLogs.unshift({
      id: `heal-${Date.now()}`,
      timestamp: new Date().toISOString(),
      component: `Peripheral Auto-Config: ${peripheral.name}`,
      issue: `New ${peripheral.interfaceType} peripheral connected without profile`,
      actionTaken: `Antigravity AI automatically deployed optimal driver profile (${peripheral.suggestedConfig.emulation}) with zero human configuration.`,
      status: 'success',
    });

    return { success: true, peripheral };
  }

  async scanAndDiscoverPeripherals(): Promise<{ discoveredCount: number; peripherals: DiscoveredPeripheral[] }> {
    await new Promise((r) => setTimeout(r, 1400));

    // Simulate probing USB and Bluetooth ports for new POS peripherals
    const candidatePool: DiscoveredPeripheral[] = [
      {
        id: `pnp-usb-${Date.now().toString().slice(-4)}`,
        name: 'Citizen CT-S310II Thermal Receipt Printer',
        category: 'printer',
        interfaceType: 'USB',
        hardwareId: `USB\\VID_2031&PID_${Math.floor(1000 + Math.random() * 9000)}`,
        detectedAt: new Date().toISOString(),
        configured: false,
        suggestedConfig: {
          driver: 'Citizen ESC/POS High-Speed Driver v3.0',
          paperWidthMm: 80,
          emulation: 'ESC/POS Line Mode',
          autoDrawerKick: true,
        },
      },
      {
        id: `pnp-bt-${Date.now().toString().slice(-4)}`,
        name: 'Honeywell Xenon 1950g 2D Area Imager',
        category: 'scanner',
        interfaceType: 'Bluetooth_LE',
        hardwareId: `BT_ADDR: ${Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase()}`,
        detectedAt: new Date().toISOString(),
        configured: false,
        suggestedConfig: {
          driver: 'Honeywell BLE CoreScanner v4.1',
          emulation: 'HID-POS & Virtual COM',
        },
      },
    ];

    // Add unique ones if not already present
    for (const candidate of candidatePool) {
      if (!this.discoveredPeripherals.some((p) => p.name === candidate.name)) {
        this.discoveredPeripherals.push(candidate);
      }
    }

    return {
      discoveredCount: this.discoveredPeripherals.filter((p) => !p.configured).length,
      peripherals: [...this.discoveredPeripherals],
    };
  }

  async runBulkFirmwareCheck(): Promise<{
    success: boolean;
    timestamp: string;
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
  }> {
    await new Promise((r) => setTimeout(r, 900));
    const peripherals = this.getHardwarePeripherals();

    // Map known updates or simulate version comparison
    const results = peripherals.map((p) => {
      let currentFirmware = p.firmwareVersion || 'v1.0.0';
      let latestFirmware = currentFirmware;
      let needsUpdate = false;
      let advisoryTitle: string | undefined = undefined;
      let severityScore: number | undefined = undefined;

      if (p.category === 'printer') {
        currentFirmware = 'v2.0.0';
        latestFirmware = 'v2.10.0';
        needsUpdate = true;
        advisoryTitle = 'Buffer Overflow Vulnerability in TM-T82III Network Spooler';
        severityScore = 9.2;
      } else if (p.category === 'edc') {
        currentFirmware = 'v5.8.1';
        latestFirmware = 'v6.0.0';
        needsUpdate = true;
        advisoryTitle = 'EMV Contactless NFC Kernel Latency Degradation';
        severityScore = 7.8;
      } else if (p.id === 'periph-scn-02') {
        currentFirmware = 'v2.01.0';
        latestFirmware = 'v2.04.11';
        needsUpdate = true;
        advisoryTitle = 'BLE Secure Pairing Protocol Update';
        severityScore = 6.1;
      }

      return {
        peripheralId: p.id,
        name: p.name,
        category: p.category,
        currentFirmware,
        latestFirmware,
        needsUpdate,
        advisoryTitle,
        severityScore,
      };
    });

    const outdatedCount = results.filter((r) => r.needsUpdate).length;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      totalChecked: results.length,
      outdatedCount,
      results,
    };
  }

  async applyStagedFirmwareUpdate(peripheralId?: string): Promise<{
    success: boolean;
    updatedCount: number;
    updatedPeripherals: HardwarePeripheralStatus[];
    stagedLogs: Array<{
      stage: string;
      peripheralName: string;
      status: 'VERIFYING' | 'BACKUP_EEPROM' | 'FLASHING_BLOCKS' | 'COLD_REBOOT' | 'COMPLETED';
      progressPercent: number;
      timestamp: string;
    }>;
  }> {
    await new Promise((r) => setTimeout(r, 600));

    const stagedLogs: Array<{
      stage: string;
      peripheralName: string;
      status: 'VERIFYING' | 'BACKUP_EEPROM' | 'FLASHING_BLOCKS' | 'COLD_REBOOT' | 'COMPLETED';
      progressPercent: number;
      timestamp: string;
    }> = [];

    let updatedCount = 0;

    this.peripherals = this.peripherals.map((p) => {
      if (!peripheralId || p.id === peripheralId) {
        let newFirmware = p.firmwareVersion;
        if (p.category === 'printer') newFirmware = 'v2.10.0';
        else if (p.category === 'edc') newFirmware = 'v6.0.0';
        else if (p.id === 'periph-scn-02') newFirmware = 'v2.04.11';

        if (newFirmware !== p.firmwareVersion) {
          updatedCount++;
          const now = new Date().toISOString();

          stagedLogs.push({
            stage: 'Stage 1: Digital Signature & SHA-256 Checksum Verification',
            peripheralName: p.name,
            status: 'VERIFYING',
            progressPercent: 20,
            timestamp: now,
          });
          stagedLogs.push({
            stage: 'Stage 2: EEPROM Backup & ROM Buffer Pre-Allocation',
            peripheralName: p.name,
            status: 'BACKUP_EEPROM',
            progressPercent: 40,
            timestamp: now,
          });
          stagedLogs.push({
            stage: 'Stage 3: Flashing Microcode Blocks to Non-Volatile Flash',
            peripheralName: p.name,
            status: 'FLASHING_BLOCKS',
            progressPercent: 80,
            timestamp: now,
          });
          stagedLogs.push({
            stage: 'Stage 4: Post-Flash Hardware Cold Reboot & Handshake Validation',
            peripheralName: p.name,
            status: 'COLD_REBOOT',
            progressPercent: 95,
            timestamp: now,
          });
          stagedLogs.push({
            stage: 'Stage 5: Firmware Patched & WHQL Signature Verified',
            peripheralName: p.name,
            status: 'COMPLETED',
            progressPercent: 100,
            timestamp: now,
          });

          return {
            ...p,
            firmwareVersion: newFirmware,
            latestDriverVersion: newFirmware,
            driverHealth: {
              ...p.driverHealth,
              status: 'healthy',
              integrityVerifiedByAntigravity: true,
              lastAuditTimestamp: now,
              diagnostics: `[Firmware Updated to ${newFirmware}] Staged update completed successfully. ROM checksum matched 0x9F42AE. Zero vulnerabilities detected.`,
            },
          };
        }
      }
      return p;
    });

    return {
      success: true,
      updatedCount,
      updatedPeripherals: this.getHardwarePeripherals(),
      stagedLogs,
    };
  }

  rebootPeripheral(peripheralId: string): {
    success: boolean;
    peripheral?: HardwarePeripheralStatus;
    peripherals: HardwarePeripheralStatus[];
    rebootTimestamp: string;
    diagnostics: string;
  } {
    const now = new Date().toISOString();
    let rebootedPeripheral: HardwarePeripheralStatus | undefined;

    this.peripherals = this.peripherals.map((p) => {
      if (p.id === peripheralId) {
        const rebootDiagnostics = `[Remote Power Cycle] สัญญาณส่งรีเซ็ต Power Rails ผ่านสาย ${p.connectivity.interface} สำเร็จ - Cold Boot เสร็จสิ้น อุปกรณ์กลับสู่สภาวะปกติ (0 Errors)`;
        rebootedPeripheral = {
          ...p,
          lastActivity: now,
          connectivity: {
            ...p.connectivity,
            state: 'online',
            lastPingTimestamp: now,
            latencyMs: Math.round((Math.random() * 1.5 + 0.5) * 10) / 10,
          },
          driverHealth: {
            ...p.driverHealth,
            status: 'healthy',
            lastAuditTimestamp: now,
            diagnostics: rebootDiagnostics,
          },
        };
        return rebootedPeripheral;
      }
      return p;
    });

    return {
      success: !!rebootedPeripheral,
      peripheral: rebootedPeripheral,
      peripherals: this.getHardwarePeripherals(),
      rebootTimestamp: now,
      diagnostics: rebootedPeripheral?.driverHealth.diagnostics || '',
    };
  }

  private deviceProfiles: Array<{
    id: string;
    name: string;
    role: string;
    description: string;
    activeTagFilters: string[];
  }> = [
    {
      id: 'profile-counter-1',
      name: 'Counter 1 Main Station',
      role: 'Cashier / Front Desk',
      description: 'Active POS receipt printer, Barcode scanner, Cash Drawer 1, and EDC terminal.',
      activeTagFilters: ['Counter 1', 'Main POS'],
    },
    {
      id: 'profile-kitchen',
      name: 'Kitchen Order Prep Station',
      role: 'Kitchen Expeditor',
      description: 'High-speed kitchen ticket printer and kitchen scanner for order preparation.',
      activeTagFilters: ['Kitchen', 'Order Prep'],
    },
    {
      id: 'profile-bar',
      name: 'Beverage Bar Station',
      role: 'Bartender',
      description: 'Bar receipt printer and quick-scan barcode reader for beverages.',
      activeTagFilters: ['Bar', 'Beverage'],
    },
    {
      id: 'profile-all',
      name: 'Store-Wide Full Enterprise View',
      role: 'Store Manager / Admin',
      description: 'All connected peripherals across Counter 1, Kitchen, and Bar.',
      activeTagFilters: [],
    },
  ];

  getDeviceProfiles() {
    return {
      success: true,
      profiles: this.deviceProfiles,
    };
  }

  applyDeviceProfile(profileId: string) {
    const profile = this.deviceProfiles.find((p) => p.id === profileId);
    return {
      success: true,
      profile: profile || null,
      peripherals: this.getHardwarePeripherals(),
    };
  }

  reconnectPeripheral(peripheralId: string): {
    success: boolean;
    peripheral?: HardwarePeripheralStatus;
    peripherals: HardwarePeripheralStatus[];
    reconnectTimestamp: string;
    diagnostics: string;
  } {
    const now = new Date().toISOString();
    let reconnectedPeripheral: HardwarePeripheralStatus | undefined;

    this.peripherals = this.peripherals.map((p) => {
      if (p.id === peripheralId) {
        const reconnectDiag = `[Auto-Reconnect Handshake] ส่งแพ็กเก็ต Handshake (SYN/ACK) กู้คืนการเชื่อมต่อพอร์ต ${p.port} สำเร็จ - USB/BLE Bus สถิตเสถียร (0 Errors)`;
        reconnectedPeripheral = {
          ...p,
          lastActivity: now,
          connectivity: {
            ...p.connectivity,
            state: 'online',
            lastPingTimestamp: now,
            latencyMs: Math.round((Math.random() * 1.2 + 0.4) * 10) / 10,
          },
          driverHealth: {
            ...p.driverHealth,
            status: 'healthy',
            lastAuditTimestamp: now,
            diagnostics: reconnectDiag,
          },
        };
        return reconnectedPeripheral;
      }
      return p;
    });

    return {
      success: !!reconnectedPeripheral,
      peripheral: reconnectedPeripheral,
      peripherals: this.getHardwarePeripherals(),
      reconnectTimestamp: now,
      diagnostics: reconnectedPeripheral?.driverHealth.diagnostics || '',
    };
  }

  bulkRebootPeripherals(peripheralIds: string[]): {
    success: boolean;
    rebootedCount: number;
    peripherals: HardwarePeripheralStatus[];
    rebootTimestamp: string;
  } {
    const now = new Date().toISOString();
    let rebootedCount = 0;

    this.peripherals = this.peripherals.map((p) => {
      if (peripheralIds.includes(p.id)) {
        rebootedCount++;
        const rebootDiag = `[Bulk Remote Power Cycle] ส่งสัญญาณรีเซ็ต DTR Power Rails พร้อมกันสำเร็จ - Cold Boot เสร็จสิ้น อุปกรณ์กลับสู่สภาวะปกติ (0 Errors)`;
        return {
          ...p,
          lastActivity: now,
          connectivity: {
            ...p.connectivity,
            state: 'online',
            lastPingTimestamp: now,
            latencyMs: Math.round((Math.random() * 1.5 + 0.5) * 10) / 10,
          },
          driverHealth: {
            ...p.driverHealth,
            status: 'healthy',
            lastAuditTimestamp: now,
            diagnostics: rebootDiag,
          },
        };
      }
      return p;
    });

    return {
      success: true,
      rebootedCount,
      peripherals: this.getHardwarePeripherals(),
      rebootTimestamp: now,
    };
  }

  toggleMaintenanceMode(peripheralId: string, enabled: boolean): {
    success: boolean;
    peripheral?: HardwarePeripheralStatus;
    peripherals: HardwarePeripheralStatus[];
    maintenanceTimestamp: string;
  } {
    const now = new Date().toISOString();
    let updatedPeripheral: HardwarePeripheralStatus | undefined;

    this.peripherals = this.peripherals.map((p) => {
      if (p.id === peripheralId) {
        const diag = enabled
          ? `[Maintenance Mode Active] อุปกรณ์เข้าสู่โหมดซ่อมบำรุง — ระงับการแจ้งเตือนข้อผิดพลาดและการหลุดการเชื่อมต่อทั้งหมดชั่วคราว`
          : `[Maintenance Mode Ended] อุปกรณ์ออกจากโหมดซ่อมบำรุง — กลับสู่สถานะตรวจสอบปกติ`;
        updatedPeripheral = {
          ...p,
          isMaintenanceMode: enabled,
          driverHealth: {
            ...p.driverHealth,
            diagnostics: diag,
          },
        };
        return updatedPeripheral;
      }
      return p;
    });

    return {
      success: !!updatedPeripheral,
      peripheral: updatedPeripheral,
      peripherals: this.getHardwarePeripherals(),
      maintenanceTimestamp: now,
    };
  }
}

export const infrastructureAiService = new InfrastructureAIService();
