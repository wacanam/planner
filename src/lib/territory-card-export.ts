import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export async function exportElementToPng(element: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(element, {
    quality: 0.98,
    pixelRatio: 2.5, // Crisp high-DPI output
    cacheBust: true,
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

  const isLandscape = orientation === 'landscape';
  const effectiveW = isLandscape ? Math.max(widthInches, heightInches) : Math.min(widthInches, heightInches);
  const effectiveH = isLandscape ? Math.min(widthInches, heightInches) : Math.max(widthInches, heightInches);

  const doc = new jsPDF({
    orientation,
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
      doc.addPage([effectiveW, effectiveH], orientation);
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
