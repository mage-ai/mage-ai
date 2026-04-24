import { toPng } from 'html-to-image';
import type { CanvasRef } from 'reaflow';

const CAPTURE_DELAY_MS = 500;
const PIXEL_RATIO = 2;
const BACKGROUND_COLOR = '#1B1B1B';
const ZOOM_CONTROLS_CLASS = 'zoom-controls';

interface ExportOptions {
  canvasRef: { current?: CanvasRef };
  graphContainerRef: { current?: HTMLDivElement };
  filename?: string;
}

type SavedStyle = {
  el: HTMLElement;
  color: string;
  backgroundColor: string;
  webkitTextFillColor: string;
};

function inlineComputedStyles(root: HTMLElement): SavedStyle[] {
  const saved: SavedStyle[] = [];

  root.querySelectorAll('*').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;

    const computed = window.getComputedStyle(el);
    saved.push({
      el,
      color: el.style.color,
      backgroundColor: el.style.backgroundColor,
      webkitTextFillColor: el.style.getPropertyValue('-webkit-text-fill-color'),
    });

    // CSS inheritance breaks at SVG foreignObject boundaries, causing
    // html-to-image to resolve text/background colors to defaults (black).
    // -webkit-text-fill-color also overrides `color` in Blink, so both
    // must be set explicitly.
    el.style.setProperty('color', computed.color, 'important');
    el.style.setProperty('-webkit-text-fill-color', computed.color, 'important');
    el.style.setProperty('background-color', computed.backgroundColor, 'important');
  });

  return saved;
}

function restoreInlinedStyles(saved: SavedStyle[]): void {
  saved.forEach(({ el, color, backgroundColor, webkitTextFillColor }) => {
    el.style.color = color;
    el.style.backgroundColor = backgroundColor;
    el.style.setProperty('-webkit-text-fill-color', webkitTextFillColor);
  });
}

function embedStyleSheets(target: HTMLElement): HTMLStyleElement[] {
  const clones: HTMLStyleElement[] = [];

  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const cssText = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
      const style = document.createElement('style');
      style.textContent = cssText;
      target.appendChild(style);
      clones.push(style);
    } catch (_) {
      // Cross-origin sheets throw SecurityError — safe to skip
    }
  });

  return clones;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function exportDependencyGraph({
  canvasRef,
  graphContainerRef,
  filename = 'dependency_tree',
}: ExportOptions): Promise<void> {
  const node = graphContainerRef.current;
  if (!node) return;

  canvasRef.current?.fitCanvas?.();
  await delay(CAPTURE_DELAY_MS);

  const reaflowContainer = (canvasRef.current as any)?.containerRef?.current;
  if (!reaflowContainer) return;

  const scrollLeft = reaflowContainer.scrollLeft;
  const scrollTop = reaflowContainer.scrollTop;
  const viewWidth = reaflowContainer.clientWidth;
  const viewHeight = reaflowContainer.clientHeight;

  const innerContent = reaflowContainer.firstElementChild as HTMLElement;
  const savedTransform = innerContent?.style?.transform || '';
  const savedOverflow = reaflowContainer.style.overflow;

  if (innerContent) {
    innerContent.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
  }
  reaflowContainer.style.overflow = 'hidden';
  reaflowContainer.scrollLeft = 0;
  reaflowContainer.scrollTop = 0;

  const savedStyles = inlineComputedStyles(node);
  const embeddedSheets = embedStyleSheets(node);

  const restore = () => {
    embeddedSheets.forEach((el) => el.remove());
    restoreInlinedStyles(savedStyles);
    if (innerContent) innerContent.style.transform = savedTransform;
    reaflowContainer.style.overflow = savedOverflow;
    reaflowContainer.scrollLeft = scrollLeft;
    reaflowContainer.scrollTop = scrollTop;
  };

  try {
    const dataUrl = await toPng(node, {
      backgroundColor: BACKGROUND_COLOR,
      width: viewWidth,
      height: viewHeight,
      pixelRatio: PIXEL_RATIO,
      filter: (el: Element) => !el?.classList?.contains?.(ZOOM_CONTROLS_CLASS),
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } finally {
    restore();
  }
}
