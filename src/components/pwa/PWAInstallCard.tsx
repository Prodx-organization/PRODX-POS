import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useLanguage } from '../../context/LanguageContext';
import {
  Download,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  Zap,
  HardDrive,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export const PWAInstallCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, deviceType, install } = usePWAInstall();
  const { language } = useLanguage();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Direct instruction fallback if ambient prompt not yet triggered
      setShowIOSModal(true);
    }
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      case 'desktop':
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getDeviceLabel = () => {
    switch (deviceType) {
      case 'mobile':
        return language === 'th' ? 'สมาร์ทโฟน (Mobile)' : 'Smartphone (Mobile)';
      case 'tablet':
        return language === 'th' ? 'แท็บเล็ต (Tablet)' : 'Tablet';
      case 'desktop':
      default:
        return language === 'th' ? 'คอมพิวเตอร์ (Desktop / POS)' : 'Desktop / POS Screen';
    }
  };

  return (
    <div className={`p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {getDeviceIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-text">
                {language === 'th' ? 'ติดตั้งแอปพลิเคชัน (PWA Install)' : 'Install PRODX-POS App (PWA)'}
              </h3>
              <Badge variant="primary" size="sm">
                {getDeviceLabel()}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {language === 'th'
                ? 'ติดตั้งเป็นแอปเพื่อการทำงานแบบออฟไลน์ 100% เร็วกว่า ไร้แถบเบราว์เซอร์ และทำงานเหมือนแอปพื้นเมือง'
                : 'Install as a standalone native-like app for zero-latency offline performance and full-screen experience.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {isInstalled ? (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{language === 'th' ? 'ติดตั้งแอปแล้ว' : 'App Installed'}</span>
            </div>
          ) : (
            <Button
              onClick={handleInstallClick}
              isLoading={isInstalling}
              variant="primary"
              className="px-5 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 cursor-pointer"
              aria-label="Install PRODX POS"
            >
              <Download className="w-4 h-4" />
              {language === 'th' ? 'ติดตั้ง PRODX POS' : 'Install PRODX POS'}
            </Button>
          )}
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="p-3 rounded-2xl bg-background border border-border flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-text">
              {language === 'th' ? 'ความเร็วสูง ไร้การหน่วง' : 'Native Offline Speed'}
            </div>
            <div className="text-text-muted text-[11px] mt-0.5">
              {language === 'th' ? 'เปิดเร็วใน 0.5 วินาที พร้อมโหลดสินค้ารวดเร็ว' : 'Instant 0.5s launch time with local cache.'}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-background border border-border flex items-start gap-2.5">
          <HardDrive className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-text">
              {language === 'th' ? 'บันทึกออฟไลน์ 100%' : 'Resilient Outbox'}
            </div>
            <div className="text-text-muted text-[11px] mt-0.5">
              {language === 'th' ? 'แคชธุรกรรมบนเครื่องอย่างปลอดภัยแม้เน็ตหลุด' : 'Transactions queued reliably without internet.'}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-background border border-border flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-text">
              {language === 'th' ? 'เต็มหน้าจอ POS' : 'Immersive Standalone'}
            </div>
            <div className="text-text-muted text-[11px] mt-0.5">
              {language === 'th' ? 'ไร้แถบ URL เบราว์เซอร์ เหมาะสำหรับแคชเชียร์' : 'Hides browser address bar for retail focus.'}
            </div>
          </div>
        </div>
      </div>

      {/* Guided Install Instructions Modal (for iOS or Desktop fallback) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card text-text w-full max-w-md rounded-3xl shadow-2xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                {language === 'th' ? 'วิธีติดตั้งแอปพลิเคชัน' : 'How to Install PRODX-POS'}
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 hover:bg-card-hover rounded-xl text-text-muted hover:text-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-text/80">
              {isIOS ? (
                <>
                  <p>
                    {language === 'th'
                      ? 'สำหรับ Safari บน iPhone หรือ iPad ทำตามขั้นตอนง่ายๆ ดังนี้:'
                      : 'On Safari for iPhone or iPad, follow these simple steps:'}
                  </p>
                  <ol className="list-decimal list-inside space-y-2 pl-1 font-medium">
                    <li className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-primary shrink-0" />
                      <span>{language === 'th' ? 'กดปุ่มแชร์ (Share) ที่แถบด้านล่าง' : 'Tap the Share button at the bottom'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <PlusSquare className="w-4 h-4 text-primary shrink-0" />
                      <span>{language === 'th' ? 'เลือก "เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)' : 'Select "Add to Home Screen"'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{language === 'th' ? 'กด "เพิ่ม" (Add) ที่มุมขวาบน' : 'Tap "Add" in the top-right corner'}</span>
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p>
                    {language === 'th'
                      ? 'สำหรับเบราว์เซอร์บนคอมพิวเตอร์ (Chrome / Edge / Opera):'
                      : 'For desktop browsers (Chrome / Edge / Opera):'}
                  </p>
                  <ol className="list-decimal list-inside space-y-2 pl-1 font-medium">
                    <li>
                      {language === 'th'
                        ? 'มองหาไอคอนรูปหน้าจอหรือติดตั้ง [⊞] ที่แถบ URL ของเบราว์เซอร์'
                        : 'Look for the Install icon [⊞] in your browser address bar'}
                    </li>
                    <li>
                      {language === 'th'
                        ? 'คลิก "ติดตั้ง PRODX POS" เพื่อเปิดแอปในหน้าต่างส่วนตัว'
                        : 'Click "Install PRODX POS" to launch standalone window'}
                    </li>
                  </ol>
                </>
              )}
            </div>

            <Button
              variant="primary"
              className="w-full text-xs font-bold"
              onClick={() => setShowIOSModal(false)}
            >
              {language === 'th' ? 'เข้าใจแล้ว' : 'Got it'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
