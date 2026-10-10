/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SoundProvider } from './context/SoundContext';
import { HapticProvider } from './context/HapticContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import { ShiftProvider } from './context/ShiftContext';
import { CartProvider } from './context/CartContext';
import { ReceiptPrinterProvider } from './context/ReceiptPrinterContext';
import { VisualInspectorProvider } from './context/VisualInspectorContext';
import { BreadcrumbProvider } from './context/BreadcrumbContext';
import { SettingsProvider } from './context/SettingsContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { GlobalErrorRecoveryProvider } from './context/GlobalErrorRecoveryProvider';
import { AppShell } from './components/layout/AppShell';
import { CustomerDisplayView } from './modules/customerDisplay/CustomerDisplayView';
import { NavRoute } from './components/layout/Sidebar';
import { LoginScreen } from './modules/auth/LoginScreen';
const PosScreen = React.lazy(() => import('./modules/pos/PosScreen').then((module) => ({ default: module.PosScreen })));
const DashboardScreen = React.lazy(() => import('./modules/dashboard/DashboardScreen').then((module) => ({ default: module.DashboardScreen })));
const OrdersScreen = React.lazy(() => import('./modules/orders/OrdersScreen').then((module) => ({ default: module.OrdersScreen })));
const InventoryScreen = React.lazy(() => import('./modules/inventory/InventoryScreen').then((module) => ({ default: module.InventoryScreen })));
const ShiftScreen = React.lazy(() => import('./modules/shift/ShiftScreen').then((module) => ({ default: module.ShiftScreen })));
const CustomersScreen = React.lazy(() => import('./modules/customers/CustomersScreen').then((module) => ({ default: module.CustomersScreen })));
const AuditScreen = React.lazy(() => import('./modules/audit/AuditScreen').then((module) => ({ default: module.AuditScreen })));
const SettingsScreen = React.lazy(() => import('./modules/settings/SettingsScreen').then((module) => ({ default: module.SettingsScreen })));
import { ReceiptValidationPortal } from './components/receipt/ReceiptValidationPortal';
import { ShortcutsOverlay } from './components/common/ShortcutsOverlay';
import { DevPerformanceOverlay } from './components/dev/DevPerformanceOverlay';
import { RbacGuard } from './components/auth/RbacGuard';
import { OwnerPortal } from './modules/owner/OwnerPortal';

const MainApplication: React.FC = () => {
  const { session } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('pos');
  const [isShortcutsOverlayOpen, setIsShortcutsOverlayOpen] = useState(false);

  // Register operational keyboard shortcuts (F1 = POS, F2 = Dashboard, F9 = Shortcuts Overlay, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow F9 to toggle the shortcuts overlay from anywhere
      if (e.key === 'F9') {
        e.preventDefault();
        setIsShortcutsOverlayOpen((prev) => !prev);
        return;
      }

      const activeEl = document.activeElement;
      const isInputFocused =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable) ||
        (activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.tagName === 'SELECT' ||
            (activeEl instanceof HTMLElement && activeEl.isContentEditable)));

      if (isInputFocused) {
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentRoute('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentRoute('dashboard');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentRoute('orders');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setCurrentRoute('shift');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setCurrentRoute('inventory');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setCurrentRoute('customers');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setCurrentRoute('audit');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setCurrentRoute('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!session) {
    return (
      <ErrorBoundary moduleName="Authentication Terminal">
        <LoginScreen />
      </ErrorBoundary>
    );
  }

  return (
    <Suspense fallback={<div role="status">กำลังโหลดโมดูล…</div>}>
      <>
      <AppShell currentRoute={currentRoute} onNavigate={setCurrentRoute}>
        {currentRoute === 'pos' && (
          <ErrorBoundary moduleName="POS Cash Register & Checkout">
            <PosScreen />
          </ErrorBoundary>
        )}
        {currentRoute === 'dashboard' && (
          <ErrorBoundary moduleName="Sales & Analytics Dashboard">
            <RbacGuard
              module="dashboard"
              allowedRoles={['manager', 'admin']}
              hideMode="denied-card"
              onRedirectToPos={() => setCurrentRoute('pos')}
            >
              <DashboardScreen onNavigate={setCurrentRoute} />
            </RbacGuard>
          </ErrorBoundary>
        )}
        {currentRoute === 'orders' && (
          <ErrorBoundary moduleName="Orders & Receipts Management">
            <OrdersScreen onNavigate={setCurrentRoute} />
          </ErrorBoundary>
        )}
        {currentRoute === 'inventory' && (
          <ErrorBoundary moduleName="Inventory & Stock Tracking">
            <InventoryScreen />
          </ErrorBoundary>
        )}
        {currentRoute === 'shift' && (
          <ErrorBoundary moduleName="Cash Drawer & Shift Management">
            <RbacGuard
              module="shift"
              allowedRoles={['manager', 'admin']}
              hideMode="denied-card"
              onRedirectToPos={() => setCurrentRoute('pos')}
            >
              <ShiftScreen />
            </RbacGuard>
          </ErrorBoundary>
        )}
        {currentRoute === 'customers' && (
          <ErrorBoundary moduleName="Customer Loyalty & CRM">
            <CustomersScreen />
          </ErrorBoundary>
        )}
        {currentRoute === 'audit' && (
          <ErrorBoundary moduleName="Security & Audit Trail">
            <RbacGuard
              module="audit"
              allowedRoles={['manager', 'admin']}
              hideMode="denied-card"
              onRedirectToPos={() => setCurrentRoute('pos')}
            >
              <AuditScreen />
            </RbacGuard>
          </ErrorBoundary>
        )}
        {currentRoute === 'settings' && (
          <ErrorBoundary moduleName="System & Hardware Settings">
            <RbacGuard
              module="settings"
              allowedRoles={['manager', 'admin']}
              hideMode="denied-card"
              onRedirectToPos={() => setCurrentRoute('pos')}
            >
              <SettingsScreen />
            </RbacGuard>
          </ErrorBoundary>
        )}
      </AppShell>

      {/* Global Application Keyboard Shortcuts Modal Overlay (F9) */}
      <ShortcutsOverlay
        isOpen={isShortcutsOverlayOpen}
        onClose={() => setIsShortcutsOverlayOpen(false)}
        onNavigate={(route) => {
          setCurrentRoute(route);
          setIsShortcutsOverlayOpen(false);
        }}
      />

      {/* Hidden Developer HUD Overlay for Real-Time FPS, DB Latency & Memory (Ctrl+Shift+D) */}
      <DevPerformanceOverlay />
      </>
    </Suspense>
  );
};

