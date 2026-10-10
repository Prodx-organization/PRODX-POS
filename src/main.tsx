import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App.tsx';
import './index.css';
import './premium-design-system.css';
import { registerSW } from 'virtual:pwa-register';

const AdminPortal = lazy(() =>
  import('./modules/admin/AdminPortal').then(({ AdminPortal }) => ({ default: AdminPortal })),
);

const updateServiceWorker = registerSW({
  immediate: true,
  onRegisteredSW: (swUrl, registration) => {
    if (!registration) return;

    void registration.update();

    const refresh = async () => {
      if (!navigator.onLine || registration.installing) return;

      try {
        const response = await fetch(swUrl, {
          cache: 'no-store',
          headers: { 'cache-control': 'no-cache' },
        });
        if (response.ok) await registration.update();
      } catch {
        // Offline or transient network failure: keep the current service worker.
      }
    };

    void refresh();
  },
});

void updateServiceWorker;

const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute ? (
      <Suspense fallback={<main role="status" className="min-h-screen bg-slate-950 p-8 text-slate-100">Loading administration…</main>}>
        <AdminPortal />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
