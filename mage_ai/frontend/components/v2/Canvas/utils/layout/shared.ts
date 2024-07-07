import { LayoutConfigType } from '../../interfaces';
import { LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum } from '../../types';
import { validateFiniteNumber } from '@utils/number';

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
  const maxRight = Math.max(...rects.map(rect => validateFiniteNumber(rect.left) + (validateFiniteNumber(rect.width) ?? 0)));
  const maxBottom = Math.max(...rects.map(rect => validateFiniteNumber(rect.top) + (validateFiniteNumber(rect.height) ?? 0)));

  const width = validateFiniteNumber(maxRight - minLeft);
  const height = validateFiniteNumber(maxBottom - minTop);

  return {
    height: validateFiniteNumber(height),
    left: validateFiniteNumber(minLeft),
    top: validateFiniteNumber(minTop),
    width: validateFiniteNumber(width),
  };
}
