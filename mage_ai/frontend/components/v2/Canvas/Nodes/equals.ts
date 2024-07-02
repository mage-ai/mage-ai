import { RectType } from '../interfaces';

export function areEqual(p1: any, p2: any) {
  const equal = p1?.node?.id === p2?.node?.id
    && areDraggableStylesEqual(p1, p2)
    && areDroppable(p1, p2)
    && areEqualRects({ rect: p1?.rect }, { rect: p2?.rect });

  return equal;
}

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

function areDroppable(p1: { droppable?: boolean }, p2: { droppable?: boolean }) {
  return p1.droppable === p2.droppable
}

export function areEqualApps(p1: any, p2: any): boolean {
  const appIDs = ({ node }) => node?.apps?.map(a => String(a?.id ?? '')).sort()?.join('|');

  return appIDs(p1) === appIDs(p2);
}
