import { CanvasRef } from 'reaflow';

import { openSaveFileDialog } from '@components/PipelineDetail/utils';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PIXEL_RATIO = 2;

type ExportGraphOptions = {
  backgroundColor?: string;
  canvasRef?: { current?: CanvasRef };
  fileNamePrefix?: string;
};

// The dependency graph renders block nodes as styled-components HTML inside SVG
// <foreignObject> elements. Those styles live in <style> tags in the document
// head and do not exist inside an isolated, rasterized SVG, so we embed the
// document's CSS rules into the exported SVG to keep the nodes styled.
function collectDocumentCss(): string {
  const parts: string[] = [];

  Array.from(document.styleSheets).forEach((sheet) => {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch (err) {
      // Cross-origin stylesheets throw on cssRules access; skip them.
      return;
    }
    if (!rules) {
      return;
    }
    Array.from(rules).forEach((rule) => parts.push(rule.cssText));
  });

  return parts.join('\n');
}

function rasterize(
  svgDataUrl: string,
  width: number,
  height: number,
  backgroundColor?: string,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * PIXEL_RATIO;
      canvas.height = height * PIXEL_RATIO;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(image, 0, 0, width, height);

      canvas.toBlob((blob) => resolve(blob), 'image/png');
    };
    image.onerror = () => resolve(null);
    image.src = svgDataUrl;
  });
}

export async function exportGraphAsImage({
  backgroundColor,
  canvasRef,
  fileNamePrefix,
}: ExportGraphOptions): Promise<void> {
  const svg = canvasRef?.current?.svgRef?.current as SVGSVGElement | undefined;
  const layout = canvasRef?.current?.layout as
    | { height?: number; width?: number; x?: number; y?: number }
    | undefined;

  const width = Math.ceil(layout?.width || 0);
  const height = Math.ceil(layout?.height || 0);

  if (!svg || width <= 0 || height <= 0) {
    return;
  }

  try {
    // Operate on a clone so the live graph is never mutated (no flicker, no
    // restore needed).
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', SVG_NS);
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Neutralize reaflow's pan/zoom (framer-motion transform on the inner <g>)
    // so the export is the full tree at 1:1. Account for a non-zero ELK origin.
    const group = clone.querySelector('g');
    if (group) {
      const offsetX = -(layout?.x || 0);
      const offsetY = -(layout?.y || 0);
      group.removeAttribute('transform');
      group.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
    }

    const styleEl = document.createElementNS(SVG_NS, 'style');
    styleEl.textContent = collectDocumentCss();
    clone.insertBefore(styleEl, clone.firstChild);

    const xml = new XMLSerializer().serializeToString(clone);
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

    const blob = await rasterize(svgDataUrl, width, height, backgroundColor);
    if (blob) {
      openSaveFileDialog(blob, `${fileNamePrefix || 'pipeline'}_dependency_graph.png`);
    }
  } catch (error) {
    // Matches existing client-side download helpers: no error UI. The live DOM
    // is never touched, so a failed capture is non-destructive.
    // eslint-disable-next-line no-console
    console.error('Failed to export dependency graph image:', error);
  }
}
