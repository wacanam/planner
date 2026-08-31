import { toCanvas, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { ensureWebGLDrawingBufferPreserved } from './webgl-preserve';

// Ensure WebGL drawing buffers are preserved on client
ensureWebGLDrawingBufferPreserved();

export async function captureMapViewportSnapshot({
  mapContainer,
  frameX,
  frameY,
  frameW,
  frameH,
}: {
  mapContainer: HTMLElement;
  frameX: number;
  frameY: number;
  frameW: number;
  frameH: number;
}): Promise<string> {
  // Wait for all Google map tile / overlay images to load
  const images = Array.from(mapContainer.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 300);
      });
    })
  );

  const fullCanvas = await toCanvas(mapContainer, {
    pixelRatio: 2.0, // High quality 2x resolution
    cacheBust: false, // Critical: true breaks signed satellite/hybrid tile URLs
    skipFonts: true,
    filter: (node) => {
      if (node instanceof HTMLElement) {
        if (
          node.id === 'studio-print-viewport-overlay' ||
          node.classList.contains('no-capture') ||
          node.classList.contains('studio-print-overlay') ||
          node.classList.contains('gm-control-active') ||
          node.classList.contains('gmnoprint') ||
          node.classList.contains('gm-style-cc') ||
          node.classList.contains('gm-bundled-control') ||
          node.getAttribute('aria-label')?.includes('Google') ||
          node.getAttribute('title')?.includes('Google')
        ) {
          return false;
        }
      }
      return true;
    },
  });

  const containerRect = mapContainer.getBoundingClientRect();
  const containerW = containerRect.width || mapContainer.clientWidth || window.innerWidth;
  const containerH = containerRect.height || mapContainer.clientHeight || window.innerHeight;
  const scaleX = fullCanvas.width / containerW;
  const scaleY = fullCanvas.height / containerH;

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = Math.max(1, Math.round(frameW * scaleX));
  croppedCanvas.height = Math.max(1, Math.round(frameH * scaleY));
  const ctx = croppedCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D rendering context for snapshot');

  ctx.drawImage(
    fullCanvas,
    Math.round(frameX * scaleX),
    Math.round(frameY * scaleY),
    Math.round(frameW * scaleX),
    Math.round(frameH * scaleY),
    0,
    0,
    croppedCanvas.width,
    croppedCanvas.height
  );

  return croppedCanvas.toDataURL('image/png', 0.98);
}

export async function exportElementToPng(element: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(element, {
    quality: 0.98,
    pixelRatio: 2.0,
    cacheBust: false,
    skipFonts: true,
  });
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

export interface ExportPdfOptions {
  frontElement?: HTMLElement | null;
  backElement?: HTMLElement | null;
  filename: string;
  widthInches: number;
  heightInches: number;
  orientation: 'portrait' | 'landscape';
  side: 'front' | 'back' | 'both';
}

export async function exportCardToPdf(options: ExportPdfOptions): Promise<void> {
  const { frontElement, backElement, filename, widthInches, heightInches, orientation, side } =
    options;

  const effectiveW = widthInches;
  const effectiveH = heightInches;
  const effectiveOrientation =
    orientation || (widthInches >= heightInches ? 'landscape' : 'portrait');

  const doc = new jsPDF({
    orientation: effectiveOrientation,
    unit: 'in',
    format: [effectiveW, effectiveH],
  });

  const addPageFromElement = async (el: HTMLElement, isFirstPage: boolean) => {
    const dataUrl = await toPng(el, {
      quality: 0.98,
      pixelRatio: 2.5,
      cacheBust: false,
      skipFonts: true,
    });
    if (!isFirstPage) {
      doc.addPage([effectiveW, effectiveH], effectiveOrientation);
    }
    doc.addImage(dataUrl, 'PNG', 0, 0, effectiveW, effectiveH, undefined, 'FAST');
  };

  if (side === 'front' && frontElement) {
    await addPageFromElement(frontElement, true);
  } else if (side === 'back' && backElement) {
    await addPageFromElement(backElement, true);
  } else if (side === 'both') {
    let hasFirst = false;
    if (frontElement) {
      await addPageFromElement(frontElement, true);
      hasFirst = true;
    }
    if (backElement) {
      await addPageFromElement(backElement, !hasFirst);
    }
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

