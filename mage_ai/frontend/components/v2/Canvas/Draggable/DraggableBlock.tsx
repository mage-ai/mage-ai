import type { CSSProperties, FC } from 'react';
import { memo, useEffect } from 'react';
import type { DragSourceMonitor } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

import BlockNode from '../Nodes/BlockNode';
import { ItemTypeEnum } from '../types';

function getStyles(
  left: number,
  top: number,
  isDragging: boolean,
): CSSProperties {
  const transform = `translate3d(${left}px, ${top}px, 0)`;
  return {
    position: 'absolute',
    transform,
    WebkitTransform: transform,
    // IE fallback: hide the real node using CSS when dragging
    // because IE will ignore our custom "empty image" drag preview.
    opacity: isDragging ? 0 : 1,
    height: isDragging ? 0 : '',
  };
}

export interface DraggableBlockProps {
  id: string
  title: string
  left: number
  top: number
}

export const DraggableBlock: FC<DraggableBlockProps> = memo(function DraggableBlock(
  props,
) {
  const { id, title, left, top } = props;
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: ItemTypeEnum.BLOCK,
      item: { id, left, top, title },
      collect: (monitor: DragSourceMonitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id, left, top, title],
  );

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, []);

  return (
    <div
      ref={drag}
      role="DraggableBlock"
      style={getStyles(left, top, isDragging)}
    >
      <BlockNode title={title} />
    </div>
  );
});