export default function App() {
  // Owner console is a separate auth boundary; POS staff authentication remains unchanged.
  if (typeof window !== 'undefined' && (window.location.pathname === '/owner' || window.location.pathname.startsWith('/owner/'))) {
    return <OwnerPortal />;
  }

  const isCustomerDisplayMode =
    typeof window !== 'undefined' &&
    (window.location.search.includes('mode=customer_display') ||
      window.location.search.includes('display=customer') ||
      window.location.hash.includes('customer-display'));

  const isReceiptValidationMode =
    typeof window !== 'undefined' &&
    (window.location.search.includes('validate_receipt=true') ||
      window.location.search.includes('receipt=') ||
      window.location.hash.includes('validate-receipt'));

  if (isReceiptValidationMode) {
    return (
      <GlobalErrorRecoveryProvider>
        <ErrorBoundary isGlobal moduleName="PRODX Receipt Validation Portal">
          <ThemeProvider>
            <LanguageProvider>
              <ReceiptValidationPortal />
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </GlobalErrorRecoveryProvider>
    );
  }

  if (isCustomerDisplayMode) {
    return (
      <GlobalErrorRecoveryProvider>
        <ErrorBoundary isGlobal moduleName="PRODX Customer-Facing Display">
          <ThemeProvider>
            <LanguageProvider>
              <CustomerDisplayView />
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </GlobalErrorRecoveryProvider>
    );
  }

  return (
    <GlobalErrorRecoveryProvider>
      <ErrorBoundary isGlobal moduleName="PRODX POS Core Engine">
        <SettingsProvider>
          <ThemeProvider>
            <LanguageProvider>
              <SoundProvider>
                <HapticProvider>
                  <ToastProvider>
                    <AuthProvider>
                      <OfflineProvider>
                        <ShiftProvider>
                          <CartProvider>
                            <ReceiptPrinterProvider>
                              <VisualInspectorProvider>
                                <BreadcrumbProvider>
                                  <MainApplication />
                                </BreadcrumbProvider>
                              </VisualInspectorProvider>
                            </ReceiptPrinterProvider>
                          </CartProvider>
                        </ShiftProvider>
                      </OfflineProvider>
                    </AuthProvider>
                  </ToastProvider>
                </HapticProvider>
              </SoundProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SettingsProvider>
      </ErrorBoundary>
    </GlobalErrorRecoveryProvider>
  );
}

