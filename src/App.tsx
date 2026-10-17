/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { AdminLoginScreen } from './modules/admin/AdminLoginScreen';
import { AdminConfigDashboard } from './modules/admin/AdminConfigDashboard';
import { AdminConsoleLayout, AdminConsoleSection } from './modules/admin/AdminConsoleLayout';
import { PosScreen } from './modules/pos/PosScreen';
import { DashboardScreen } from './modules/dashboard/DashboardScreen';
import { OrdersScreen } from './modules/orders/OrdersScreen';
import { InventoryScreen } from './modules/inventory/InventoryScreen';
import { ShiftScreen } from './modules/shift/ShiftScreen';
import { CustomersScreen } from './modules/customers/CustomersScreen';
import { AuditScreen } from './modules/audit/AuditScreen';
import { SettingsScreen } from './modules/settings/SettingsScreen';
import { KitchenDisplayScreen } from './modules/kds/KitchenDisplayScreen';
import { ReceiptValidationPortal } from './components/receipt/ReceiptValidationPortal';
import { ShortcutsOverlay } from './components/common/ShortcutsOverlay';
import { DevPerformanceOverlay } from './components/dev/DevPerformanceOverlay';
import { RbacGuard } from './components/auth/RbacGuard';
import { InfrastructureDashboard } from './components/admin/InfrastructureDashboard';
import { FrontendAssistant } from './components/ai/FrontendAssistant';

const checkIsAdminPath = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.pathname.startsWith('/admin') ||
    window.location.hash.startsWith('#admin') ||
    window.location.search.includes('mode=admin')
  );
};

const checkIsDedicatedAdminLoginPath = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.pathname.startsWith('/admin/login') ||
    window.location.hash.startsWith('#admin-login') ||
    window.location.search.includes('mode=admin-login')
  );
};

const MainApplication: React.FC = () => {
  const { session } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<NavRoute>('pos');
  const [isShortcutsOverlayOpen, setIsShortcutsOverlayOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(checkIsAdminPath);
  const [isAdminLoginRoute, setIsAdminLoginRoute] = useState<boolean>(
    checkIsDedicatedAdminLoginPath,
  );
  const [adminSection, setAdminSection] = useState<AdminConsoleSection>('overview');

  useEffect(() => {
    const syncAdminMode = () => {
      setIsAdminMode(checkIsAdminPath());
      setIsAdminLoginRoute(checkIsDedicatedAdminLoginPath());
    };
    window.addEventListener('popstate', syncAdminMode);
    window.addEventListener('hashchange', syncAdminMode);
    return () => {
      window.removeEventListener('popstate', syncAdminMode);
      window.removeEventListener('hashchange', syncAdminMode);
    };
  }, []);

  const enterAdminLogin = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/admin/login');
    }
    setIsAdminLoginRoute(true);
    setIsAdminMode(true);
  };

  const exitAdminMode = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
    setIsAdminLoginRoute(false);
    setIsAdminMode(false);
  };

  // Register operational keyboard shortcuts (F1 = POS, F2 = Dashboard, F9 = Shortcuts Overlay, etc.)
  useEffect(() => {
    if (isAdminMode) return;
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
      } else if (e.key === 'F10') {
        e.preventDefault();
        setCurrentRoute('kds');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminMode]);

  if (isAdminMode || isAdminLoginRoute) {
    // If explicitly on /admin/login and not authenticated as admin yet, show the dedicated AdminLoginScreen
    if (isAdminLoginRoute && (!session || session.currentUser.role !== 'admin')) {
      return (
        <ErrorBoundary moduleName="Administrator Login">
          <AdminLoginScreen
            onBackToPos={exitAdminMode}
            onLoginSuccess={() => {
              setIsAdminLoginRoute(false);
              setIsAdminMode(true);
            }}
          />
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary moduleName="Administrator Console">
        <AdminConsoleLayout
          activeSection={adminSection}
          onSelectSection={setAdminSection}
          onExitAdminMode={exitAdminMode}
        >
          {adminSection === 'rbac' ? (
            <SettingsScreen />
          ) : adminSection === 'audit' ? (
            <AuditScreen />
          ) : adminSection === 'infrastructure' ? (
            <InfrastructureDashboard />
          ) : (
            <AdminConfigDashboard activeSection={adminSection} />
          )}
        </AdminConsoleLayout>
      </ErrorBoundary>
    );
  }

  if (!session) {
    return (
      <ErrorBoundary moduleName="Authentication Terminal">
        <LoginScreen onOpenAdminLogin={enterAdminLogin} />
      </ErrorBoundary>
    );
  }

  return (
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
        {currentRoute === 'kds' && (
          <ErrorBoundary moduleName="Kitchen Display System (KDS)">
            <KitchenDisplayScreen />
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
        {currentRoute === 'infrastructure' && (
          <ErrorBoundary moduleName="Antigravity AI & Plug & Play Infrastructure">
            <RbacGuard
              module="settings"
              allowedRoles={['manager', 'admin']}
              hideMode="denied-card"
              onRedirectToPos={() => setCurrentRoute('pos')}
            >
              <InfrastructureDashboard />
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

      {/* Gemini AI Front-End Assistant Widget */}
      <FrontendAssistant />
    </>
  );
};

export default function App() {
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

  const isKdsMode =
    typeof window !== 'undefined' &&
    (window.location.search.includes('mode=kds') ||
      window.location.search.includes('display=kds') ||
      window.location.hash.includes('kds'));

  if (isKdsMode) {
    return (
      <GlobalErrorRecoveryProvider>
        <ErrorBoundary isGlobal moduleName="PRODX Kitchen Display System (KDS)">
          <AuthProvider>
            <ThemeProvider>
              <LanguageProvider>
                <KitchenDisplayScreen />
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </ErrorBoundary>
      </GlobalErrorRecoveryProvider>
    );
  }

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

