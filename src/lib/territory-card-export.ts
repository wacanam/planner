import { toCanvas, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

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
  // Ensure all Google tile images have crossOrigin set to anonymous and wait for them to load
  const images = Array.from(mapContainer.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (
        !img.crossOrigin &&
        img.src &&
        (img.src.includes('google') ||
          img.src.includes('khms') ||
          img.src.includes('gstatic') ||
          img.src.includes('googleapis'))
      ) {
        img.crossOrigin = 'anonymous';
      }
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 400);
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
          node.classList.contains('gmnoprint')
        ) {
          return false;
        }
      }
      return true;
    },
  });

  const containerW = mapContainer.clientWidth || window.innerWidth;
  const scale = fullCanvas.width / containerW;

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = Math.max(1, Math.round(frameW * scale));
  croppedCanvas.height = Math.max(1, Math.round(frameH * scale));
  const ctx = croppedCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D rendering context for snapshot');

  ctx.drawImage(
    fullCanvas,
    Math.round(frameX * scale),
    Math.round(frameY * scale),
    Math.round(frameW * scale),
    Math.round(frameH * scale),
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
  const {
    frontElement,
    backElement,
    filename,
    widthInches,
    heightInches,
    orientation,
    side,
  } = options;

  const effectiveW = widthInches;
  const effectiveH = heightInches;
  const effectiveOrientation = orientation || (widthInches >= heightInches ? 'landscape' : 'portrait');

  const doc = new jsPDF({
    orientation: effectiveOrientation,
    unit: 'in',
    format: [effectiveW, effectiveH],
  });

  const addPageFromElement = async (el: HTMLElement, isFirstPage: boolean) => {
    const dataUrl = await toPng(el, {
      quality: 0.98,
      pixelRatio: 2.5,
      cacheBust: true,
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
