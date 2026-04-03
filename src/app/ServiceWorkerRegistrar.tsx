'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Register SW
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New version available');
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
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
