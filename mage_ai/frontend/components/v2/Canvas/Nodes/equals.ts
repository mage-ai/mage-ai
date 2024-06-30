import { RectType } from '../interfaces';

export function areEqualRects(p1: { rect: RectType }, p2: { rect: RectType }) {
  return [
    'height',
    'left',
    'top',
    'width',
  ].every((key: string) => p1?.rect?.[key] === p2?.rect?.[key]);
}

export function areDraggableStylesEqual(p1: { draggable?: boolean }, p2: { draggable?: boolean }) {
  return p1.draggable === p2.draggable
}
