/**
 * PRODX POS - Firebase Cloud Messaging (FCM) Notification Widget & Settings Tab
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCircle2, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '../common/Card';
import { requestFcmPermission, getStoredFcmToken } from '../../services/firebase/fcmService';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

export const FcmNotificationWidget: React.FC = () => {
  const { addToast } = useToast();
  const { language } = useLanguage();
  const isThai = language === 'th';

  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
      const token = getStoredFcmToken();
      if (token) setFcmToken(token);
    }
  }, []);

  const handleEnableFcm = async () => {
    setLoading(true);
    try {
      const token = await requestFcmPermission();
      if (token) {
        setFcmToken(token);
        setPermissionState('granted');
        addToast({
          title: isThai ? 'เปิดใช้งานการแจ้งเตือนสำเร็จ' : 'FCM Notifications Enabled',
          message: isThai ? 'POS พร้อมรับการแจ้งเตือนสต็อกต่ำและการอนุมัติผู้จัดการแบบเรียลไทม์' : 'POS is now subscribed to real-time stock and approval push notifications.',
          type: 'success',
        });
      } else {
        setPermissionState(Notification.permission);
        addToast({
          title: isThai ? 'ไม่อนุญาตการแจ้งเตือน' : 'Permission Denied',
          message: isThai ? 'โปรดอนุญาตการแจ้งเตือนในเบราว์เซอร์เพื่อรับการแจ้งเตือน' : 'Please enable notification permissions in your browser settings.',
          type: 'warning',
        });
      }
    } catch (err: any) {
      addToast({
        title: isThai ? 'เกิดข้อผิดพลาด' : 'Error',
        message: err.message || 'Failed to initialize FCM.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateAlert = (type: 'stock' | 'approval') => {
    if (type === 'stock') {
      addToast({
        title: isThai ? '⚠️ แจ้งเตือนสต็อกต่ำ (Low Stock Alert)' : '⚠️ Low Stock Alert (FCM)',
        message: isThai ? 'สินค้า "Double Espresso" เหลือเพียง 8 ชิ้น (ต่ำกว่าจุด Reorder Point)' : 'Product "Double Espresso" is low on stock (8 units remaining).',
        type: 'warning',
      });
    } else {
      addToast({
        title: isThai ? '🔔 คำขออนุมัติผู้จัดการ (Manager Approval)' : '🔔 Manager Approval Request (FCM)',
        message: isThai ? 'แคชเชียร์ขออนุมัติยกเลิกคำสั่งซื้อ #ORD-0904-0042 (฿2,354.00)' : 'Cashier requested supervisor approval for voiding order #ORD-0904-0042.',
        type: 'info',
      });
    }
  };

  return (
    <Card className="bg-card border-border shadow-xs">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-primary" />
              <span>{isThai ? 'การแจ้งเตือนเรียลไทม์ (Firebase Cloud Messaging - FCM)' : 'Real-Time Push Notifications (FCM)'}</span>
            </CardTitle>
            <CardDescription>
              {isThai ? 'รับการแจ้งเตือนด่วนสำหรับสินค้าใกล้หมด (Low Stock) และคำขออนุมัติจากผู้จัดการทันที' : 'Receive instant push alerts for low stock levels and manager approvals.'}
            </CardDescription>
          </div>
          <Badge variant={permissionState === 'granted' ? 'success' : 'neutral'}>
            {permissionState === 'granted' ? (isThai ? 'เปิดใช้งานแล้ว' : 'Active') : (isThai ? 'ยังไม่เปิดใช้งาน' : 'Inactive')}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${permissionState === 'granted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {permissionState === 'granted' ? (isThai ? 'อุปกรณ์นี้เชื่อมต่อ FCM สำเร็จแล้ว' : 'Device Subscribed to FCM') : (isThai ? 'เปิดใช้งานการแจ้งเตือนพุช' : 'Enable Browser Push Notifications')}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {fcmToken ? `Token: ${fcmToken.slice(0, 20)}...` : (isThai ? 'คลิกเพื่ออนุญาตการรับแจ้งเตือนผ่านเบราว์เซอร์' : 'Click to authorize browser notification permissions.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {permissionState !== 'granted' ? (
              <Button variant="primary" size="sm" onClick={handleEnableFcm} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isThai ? 'เปิดใช้งาน FCM' : 'Enable FCM'}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleSimulateAlert('stock')} className="text-xs">
                  {isThai ? 'ทดสอบแจ้งเตือนสต็อก' : 'Test Stock Alert'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSimulateAlert('approval')} className="text-xs">
                  {isThai ? 'ทดสอบขออนุมัติ' : 'Test Approval'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
