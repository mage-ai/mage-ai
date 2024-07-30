import { isObject } from '@utils/hash';
import { DEBUG } from '../../../utils/debug';
import { LayoutConfigType, RectType } from '../../interfaces';
import { LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum } from '../../types';
import { validateFiniteNumber } from '@utils/number';
import { padString } from '@utils/string';

export const GROUP_NODE_PADDING = 16;

export function isDebug() {
  return DEBUG.rects;
}

export function shiftRectsIntoBoundingBox(rects: RectType[], boundingBox: RectType): RectType[] {
  // This function shifts a list of rectangles to fit within a specified bounding box.
  const groupBoundingBox = calculateBoundingBox(rects);

  const offsetX =
    validateFiniteNumber(boundingBox.left) - validateFiniteNumber(groupBoundingBox.left);
  const offsetY =
    validateFiniteNumber(boundingBox.top) - validateFiniteNumber(groupBoundingBox.top);

  return rects.map(rect => ({
    ...rect,
    left: validateFiniteNumber(rect.left) + validateFiniteNumber(offsetX),
    top: validateFiniteNumber(rect.top) + validateFiniteNumber(offsetY),
  }));
}

export function alignRectsInBoundingBox(rects: RectType[], boundingBox: RectType, scaleToFit: boolean = false): RectType[] {
  if (rects.length === 0) {
    return [];
  }

  const groupBoundingBox = calculateBoundingBox(rects);

  let scaleX = 1;
  let scaleY = 1;

  if (scaleToFit) {
    // Calculate scale factors to fit all rects proportionately within the bounding box
    scaleX = boundingBox.width / groupBoundingBox.width;
    scaleY = boundingBox.height / groupBoundingBox.height;
  }

  // Calculate the starting point to maintain rects centrally aligned within the bounding box
  const startX = boundingBox.left + (boundingBox.width - groupBoundingBox.width * scaleX) / 2;
  const startY = boundingBox.top + (boundingBox.height - groupBoundingBox.height * scaleY) / 2;

  // Shift and scale each rect proportionately to fit within the bounding box
  return rects.map(rect => ({
    ...rect,
    left: startX + (rect.left - groupBoundingBox.left) * scaleX,
    top: startY + (rect.top - groupBoundingBox.top) * scaleY,
    width: scaleToFit ? rect.width * scaleX : rect.width,
    height: scaleToFit ? rect.height * scaleY : rect.height,
  }));
}

export function centerRectOnScreen(
  boundingBox: RectType,
  rectBase: RectType,
  rects: RectType[],
): RectType[] {
  if (boundingBox && rectBase) {
    const centerRect = rects.find(rect => rect.id === rectBase.id) ?? rectBase;

    const { left, height, top, width } = centerRect;
    const xcenter = (boundingBox.width - width) / 2;
    const ycenter = (boundingBox.height - height) / 2;

    const xmin = Math.min(...rects.map(rect => rect.left));
    const ymin = Math.min(...rects.map(rect => rect.top));

    let xdistance = xcenter - left;
    let ydistance = ycenter - top;

    if (xmin + xdistance < GROUP_NODE_PADDING) {
      xdistance = GROUP_NODE_PADDING - xmin;
    }
    if (ymin + ydistance < GROUP_NODE_PADDING) {
      ydistance = GROUP_NODE_PADDING - ymin;
    }

    // console.log(
    //   centerRect,
    //   [xcenter, boundingBox.width, width],
    //   [ycenter, boundingBox.height, height],
    //   xmin,
    //   ymin,
    //   [xdistance, xcenter, left],
    //   [ydistance, ycenter, top],
    // )

    return rects.map(rect => ({
      ...rect,
      left: rect.left + xdistance,
      top: rect.top + ydistance,
    }));
  }

  return rects;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfigType = {
  direction: LayoutConfigDirectionEnum.HORIZONTAL,
  gap: {
    column: 40,
    row: 40,
  },
  itemRect: {
    height: 100,
    left: 0,
    top: 0,
    width: 100,
  },
  origin: LayoutConfigDirectionOriginEnum.LEFT,
  stagger: 100,
};

export function calculateBoundingBox(rects: RectType[]): RectType {
  if (rects.length === 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const minLeft = Math.min(...rects.map(rect => validateFiniteNumber(rect.left)));
  const minTop = Math.min(...rects.map(rect => validateFiniteNumber(rect.top)));
  const maxRight = Math.max(
    ...rects.map(rect => validateFiniteNumber(rect.left) + (validateFiniteNumber(rect.width) ?? 0)),
  );
  const maxBottom = Math.max(
    ...rects.map(rect => validateFiniteNumber(rect.top) + (validateFiniteNumber(rect.height) ?? 0)),
  );

  const width = validateFiniteNumber(maxRight - minLeft);
  const height = validateFiniteNumber(maxBottom - minTop);

  return {
    height: validateFiniteNumber(height),
    left: validateFiniteNumber(minLeft),
    top: validateFiniteNumber(minTop),
    width: validateFiniteNumber(width),
  };
}

export function getRectDiff(rect1: RectType, rect2: RectType): RectType {
  const dx = rect2.left - rect1.left;
  const dy = rect2.top - rect1.top;
  const dw = rect2.width - rect1.width;
  const dh = rect2.height - rect1.height;

  return {
    height: dh,
    left: dx,
    top: dy,
    width: dw,
  };
}

export function applyRectDiff(rect: RectType, diff: RectType, dimensions?: boolean): RectType {
  const dl = dimensions
    ? (validateFiniteNumber(rect.width) + validateFiniteNumber(diff.width)) / 4
    : validateFiniteNumber(diff.left);
  const dt = dimensions
    ? (validateFiniteNumber(rect.height) + validateFiniteNumber(diff.height)) / 4
    : validateFiniteNumber(diff.top);

  return {
    ...rect,
    left: validateFiniteNumber(rect.left) + validateFiniteNumber(dl),
    top: validateFiniteNumber(rect.top) + validateFiniteNumber(dt),
  };
}

export function logMessageForRects(rects: RectType[]): string {
  const format = (val: number) =>
    (val ?? null) !== null && !isNaN(val) ? padString(String(Math.round(val)), 6, ' ') : '     -';

  return rects
    .map(
      copy =>
        '|   ' +
        padString(String(copy.id).slice(0, 20), 20, ' ') +
        ': ' +
        [copy.left, copy.top, copy.width, copy.height].map(v => format(v ?? 0)).join(', '),
    )
    .join('\n');
}

export function formatKeyValue(k, v, level?: number): string {
  return `${padString(k.slice(0, 20), 20, ' ')}: ${
    typeof v === 'function'
      ? '__func__'
      : typeof v === 'object' && (v ?? false) && isObject(v)
        ? Object.entries(v ?? {})
            .map(([k2, v2]) => `${k2}=${v2}`)
            .join(',')
        : v
  }`;
}
