'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service Workers not supported');
      return;
    }

    const CONTROL_RELOAD_KEY = 'sw-control-reload-once';

    const attachWorkerDebug = (worker: ServiceWorker | null, label: string) => {
      if (!worker) return;

      console.log(`[SW] ${label} worker detected`, {
        scriptURL: worker.scriptURL,
        state: worker.state,
      });

      worker.addEventListener('statechange', () => {
        console.log(`[SW] ${label} worker state changed:`, worker.state);
      });

      worker.addEventListener('error', (event) => {
        console.error(`[SW] ${label} worker error:`, event);
      });
    };

    const ensurePageIsControlled = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (!reg.active) return;

        if (navigator.serviceWorker.controller) {
          sessionStorage.removeItem(CONTROL_RELOAD_KEY);
          return;
        }

        if (sessionStorage.getItem(CONTROL_RELOAD_KEY) === '1') {
          console.warn('[SW] Page is still uncontrolled after one recovery reload');
          return;
        }

        sessionStorage.setItem(CONTROL_RELOAD_KEY, '1');
        console.log('[SW] Active worker exists but page is uncontrolled, reloading once...');
        window.location.reload();
      } catch (err) {
        console.warn('[SW] Failed to verify controller state:', err);
      }
    };

    // Register SW
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW] Registered successfully', reg);
        attachWorkerDebug(reg.installing, 'installing');
        attachWorkerDebug(reg.waiting, 'waiting');
        attachWorkerDebug(reg.active, 'active');
        reg.addEventListener('updatefound', () => {
          console.log('[SW] updatefound fired');
          const newWorker = reg.installing;
          attachWorkerDebug(newWorker, 'installing');
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available');
            }
            if (newWorker.state === 'redundant') {
              console.warn('[SW] Installing worker became redundant');
            }
          });
        });
        void ensurePageIsControlled();
      })
      .catch((err) => {
        console.error('[SW] Registration failed:', err);
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      sessionStorage.removeItem(CONTROL_RELOAD_KEY);
      console.log('[SW] Controller changed, reloading...');
      window.location.reload();
    });

    // Handle messages from Service Worker
    const handleMessage = async (event: MessageEvent) => {
      // SW needs a fresh auth token — fetch it and reply via the port
      if (event.data?.type === 'REQUEST_AUTH_TOKEN') {
        const port = event.ports[0];
        if (!port) return;
        try {
          const res = await fetch('/api/auth/token');
          if (res.ok) {
            const { token } = await res.json();
            port.postMessage({ token });
          } else {
            port.postMessage({ token: null, error: 'Failed to fetch token' });
          }
        } catch {
          port.postMessage({ token: null, error: 'Network error' });
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  return null;
}
