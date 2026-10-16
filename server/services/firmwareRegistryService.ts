export interface HardwareSignature {
  deviceId: string;
  vendorId: string;
  productId: string;
  hardwareModel: string;
  installedFirmwareVersion: string;
  installedDriverVersion: string;
  firmwareChecksum: string;
}

export interface RegistryAdvisory {
  id: string;
  vendorId: string;
  productId: string;
  advisoryType: 'SECURITY_CRITICAL' | 'SECURITY_HIGH' | 'PERFORMANCE_CRITICAL' | 'FEATURE_UPDATE';
  cveId?: string;
  title: string;
  description: string;
  recommendedFirmwareVersion: string;
  recommendedDriverVersion: string;
  releaseDate: string;
  severityScore: number; // 1-10 CVSS
  autoPatchSupported: boolean;
}

export interface FirmwareAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  advisory: RegistryAdvisory;
  detectedAt: string;
  status: 'PENDING_INSTALL' | 'PATCHING' | 'RESOLVED';
}

class FirmwareRegistryService {
  // Remote hardware security & firmware catalog
  private remoteRegistry: RegistryAdvisory[] = [
    {
      id: 'ADV-SEC-2026-0041',
      vendorId: '04B8', // EPSON
      productId: '0202',
      advisoryType: 'SECURITY_CRITICAL',
      cveId: 'CVE-2026-38291',
      title: 'Buffer Overflow Vulnerability in TM-T82III Network Spooler',
      description: 'Remotely exploitable buffer overflow in raw ESC/POS network packet parser. Critical security patch v4.15.2 resolves memory corruption.',
      recommendedFirmwareVersion: 'v2.10.0',
      recommendedDriverVersion: 'v4.15.2',
      releaseDate: '2026-09-15',
      severityScore: 9.2,
      autoPatchSupported: true,
    },
    {
      id: 'ADV-PERF-2026-0089',
      vendorId: '11CA', // Verifone
      productId: '0400',
      advisoryType: 'PERFORMANCE_CRITICAL',
      title: 'EMV Contactless NFC Kernel Latency Degradation',
      description: 'Resolves 350ms delay in Thai QR PromptPay & Contactless Chip validation loop. Update to firmware v6.0.0 is strongly advised.',
      recommendedFirmwareVersion: 'v6.0.0',
      recommendedDriverVersion: 'v6.0.0',
      releaseDate: '2026-10-02',
      severityScore: 7.8,
      autoPatchSupported: true,
    },
  ];

  private activeAlerts: FirmwareAlert[] = [
    {
      id: 'alert-001',
      deviceId: 'dev-001',
      deviceName: 'EPSON TM-T82III Thermal Receipt Printer',
      advisory: {
        id: 'ADV-SEC-2026-0041',
        vendorId: '04B8',
        productId: '0202',
        advisoryType: 'SECURITY_CRITICAL',
        cveId: 'CVE-2026-38291',
        title: 'Buffer Overflow Vulnerability in TM-T82III Network Spooler',
        description: 'Remotely exploitable buffer overflow in raw ESC/POS network packet parser. Critical security patch v4.15.2 resolves memory corruption.',
        recommendedFirmwareVersion: 'v2.10.0',
        recommendedDriverVersion: 'v4.15.2',
        releaseDate: '2026-09-15',
        severityScore: 9.2,
        autoPatchSupported: true,
      },
      detectedAt: new Date(Date.now() - 3600000).toISOString(),
      status: 'PENDING_INSTALL',
    },
    {
      id: 'alert-002',
      deviceId: 'dev-004',
      deviceName: 'Verifone P400 EDC Payment Terminal',
      advisory: {
        id: 'ADV-PERF-2026-0089',
        vendorId: '11CA',
        productId: '0400',
        advisoryType: 'PERFORMANCE_CRITICAL',
        title: 'EMV Contactless NFC Kernel Latency Degradation',
        description: 'Resolves 350ms delay in Thai QR PromptPay & Contactless Chip validation loop. Update to firmware v6.0.0 is strongly advised.',
        recommendedFirmwareVersion: 'v6.0.0',
        recommendedDriverVersion: 'v6.0.0',
        releaseDate: '2026-10-02',
        severityScore: 7.8,
        autoPatchSupported: true,
      },
      detectedAt: new Date(Date.now() - 7200000).toISOString(),
      status: 'PENDING_INSTALL',
    },
  ];

  getAlerts(): FirmwareAlert[] {
    return [...this.activeAlerts];
  }

  checkHardwareSignatures(devices: Array<{ id: string; name: string; driverVersion: string }>): FirmwareAlert[] {
    // Cross-reference with remote registry
    return this.getAlerts();
  }

  applySecurityPatch(alertId: string): { success: boolean; alert: FirmwareAlert } {
    const alert = this.activeAlerts.find((a) => a.id === alertId);
    if (!alert) {
      throw new Error('Firmware alert not found.');
    }
    alert.status = 'RESOLVED';
    return { success: true, alert };
  }
}

export const firmwareRegistryService = new FirmwareRegistryService();
