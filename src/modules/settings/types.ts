/**
 * PRODX POS - Unified Enterprise Settings & System Management Hub Types
 */

import { GraphicIconColor } from '../../components/common/GraphicIcon';

export type SettingsTabId =
  | 'general'
  | 'ai_assistant'
  | 'modules_control'
  | 'system_tools'
  | 'loyalty_crm'
  | 'appearance'
  | 'hardware'
  | 'tax_accounting'
  | 'security_roles'
  | 'role_management'
  | 'role_assignment'
  | 'permission_sets'
  | 'data_sync';

export interface SettingsTabItem {
  id: SettingsTabId;
  label: { th: string; en: string };
  sublabel: { th: string; en: string };
  iconName: string;
  graphicColor: GraphicIconColor;
  badge?: string;
  category: 'store_pos' | 'hardware_peripherals' | 'loyalty_crm' | 'security_admin';
  isQuickTab?: boolean;
}

export interface StoreProfileFormState {
  storeName: string;
  storeCode: string;
  storeAddress: string;
  storePhone: string;
  timezone: string;
  baseCurrency: string;
  taxId: string;
  branchName: string;
  receiptHeaderMsg: string;
  receiptFooterMsg: string;
  promptPayId: string;
  terminalId: string;
}

export interface TaxAccountingFormState {
  defaultTaxRateBps: number; // e.g. 700 = 7.00%
  taxCalculationType: 'inclusive' | 'exclusive';
  taxId: string;
  posMachineId: string;
  enableCash: boolean;
  enableCard: boolean;
  enablePromptPay: boolean;
  enableSplitPayment: boolean;
}

export interface SecurityPoliciesState {
  inactivityTimeoutMinutes: number;
  requirePinForVoid: boolean;
  requirePinForDiscount: boolean;
  requirePinForDrawerKick: boolean;
  requirePinForPriceOverride: boolean;
  allowCashierRefund: boolean;
  maxDiscountWithoutApproval: number; // e.g. 15%
  maxRefundAmountWithoutApproval: number; // e.g. 2000 THB
  auditRetentionDays: number;
  enableBiometricUnlock: boolean;
}

export interface CustomerDisplayConfigState {
  enabled: boolean;
  welcomeMessage: string;
  subMessage: string;
  bannerImageUrl: string;
  autoSlideshow: boolean;
  slideshowIntervalSeconds: number;
  showCartLive: boolean;
  showQrPaymentPrompt: boolean;
}

export interface HardwareAudioConfigState {
  beepOnScan: boolean;
  soundEnabled: boolean;
  volume: number; // 0 to 100
  printerPaperWidth: '58mm' | '80mm';
  printerAutoCut: boolean;
  printerFeedLines: number;
  cashDrawerKickPulseMs: number;
  scaleUnit: 'kg' | 'g' | 'lb';
}

// -------------------------------------------------------------
// 100% Comprehensive System Module & Feature Configuration
// -------------------------------------------------------------

export interface SystemModuleFeature {
  id: string;
  name: { th: string; en: string };
  description: { th: string; en: string };
  enabled: boolean;
  requiredRole?: string;
}

export interface SystemModuleConfig {
  id: string;
  code: string;
  name: { th: string; en: string };
  description: { th: string; en: string };
  iconName: string;
  color: GraphicIconColor;
  enabled: boolean;
  defaultRoute?: string;
  badge?: string;
  features: SystemModuleFeature[];
}

// -------------------------------------------------------------
// Component Management & Tools Hub Types (CRUD)
// -------------------------------------------------------------

export interface QuickKeyItem {
  id: string;
  label: string;
  sku?: string;
  price?: number;
  actionType: 'add_product' | 'discount' | 'custom_amount' | 'open_drawer' | 'print_last';
  color: GraphicIconColor;
  iconName: string;
  sortOrder: number;
  isEnabled: boolean;
}

export interface PaymentMethodItem {
  id: string;
  name: string;
  code: string;
  type: 'cash' | 'card' | 'qr' | 'ewallet' | 'voucher' | 'credit';
  iconName: string;
  color: GraphicIconColor;
  feePercent: number;
  minAmount: number;
  requireApproval: boolean;
  isEnabled: boolean;
  sortOrder: number;
}

export interface DiscountPresetItem {
  id: string;
  name: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  requireManagerPin: boolean;
  isEnabled: boolean;
}

export interface TaxBracketItem {
  id: string;
  name: string;
  rateBps: number;
  isInclusive: boolean;
  isDefault: boolean;
  isEnabled: boolean;
  description: string;
}

export interface LoyaltyTierItem {
  id: string;
  name: string;
  minSpend: number;
  pointMultiplier: number;
  discountPercent: number;
  color: GraphicIconColor;
  badge: string;
  perks: string[];
}

export interface LoyaltyEngineConfig {
  enabled: boolean;
  pointsEarnRate: number; // Spent THB for 1 point, e.g. 25 THB = 1 pt
  pointsRedeemRate: number; // Points needed for 1 THB discount, e.g. 10 pts = 1 THB
  pointsExpiryDays: number;
  allowNegativePoints: boolean;
  tiers: LoyaltyTierItem[];
}

export interface ReceiptTemplateConfig {
  logoUrl: string;
  storeName: string;
  branchName: string;
  address: string;
  phone: string;
  taxId: string;
  posId: string;
  headerMessage: string;
  footerMessage: string;
  showTaxBreakdown: boolean;
  showCashierName: boolean;
  showCustomerLoyalty: boolean;
  showBarcode: boolean;
  showQrPayment: boolean;
  showWifiInfo: boolean;
  wifiSsid: string;
  wifiPassword: string;
  paperWidth: '58mm' | '80mm';
}
