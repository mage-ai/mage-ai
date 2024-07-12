import { DEBUG } from '../../../utils/debug';
import { LayoutConfigType, RectType } from '../../interfaces';
import { LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum } from '../../types';
import { validateFiniteNumber } from '@utils/number';
import { padString } from '@utils/string';

export function isDebug() {
  return DEBUG.rects && false;
}

export function centerRectOnScreen(boundingBox: RectType, rectBase: RectType, rects: RectType[]): RectType[] {
  if (boundingBox && rectBase) {
    const centerRect = rects.find(rect => rect.id === rectBase.id);
    const xcenter = (validateFiniteNumber(boundingBox.width) - validateFiniteNumber(centerRect.width)) / 2;
    const ycenter = (validateFiniteNumber(boundingBox.height) - validateFiniteNumber(centerRect.height)) / 2;
    const xoff = xcenter - validateFiniteNumber(centerRect.left);
    const yoff = ycenter - validateFiniteNumber(centerRect.top);

    return rects.map(rect => ({
      ...rect,
      left: (rect.left + xoff) - (rect.width / 2),
      top: (rect.top + yoff) - (rect.height / 2),
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
  const maxRight = Math.max(...rects.map(
    rect => validateFiniteNumber(rect.left) + (validateFiniteNumber(rect.width) ?? 0)));
  const maxBottom = Math.max(...rects.map(
    rect => validateFiniteNumber(rect.top) + (validateFiniteNumber(rect.height) ?? 0)));

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
  const format = (val: number) => ((val ?? null) !== null && !isNaN(val))
    ? padString(String(Math.round(val)), 6, ' ') : '     -';

  return rects.map((copy) =>
    '|   ' + padString(String(copy.id).slice(0, 20), 20, ' ') + ': ' + (
      [copy.left, copy.top, copy.width, copy.height].map(v => format(v ?? 0)).join(', '))
  ).join('\n');
}

export function formatKeyValue(k, v): string {
  return `${padString(k.slice(0, 20), 20, ' ')}: ${typeof v === 'function'
    ? '__func__'
    : typeof v === 'object'
      ? '__obj__'
      : v}`
}
