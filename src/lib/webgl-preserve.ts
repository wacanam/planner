// src/lib/webgl-preserve.ts
'use client';

/**
 * Monkey-patches HTMLCanvasElement.prototype.getContext to enforce `preserveDrawingBuffer: true`
 * on WebGL / WebGL2 contexts.
 *
 * This ensures that Google Maps JavaScript API (which uses WebGL for vector, street, satellite,
 * and hybrid rendering) preserves its back-buffer after compositing, allowing `toCanvas()`,
 * `toDataURL()`, and `html-to-image` to capture the basemap layer without returning a blank/transparent canvas.
 */
export function ensureWebGLDrawingBufferPreserved(): void {
  if (typeof window === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    return;
  }

  const g = window as unknown as { __WEBGL_PRESERVE_BUFFER_PATCHED__?: boolean };
  if (g.__WEBGL_PRESERVE_BUFFER_PATCHED__) {
    return;
  }

  g.__WEBGL_PRESERVE_BUFFER_PATCHED__ = true;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    options?: any
  ) {
    if (
      contextId === 'webgl' ||
      contextId === 'webgl2' ||
      contextId === 'experimental-webgl'
    ) {
      options = {
        ...(options || {}),
        preserveDrawingBuffer: true,
      };
    }
    return originalGetContext.call(this, contextId, options);
  } as typeof HTMLCanvasElement.prototype.getContext;
}

// Automatically invoke on client load
ensureWebGLDrawingBufferPreserved();
