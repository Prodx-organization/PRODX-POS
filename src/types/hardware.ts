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

export interface PredictiveAnalysis {
  reliabilityScore: number; // 0-100
  estimatedTimeToFailureDays: number | null;
  maintenanceRecommended: boolean;
  analysisInsight: string;
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
  predictiveAnalysis: PredictiveAnalysis;
  lastActivity: string;
  telemetryData: {
    operationsCountToday: number;
    errorCountToday: number;
    historicalErrorCount: number;
    temperatureCelsius?: number;
  };
  tags?: string[];
  isPowerSaveMode?: boolean;
  powerSaveWatts?: number;
  currentPowerDrawWatts?: number;
  isMaintenanceMode?: boolean;
  position?: { x: number, y: number };
}
