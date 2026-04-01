'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            background: '#fff',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              fontSize: 28,
            }}
          >
            ⚠️
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: '#111' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: 24, maxWidth: 360 }}>
            {error.message || 'A critical error occurred. Please refresh the page.'}
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: '0.75rem',
                color: '#999',
                marginBottom: 16,
                fontFamily: 'monospace',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
