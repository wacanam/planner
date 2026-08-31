import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ensureWebGLDrawingBufferPreserved } from '../webgl-preserve';
import {
  captureMapViewportSnapshot,
  exportCardToPdf,
  exportElementToPng,
} from '../territory-card-export';

const mockSave = vi.fn();
const mockAddPage = vi.fn();
const mockAddImage = vi.fn();
const mockClick = vi.fn();
const mockDrawImage = vi.fn();

beforeAll(() => {
  class MockCanvas {
    width = 300;
    height = 150;
    style: Record<string, any> = {};
    toDataURL(_type?: string, _quality?: number) {
      return 'data:image/png;base64,mockCanvasData';
    }
  }

  (MockCanvas.prototype as any).getContext = function (contextId: string, options?: any) {
    if (contextId === '2d') {
      return {
        drawImage: mockDrawImage,
        fillRect: vi.fn(),
        fillStyle: '',
      };
    }
    return { contextId, options };
  };

  class MockAnchor {
    download = '';
    href = '';
    click = mockClick;
  }
  (MockAnchor.prototype as any).click = mockClick;

  class MockElement {
    tagName = 'DIV';
    id = '';
    classList = {
      contains: vi.fn(() => false),
    };
    style = {};
    clientWidth = 1000;
    clientHeight = 600;
    querySelectorAll(_sel: string) {
      return [];
    }
    querySelector(_sel: string) {
      return null;
    }
    getBoundingClientRect() {
      return { width: 1000, height: 600, top: 0, left: 0, right: 1000, bottom: 600 };
    }
    getAttribute(_name: string) {
      return null;
    }
  }

  (globalThis as any).HTMLCanvasElement = MockCanvas;
  (globalThis as any).HTMLAnchorElement = MockAnchor;
  (globalThis as any).HTMLElement = MockElement;

  (globalThis as any).document = {
    createElement(tagName: string) {
      if (tagName.toLowerCase() === 'canvas') return new MockCanvas();
      if (tagName.toLowerCase() === 'a') return new MockAnchor();
      return new MockElement();
    },
  };

  (globalThis as any).window = globalThis;
});

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toCanvas: vi.fn(async (_node, options) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000 * (options?.pixelRatio || 1);
    canvas.height = 600 * (options?.pixelRatio || 1);
    return canvas;
  }),
  toPng: vi.fn(async () => 'data:image/png;base64,mockPngDataUrl'),
}));

// Mock jsPDF class
vi.mock('jspdf', () => {
  return {
    jsPDF: class MockJsPDF {
      save = mockSave;
      addPage = mockAddPage;
      addImage = mockAddImage;
    },
  };
});

describe('WebGL Drawing Buffer Preservation', () => {
  it('patches HTMLCanvasElement.prototype.getContext to set preserveDrawingBuffer on WebGL contexts', () => {
    (globalThis as any).__WEBGL_PRESERVE_BUFFER_PATCHED__ = false;

    ensureWebGLDrawingBufferPreserved();

    const canvas = document.createElement('canvas');
    const webglCtx: any = canvas.getContext('webgl' as any, { antialias: true });
    expect(webglCtx?.options?.preserveDrawingBuffer).toBe(true);
    expect(webglCtx?.options?.antialias).toBe(true);

    const webgl2Ctx: any = canvas.getContext('webgl2' as any);
    expect(webgl2Ctx?.options?.preserveDrawingBuffer).toBe(true);

    const experimentalCtx: any = canvas.getContext('experimental-webgl' as any);
    expect(experimentalCtx?.options?.preserveDrawingBuffer).toBe(true);

    const ctx2d: any = canvas.getContext('2d');
    expect(typeof ctx2d?.drawImage).toBe('function');
  });
});

describe('Territory Card Export Utilities', () => {
  it('captureMapViewportSnapshot extracts a scaled cropped snapshot from the map container', async () => {
    const container = document.createElement('div');
    mockDrawImage.mockClear();

    const snapshot = await captureMapViewportSnapshot({
      mapContainer: container as any,
      frameX: 100,
      frameY: 100,
      frameW: 400,
      frameH: 300,
    });

    expect(typeof snapshot).toBe('string');
    expect(snapshot.startsWith('data:image/png')).toBe(true);
    expect(mockDrawImage).toHaveBeenCalled();
  });

  it('exportElementToPng invokes toPng and triggers anchor download', async () => {
    const el = document.createElement('div');
    mockClick.mockClear();

    await exportElementToPng(el as any, 'Territory-01-Front.png');

    expect(mockClick).toHaveBeenCalled();
  });

  it('exportCardToPdf creates multi-page PDF document for front and back sides', async () => {
    const frontEl = document.createElement('div');
    const backEl = document.createElement('div');
    mockAddPage.mockClear();
    mockSave.mockClear();

    await exportCardToPdf({
      frontElement: frontEl as any,
      backElement: backEl as any,
      filename: 'Territory-01-PrintCard.pdf',
      widthInches: 4,
      heightInches: 6,
      orientation: 'portrait',
      side: 'both',
    });

    expect(mockAddImage).toHaveBeenCalled();
    expect(mockAddPage).toHaveBeenCalledWith([4, 6], 'portrait');
    expect(mockSave).toHaveBeenCalledWith('Territory-01-PrintCard.pdf');
  });

  it('exportCardToPdf exports single side without extra page', async () => {
    mockAddPage.mockClear();
    mockSave.mockClear();

    const frontEl = document.createElement('div');

    await exportCardToPdf({
      frontElement: frontEl as any,
      filename: 'Territory-01-FrontOnly.pdf',
      widthInches: 5,
      heightInches: 7,
      orientation: 'landscape',
      side: 'front',
    });

    expect(mockAddPage).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith('Territory-01-FrontOnly.pdf');
  });
});
