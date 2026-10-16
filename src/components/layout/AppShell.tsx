import React, { useState, useEffect } from 'react';
import { TopNav } from './TopNav';
import { Sidebar, NavRoute } from './Sidebar';
import { StatusBar } from './StatusBar';
import { OfflineBanner } from './OfflineBanner';
import { BackgroundLayer } from './BackgroundLayer';
import { ToastContainer } from '../common/ToastContainer';
import { Drawer } from '../common/Drawer';
import { HoldOrdersModal } from '../../modules/pos/HoldOrdersModal';
import { CommandPalette } from '../common/CommandPalette';
import { LockScreenModal } from '../auth/LockScreenModal';
import { GlobalBreadcrumb } from './GlobalBreadcrumb';
import { SyncActivityPanel } from '../sync/SyncActivityPanel';
import { useOffline } from '../../context/OfflineContext';

export interface AppShellProps {
  currentRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onNavigate,
  children,
}) => {
  const { isSyncActivityOpen, closeSyncActivity, toggleSyncActivity } = useOffline();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global accelerators: Ctrl+K / Cmd+K (Palette) and Alt+S / Ctrl+Shift+S (Sync Activity)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (
        (e.altKey && (e.key === 's' || e.key === 'S')) ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S'))
      ) {
        e.preventDefault();
        toggleSyncActivity();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSyncActivity]);

  return (
    <div className="relative flex h-[100dvh] w-screen overflow-hidden bg-background text-text font-sans select-none">
      {/* High-Tech Enterprise Persistent Background Mesh */}
      <BackgroundLayer />

      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block h-full shrink-0 relative z-10 w-[280px] border-r border-border bg-card">
        <Sidebar currentRoute={currentRoute} onNavigate={onNavigate} />
      </div>

      {/* Mobile Drawer Navigation */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title="PRODX POS Navigation"
        side="left"
        width="w-[280px]"
        noPadding={true}
      >
        <div className="h-full flex flex-col overflow-y-auto no-scrollbar w-full">
          <Sidebar
            currentRoute={currentRoute}
            onNavigate={onNavigate}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />
        </div>
      </Drawer>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        {/* Top Navigation */}
        <TopNav
          currentRoute={currentRoute}
          onNavigate={onNavigate}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenHoldModal={() => setIsHoldModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Global Navigation Breadcrumb Bar */}
        <GlobalBreadcrumb currentRoute={currentRoute} onNavigate={onNavigate} />

        {/* Offline & Outbox Notice Banner */}
        <OfflineBanner />

        {/* Dynamic Route Content */}
        <main className="flex-1 min-h-0 relative flex flex-col min-w-0 overflow-hidden w-full max-w-full">
          {children}
        </main>

        {/* Bottom Diagnostics Bar */}
        <StatusBar />
      </div>

      {/* Global Command Palette (Ctrl+K / ⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        onOpenHoldModal={() => setIsHoldModalOpen(true)}
      />

      {/* Held Orders Modal */}
      <HoldOrdersModal
        isOpen={isHoldModalOpen}
        onClose={() => setIsHoldModalOpen(false)}
      />

      {/* Secure Lock Screen / Screensaver Modal */}
      <LockScreenModal />

      {/* Real-time Sync Activity Panel (Local POS Cache <-> Cloud DB) */}
      <SyncActivityPanel
        isOpen={isSyncActivityOpen}
        onClose={closeSyncActivity}
      />

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};
