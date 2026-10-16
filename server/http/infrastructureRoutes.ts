import type { Express, Request, Response } from 'express';
import { infrastructureAiService } from '../services/infrastructureAiService';
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
