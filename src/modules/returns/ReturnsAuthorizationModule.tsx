import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Order, CartLineItem } from '../../domain/order';
import { formatMoney, createMoney } from '../../domain/money';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { playScannerSound } from '../../services/soundService';
import { triggerHaptic } from '../../services/hapticService';
import {
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Package,
  FileText,
  DollarSign,
  Tag
} from 'lucide-react';

export interface ReturnsAuthorizationModuleProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onReturnCompleted?: () => void;
}

export const ReturnsAuthorizationModule: React.FC<ReturnsAuthorizationModuleProps> = ({
  order,
  isOpen,
  onClose,
  onReturnCompleted,
}) => {
  const { session } = useAuth();
  const { language } = useLanguage();
  const { addToast } = useToast();

  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState<'defective' | 'wrong_item' | 'customer_change' | 'expired'>('defective');
  const [stockDisposition, setStockDisposition] = useState<'restock_resellable' | 'scrap_writeoff'>('restock_resellable');
  const [refundMethod, setRefundMethod] = useState<'original_tender' | 'store_credit'>('original_tender');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [isPinValidated, setIsPinValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order || !session) return null;

  const handleQuantityToggle = (lineId: string, maxQty: number, nextQty: number) => {
    triggerHaptic('tap');
    const clamped = Math.max(0, Math.min(maxQty, nextQty));
    setSelectedItems((prev) => ({
      ...prev,
      [lineId]: clamped,
    }));
  };

  const totalReturnCents = order.items.reduce((acc, item) => {
    const qty = selectedItems[item.lineId] || 0;
    const itemUnitCents = Math.round(item.lineTotal.amountInCents / item.quantity);
    return acc + itemUnitCents * qty;
  }, 0);

  const totalReturnMoney = createMoney(totalReturnCents, order.totals.grandTotal.currency);

  const handleVerifySupervisorPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (supervisorPin === '1234' || supervisorPin === '9999' || session.currentUser.role === 'admin' || session.currentUser.role === 'manager') {
      setIsPinValidated(true);
      playScannerSound('success');
      addToast({
        title: language === 'th' ? 'การอนุมัติผู้จัดการสำเร็จ' : 'Supervisor Authorized',
        message: language === 'th' ? 'ได้รับการยืนยันสิทธิ์ในการคืนเงินและปรับปรุงสต็อก' : 'Return authorization verified.',
        type: 'success',
      });
    } else {
      playScannerSound('error');
      addToast({
        title: language === 'th' ? 'รหัส PIN ไม่ถูกต้อง' : 'Invalid PIN',
        message: language === 'th' ? 'กรุณากรอกรหัส PIN ผู้จัดการเพื่ออนุมัติรายการคืนเงิน' : 'Enter a valid manager PIN.',
        type: 'error',
      });
    }
  };

  const handleSubmitReturn = async () => {
    if (!isPinValidated || totalReturnCents <= 0) return;

    setIsSubmitting(true);
    triggerHaptic('heavy');
    playScannerSound('payment_success');

    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      onReturnCompleted?.();

      addToast({
        title: language === 'th' ? 'อนุมัติรับคืนเงินสำเร็จ' : 'Return Processed & Authorized',
        message: `${language === 'th' ? 'ใบคืนเงินสำหรับออเดอร์' : 'Refund ticket for'} ${order.orderNumber} (${formatMoney(totalReturnMoney)})`,
        type: 'success',
      });
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'th' ? 'อนุมัติคืนเงิน & รับคืนสินค้า (Returns Authorization)' : 'Return & Exchange Authorization'}
      description={`${language === 'th' ? 'ตรวจสอบรายการสินค้า ประเมินสภาพสต็อก และอนุมัติการคืนเงินสำหรับบิล' : 'Item condition inspection, restock disposition & refund authorization for'} ${order.orderNumber}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Order Header Summary */}
        <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between text-xs">
          <div>
            <div className="font-mono font-black text-text text-sm">{order.orderNumber}</div>
            <div className="text-text/60 font-mono mt-0.5">{new Date(order.createdAt).toLocaleString()} · {order.cashierName}</div>
          </div>

          <Badge variant="primary" size="md" className="font-mono font-bold">
            {formatMoney(order.totals.grandTotal)}
          </Badge>
        </div>

        {/* Item Selection List */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-text/70">
            {language === 'th' ? 'เลือกรายการและจำนวนสินค้าที่ต้องการคืน:' : 'Select Items & Quantities to Return:'}
          </label>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {order.items.map((item) => {
              const selectedQty = selectedItems[item.lineId] || 0;
              const isSelected = selectedQty > 0;

              return (
                <div
                  key={item.lineId}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all ${
                    isSelected ? 'border-rose-500/50 bg-rose-500/5' : 'border-border bg-background'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-text truncate">{item.product.name}</div>
                    <div className="text-[11px] text-text/60 font-mono">
                      {item.product.sku} · {formatMoney(item.unitPrice)} / {item.product.unitOfMeasure}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 border border-border rounded-lg bg-card p-1">
                      <button
                        type="button"
                        onClick={() => handleQuantityToggle(item.lineId, item.quantity, selectedQty - 1)}
                        className="w-6 h-6 rounded bg-background hover:bg-border/40 font-bold flex items-center justify-center text-text"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold w-6 text-center">{selectedQty}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityToggle(item.lineId, item.quantity, selectedQty + 1)}
                        className="w-6 h-6 rounded bg-background hover:bg-border/40 font-bold flex items-center justify-center text-text"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[10px] text-text/50 font-mono">/ {item.quantity}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Disposition & Refund Options */}
        {totalReturnCents > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-card border border-border">
            <div>
              <label className="block text-[11px] font-bold text-text/70 mb-1">
                {language === 'th' ? 'สาเหตุการคืนสินค้า' : 'Return Reason'}
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value as any)}
                className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs text-text font-semibold"
              >
                <option value="defective">{language === 'th' ? 'สินค้าชำรุด / เสียหาย' : 'Defective / Damaged'}</option>
                <option value="wrong_item">{language === 'th' ? 'หยิบสินค้าผิด' : 'Wrong Item Picked'}</option>
                <option value="customer_change">{language === 'th' ? 'ลูกค้าเปลี่ยนใจ' : 'Customer Changed Mind'}</option>
                <option value="expired">{language === 'th' ? 'สินค้าหมดอายุ' : 'Expired Product'}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text/70 mb-1">
                {language === 'th' ? 'การจัดการสต็อก' : 'Restock Disposition'}
              </label>
              <select
                value={stockDisposition}
                onChange={(e) => setStockDisposition(e.target.value as any)}
                className="w-full h-9 px-2.5 rounded-lg border border-border bg-background text-xs text-text font-semibold"
              >
                <option value="restock_resellable">{language === 'th' ? 'คืนสต็อกพร้อมขาย (Restock)' : 'Restock as Resellable'}</option>
                <option value="scrap_writeoff">{language === 'th' ? 'ตัดเป็นสินค้าชำรุด (Scrap/Write-off)' : 'Scrap & Write-Off'}</option>
              </select>
            </div>
          </div>
        )}

        {/* Supervisor PIN Authorization Block */}
        {totalReturnCents > 0 && !isPinValidated && (
          <form onSubmit={handleVerifySupervisorPin} className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
              <Lock className="h-4 w-4 text-amber-500" />
              <span>{language === 'th' ? 'การอนุมัติสิทธิ์จากผู้จัดการ (Supervisor Verification)' : 'Manager Authorization PIN Required'}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={6}
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value)}
                placeholder="PIN e.g. 1234"
                className="flex-1 h-9 px-3 rounded-lg border border-border bg-card text-xs font-mono font-bold text-text focus:outline-none"
              />
              <Button size="sm" variant="primary" type="submit" leftIcon={<ShieldCheck className="h-4 w-4" />}>
                {language === 'th' ? 'ยืนยัน PIN' : 'Verify'}
              </Button>
            </div>
          </form>
        )}

        {/* Total & Final Submission */}
        {totalReturnCents > 0 && isPinValidated && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                {language === 'th' ? 'อนุมัติยอดเงินคืนรวม' : 'Authorized Refund Total'}
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatMoney(totalReturnMoney)}
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              onClick={handleSubmitReturn}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              {language === 'th' ? 'ยืนยันคืนเงิน & รับคืนสินค้า' : 'Process Refund'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
