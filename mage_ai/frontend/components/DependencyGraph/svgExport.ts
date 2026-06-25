import { UNIT } from '@oracle/styles/units/spacing';

const SVG_EXPORT_PADDING = UNIT * 4;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const SVG_EXPORT_BOUND_SELECTORS = [
  'foreignObject',
  'path',
  'line',
  'polyline',
  'polygon',
  'rect',
  'circle',
  'ellipse',
  'text',
  'use',
  'image',
].join(', ');

type SvgExportBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

function buildInlineStyleValue(sourceElement: Element): string {
  const computedStyles = window.getComputedStyle(sourceElement);

  return Array.from(computedStyles).map((propertyName) => {
    const propertyValue = computedStyles.getPropertyValue(propertyName);
    const priority = computedStyles.getPropertyPriority(propertyName);

    return `${propertyName}:${propertyValue}${priority ? ' !important' : ''};`;
  }).join('');
}

function cloneNodeForSvgExport(sourceNode: Node, ownerDocument: XMLDocument): Node {
  if (sourceNode.nodeType === 3) {
    return ownerDocument.createTextNode(sourceNode.textContent || '');
  }

  if (sourceNode.nodeType !== 1) {
    return ownerDocument.createTextNode('');
  }

  const sourceElement = sourceNode as Element;
  const namespaceURI = sourceElement.namespaceURI || SVG_NAMESPACE;
  const targetElement = ownerDocument.createElementNS(
    namespaceURI,
    sourceElement.localName,
  );

  Array.from(sourceElement.attributes).forEach((attribute) => {
    if (attribute.namespaceURI) {
      targetElement.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
    } else {
      targetElement.setAttribute(attribute.name, attribute.value);
    }
  });

  const inlineStyleValue = buildInlineStyleValue(sourceElement);
  if (inlineStyleValue.length >= 1) {
    targetElement.setAttribute('style', inlineStyleValue);
  }

  if (namespaceURI === XHTML_NAMESPACE) {
    targetElement.setAttribute('xmlns', XHTML_NAMESPACE);
  }

  Array.from(sourceNode.childNodes).forEach((childNode) => {
    targetElement.appendChild(cloneNodeForSvgExport(childNode, ownerDocument));
  });

  return targetElement;
}

function calculateSvgExportBounds(svgElement: SVGSVGElement): SvgExportBounds {
  const screenTransform = svgElement.getScreenCTM();

  if (!screenTransform) {
    const bbox = svgElement.getBBox();

    return {
      height: Math.max(bbox?.height || 0, 1),
      width: Math.max(bbox?.width || 0, 1),
      x: bbox?.x || 0,
      y: bbox?.y || 0,
    };
  }

  const inverseTransform = screenTransform.inverse();
  const point = svgElement.createSVGPoint();
  const elements = Array.from(
    svgElement.querySelectorAll(SVG_EXPORT_BOUND_SELECTORS),
  ) as SVGGraphicsElement[];

  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  elements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (!rect || (rect.width <= 0 && rect.height <= 0)) {
      return;
    }

    [
      [rect.left, rect.top],
      [rect.right, rect.top],
      [rect.left, rect.bottom],
      [rect.right, rect.bottom],
    ].forEach(([x, y]) => {
      point.x = x;
      point.y = y;

      const svgPoint = point.matrixTransform(inverseTransform);
      minX = Math.min(minX, svgPoint.x);
      minY = Math.min(minY, svgPoint.y);
      maxX = Math.max(maxX, svgPoint.x);
      maxY = Math.max(maxY, svgPoint.y);
    });
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY)
    || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    const bbox = svgElement.getBBox();

    return {
      height: Math.max(bbox?.height || 0, 1),
      width: Math.max(bbox?.width || 0, 1),
      x: bbox?.x || 0,
      y: bbox?.y || 0,
    };
  }

  return {
    height: Math.max(maxY - minY, 1),
    width: Math.max(maxX - minX, 1),
    x: minX,
    y: minY,
  };
}

/**
 * Serialize the rendered dependency graph SVG into a standalone download.
 * The export preserves `foreignObject` node content and trims the output to
 * the actual rendered graph bounds instead of the editor canvas.
 */
export function buildDependencyGraphSvgBlob(svgElement: SVGSVGElement): Blob {
  const bounds = calculateSvgExportBounds(svgElement);
  const width = Math.ceil(bounds.width);
  const height = Math.ceil(bounds.height);
  const viewBoxX = bounds.x - SVG_EXPORT_PADDING;
  const viewBoxY = bounds.y - SVG_EXPORT_PADDING;
  const exportWidth = width + (SVG_EXPORT_PADDING * 2);
  const exportHeight = height + (SVG_EXPORT_PADDING * 2);

  const svgDocument = document.implementation.createDocument(SVG_NAMESPACE, 'svg', null);
  const clonedSvg = cloneNodeForSvgExport(svgElement, svgDocument) as SVGSVGElement;

  svgDocument.replaceChild(clonedSvg, svgDocument.documentElement);
  clonedSvg.setAttribute('height', `${exportHeight}`);
  clonedSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  clonedSvg.setAttribute('version', '1.1');
  clonedSvg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${exportWidth} ${exportHeight}`);
  clonedSvg.setAttribute('width', `${exportWidth}`);
  clonedSvg.removeAttribute('style');
  clonedSvg.setAttribute('xmlns', SVG_NAMESPACE);
  clonedSvg.setAttribute('xmlns:xhtml', XHTML_NAMESPACE);
  clonedSvg.setAttribute('xmlns:xlink', XLINK_NAMESPACE);

  const markup = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clonedSvg)}`;

  return new Blob([markup], {
    type: 'image/svg+xml;charset=utf-8',
  });
}
