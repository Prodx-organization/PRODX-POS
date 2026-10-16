import type { Express, Request, Response } from 'express';
import { infrastructureAiService } from '../services/infrastructureAiService';
import { firmwareRegistryService } from '../services/firmwareRegistryService';
import { GoogleGenAI } from '@google/genai';

export function registerInfrastructureRoutes(app: Express) {
  // Get system infrastructure health
  app.get('/api/v1/infrastructure/health', (_req: Request, res: Response) => {
    try {
      const health = infrastructureAiService.getSystemHealth();
      res.json({ success: true, data: health });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch infrastructure health' });
    }
  });

  // Trigger Antigravity AI autonomous self-heal
  app.post('/api/v1/infrastructure/self-heal', async (_req: Request, res: Response) => {
    try {
      const result = await infrastructureAiService.runAntigravitySelfHeal();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Self-heal execution failed' });
    }
  });

  // Get connected Plug & Play devices
  app.get('/api/v1/infrastructure/devices', (_req: Request, res: Response) => {
    try {
      const devices = infrastructureAiService.getDevices();
      res.json({ success: true, data: devices });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch devices' });
    }
  });

  // Scan Plug & Play devices
  app.post('/api/v1/infrastructure/devices/scan', async (_req: Request, res: Response) => {
    try {
      const result = await infrastructureAiService.scanPlugAndPlayDevices();
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Device scan failed' });
    }
  });

  // Auto-update device driver
  app.post('/api/v1/infrastructure/devices/update-driver', async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.body;
      if (!deviceId) {
        return res.status(400).json({ success: false, error: 'deviceId is required' });
      }
      const result = await infrastructureAiService.updateDeviceDriver(deviceId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Driver update failed' });
    }
  });

  // Get automated firmware/security advisory alerts
  app.get('/api/v1/infrastructure/firmware-alerts', (_req: Request, res: Response) => {
    try {
      const alerts = firmwareRegistryService.getAlerts();
      res.json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch firmware alerts' });
    }
  });

  // Check hardware signatures against remote registry
  app.post('/api/v1/infrastructure/firmware-check', (_req: Request, res: Response) => {
    try {
      const devices = infrastructureAiService.getDevices();
      const alerts = firmwareRegistryService.checkHardwareSignatures(devices);
      res.json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Firmware check failed' });
    }
  });

  // Bulk firmware check across all connected peripherals
  app.post('/api/v1/infrastructure/firmware-check/bulk', async (_req: Request, res: Response) => {
    try {
      const result = await infrastructureAiService.runBulkFirmwareCheck();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Bulk firmware check failed' });
    }
  });

  // Apply critical firmware / security patch
  app.post('/api/v1/infrastructure/apply-patch', (req: Request, res: Response) => {
    try {
      const { alertId } = req.body;
      if (!alertId) {
        return res.status(400).json({ success: false, error: 'alertId is required' });
      }
      const result = firmwareRegistryService.applySecurityPatch(alertId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Security patch application failed' });
    }
  });

  // Get discovered USB / Bluetooth peripherals
  app.get('/api/v1/infrastructure/peripheral-discovery', (_req: Request, res: Response) => {
    try {
      const peripherals = infrastructureAiService.getDiscoveredPeripherals();
      res.json({ success: true, data: peripherals });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch discovered peripherals' });
    }
  });

  // Scan USB and Bluetooth ports for new POS peripherals
  app.post('/api/v1/infrastructure/peripheral-discovery/scan', async (_req: Request, res: Response) => {
    try {
      const result = await infrastructureAiService.scanAndDiscoverPeripherals();
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'USB/Bluetooth peripheral port scan failed' });
    }
  });

  // Auto-configure peripheral
  app.post('/api/v1/infrastructure/peripheral-autoconfig', async (req: Request, res: Response) => {
    try {
      const { peripheralId } = req.body;
      if (!peripheralId) {
        return res.status(400).json({ success: false, error: 'peripheralId is required' });
      }
      const result = await infrastructureAiService.autoConfigurePeripheral(peripheralId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Auto-configuration failed' });
    }
  });

  // Get real-time status of all detected hardware peripherals (printers, scanners, drawers)
  app.get('/api/v1/infrastructure/hardware-peripherals', (_req: Request, res: Response) => {
    try {
      const peripherals = infrastructureAiService.getHardwarePeripherals();
      res.json({ success: true, data: peripherals });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch hardware peripherals' });
    }
  });

  // Antigravity AI on-demand peripheral & driver health audit
  app.post('/api/v1/infrastructure/hardware-peripherals/audit', async (req: Request, res: Response) => {
    try {
      const { peripheralId } = req.body || {};
      const result = await infrastructureAiService.runPeripheralHealthAudit(peripheralId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Hardware peripheral audit failed' });
    }
  });

  // Simulated hardware connection handshake diagnostics
  app.post('/api/v1/infrastructure/hardware-peripherals/diagnostics-handshake', async (req: Request, res: Response) => {
    try {
      const { peripheralId, simulateFailure } = req.body || {};
      if (!peripheralId) {
        return res.status(400).json({ success: false, error: 'peripheralId is required for diagnostics handshake' });
      }
      const result = await infrastructureAiService.runConnectionHandshake(peripheralId, simulateFailure);
      if (!result.success) {
        return res.status(502).json(result);
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Diagnostics handshake failed' });
    }
  });

  // Run comprehensive hardware test suite for printers, scanners, and cash drawers
  app.post('/api/v1/infrastructure/hardware-test-suite/run', async (req: Request, res: Response) => {
    try {
      const { category, simulateFaultDeviceId, simulateFaultAll } = req.body || {};
      const suiteSummary = await infrastructureAiService.runHardwareTestSuite({
        category,
        simulateFaultDeviceId,
        simulateFaultAll,
      });
      res.json({ success: true, data: suiteSummary });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Hardware test suite run failed' });
    }
  });

  // Get latest hardware test suite results
  app.get('/api/v1/infrastructure/hardware-test-suite/latest', async (_req: Request, res: Response) => {
    try {
      let suite = infrastructureAiService.getLatestTestSuiteSummary();
      if (!suite) {
        suite = await infrastructureAiService.runHardwareTestSuite();
      }
      res.json({ success: true, data: suite });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch test suite results' });
    }
  });

  // Test a single hardware device on-demand
  app.post('/api/v1/infrastructure/hardware-test-suite/device', async (req: Request, res: Response) => {
    try {
      const { deviceId, simulateFault } = req.body || {};
      if (!deviceId) {
        return res.status(400).json({ success: false, error: 'deviceId is required' });
      }
      const suite = await infrastructureAiService.runHardwareTestSuite({
        simulateFaultDeviceId: simulateFault ? deviceId : undefined,
      });
      const deviceResult = suite.results.find((r) => r.peripheralId === deviceId);
      res.json({ success: true, data: deviceResult, suiteSummary: suite });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Single hardware device test failed' });
    }
  });

  // Gemini Frontend AI Assistant Endpoint
  app.post('/api/v1/ai/frontend-assistant', async (req: Request, res: Response) => {
    try {
      const { prompt, history } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, error: 'prompt is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback intelligent POS assistant response if API key is not set
        return res.json({
          success: true,
          response: `ยินดีต้อนรับครับ! ในฐานะ Gemini AI Assistant ประจำ PRODX-POS ผมพร้อมช่วยเหลือคุณในการใช้งานระบบ POS, การจัดการสต็อก, การชำระเงิน หรือการตรวจสอบอุปกรณ์ครับ (หมายเหตุ: กรุณาตั้งค่า GEMINI_API_KEY เพื่อเปิดใช้งานความสามารถเต็มรูปแบบ)`,
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const interaction = await ai.interactions.create({
        model: 'gemini-3.8-flash',
        system_instruction: 'You are the intelligent frontend AI assistant for PRODX-POS, a professional Point of Sale system. Assist cashiers and store managers in polite, professional Thai language regarding POS operations, sales, refunds, inventory, and hardware.',
        input: prompt,
      });

      const responseText = interaction.output_text || 'ขออภัยครับ ไม่สามารถประมวลผลคำตอบได้ในขณะนี้';
      res.json({ success: true, response: responseText });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'AI Assistant request failed' });
    }
  });
}
