import type { DropTargetMonitor } from 'react-dnd';
import { OffsetType, RectType } from '../../../Canvas/interfaces';

export function rectFromOrigin(rectOrigin: RectType, monitor: DropTargetMonitor): RectType {
  const offset = monitor.getClientOffset();
  const initialClientOffset = monitor.getInitialClientOffset();

  if (!(offset && initialClientOffset)) {
    return rectOrigin;
  }

  const newOffset: OffsetType = monitor.getClientOffset();

  const dx = newOffset.x - initialClientOffset.x;
  const dy = newOffset.y - initialClientOffset.y;

  return {
    ...rectOrigin,
    left: Math.round(rectOrigin.left + dx),
    top: Math.round(rectOrigin.top + dy),
  };
}
