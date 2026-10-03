import React, { useState, useRef } from 'react';
import { KeyRound, Check, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

export interface PinChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PinChangeModal: React.FC<PinChangeModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const { addToast } = useToast();
  const { session, setStaffPin } = useAuth();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!import.meta.env.DEV) {
      addToast({
        title: language === 'th' ? 'ต้องใช้ระบบจัดการ PIN บนเซิร์ฟเวอร์' : 'Server PIN management required',
        message: language === 'th' ? 'ไม่อนุญาตให้บันทึก PIN ใน browser สำหรับ production' : 'Production PINs cannot be stored in the browser.',
        type: 'error',
      });
      return;
    }

    if (newPin.length < 4) {
      addToast({
        title: language === 'th' ? 'PIN สั้นเกินไป' : 'Invalid PIN',
        message: language === 'th' ? 'รหัส PIN ต้องมีความยาวอย่างน้อย 4 หลัก' : 'PIN must be at least 4 digits.',
        type: 'warning',
      });
      return;
    }

    if (newPin !== confirmPin) {
      addToast({
        title: language === 'th' ? 'รหัส PIN ไม่ตรงกัน' : 'PIN Mismatch',
        message: language === 'th' ? 'รหัส PIN ใหม่และการยืนยันไม่ตรงกัน กรุณากรอกใหม่อีกครั้ง' : 'New PIN and confirmation PIN do not match.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      try {
        if (session) {
          setStaffPin(session.currentUser.id, newPin);
        }
        addToast({
          title: language === 'th' ? 'เปลี่ยนรหัส PIN สำเร็จ' : 'PIN Updated',
          message: language === 'th' ? 'คุณสามารถใช้รหัส PIN ใหม่เพื่อปลดล็อกหน้าจอและยืนยันคำสั่งได้ทันที' : 'Your security PIN has been updated successfully.',
          type: 'success',
        });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setIsSubmitting(false);
        onClose();
      } catch (err) {
        setIsSubmitting(false);
        addToast({
          title: language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error',
          message: String(err),
          type: 'error',
        });
      }
    }, 400);
  };

  return (
    <Modal
      id="pin-change-modal"
      isOpen={isOpen}
      onClose={onClose}
      initialFocusRef={initialInputRef}
      title={language === 'th' ? 'เปลี่ยนรหัส PIN ผู้ใช้งาน' : 'Change User PIN'}
      description={
        language === 'th'
          ? `ตั้งรหัส PIN 4-6 หลัก สำหรับคุณ ${session?.currentUser.name} (${session?.currentUser.role.toUpperCase()})`
          : `Set a 4-6 digit numeric PIN for ${session?.currentUser.name} (${session?.currentUser.role.toUpperCase()})`
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-text flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          <div className="text-[11px] text-text/80">
            {language === 'th'
              ? 'รหัส PIN ใช้สำหรับปลดล็อกหน้าจอ POS เมื่อหมดเวลา และอนุมัติการแก้ไขรายการหรือการเปิดลิ้นชัก'
              : 'Your PIN is used for unlocking the terminal screensaver and approving privileged supervisor actions.'}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="current-pin-input" className="block text-[11px] font-bold text-text/70 uppercase tracking-wide">
            {language === 'th' ? 'รหัส PIN ปัจจุบัน (หากมี)' : 'Current PIN (Optional)'}
          </label>
          <div className="relative">
            <input
              id="current-pin-input"
              ref={initialInputRef}
              type={showPin ? 'text' : 'password'}
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-text font-mono text-sm tracking-widest focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="new-pin-input" className="block text-[11px] font-bold text-text/70 uppercase tracking-wide">
            {language === 'th' ? 'รหัส PIN ใหม่ (4-6 หลัก)' : 'New PIN (4-6 Digits)'}
          </label>
          <div className="relative">
            <input
              id="new-pin-input"
              type={showPin ? 'text' : 'password'}
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              required
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-text font-mono text-sm tracking-widest focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
            <button
              type="button"
              tabIndex={0}
              onClick={() => setShowPin(!showPin)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text/40 hover:text-text cursor-pointer p-1 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={showPin ? 'Hide PIN digits' : 'Show PIN digits'}
            >
              {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="confirm-pin-input" className="block text-[11px] font-bold text-text/70 uppercase tracking-wide">
            {language === 'th' ? 'ยืนยันรหัส PIN ใหม่อีกครั้ง' : 'Confirm New PIN'}
          </label>
          <div className="relative">
            <input
              id="confirm-pin-input"
              type={showPin ? 'text' : 'password'}
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              required
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-text font-mono text-sm tracking-widest focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="rounded-md"
          >
            {language === 'th' ? 'ยกเลิก (Esc)' : 'Cancel (Esc)'}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="rounded-md"
            leftIcon={<KeyRound className="h-3.5 w-3.5" />}
          >
            {language === 'th' ? 'ตั้งรหัส PIN' : 'Save PIN'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

