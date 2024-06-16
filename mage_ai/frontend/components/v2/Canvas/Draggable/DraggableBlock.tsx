import type { CSSProperties, FC } from 'react';
import { memo, useEffect } from 'react';
import type { DragSourceMonitor } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

import BlockNode from '../Nodes/BlockNode';
import { DragItem } from '../interfaces';
import { ItemTypeEnum } from '../types';

function getStyles({ left, top }: DragItem, isDragging: boolean): CSSProperties {
  const transform = `translate3d(${left}px, ${top}px, 0)`;
  return {
    WebkitTransform: transform,
    // IE fallback: hide the real node using CSS when dragging
    // because IE will ignore our custom "empty image" drag preview.
    height: isDragging ? 0 : '',
    opacity: isDragging ? 0 : 1,
    position: 'absolute',
    transform,
  };
}

export type DraggableBlockProps = DragItem;

export const DraggableBlock: FC<DraggableBlockProps> = memo(function DraggableBlock(
  item: DraggableBlockProps,
) {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      collect: (monitor: DragSourceMonitor) => ({
        isDragging: monitor.isDragging(),
      }),
      item,
      type: ItemTypeEnum.BLOCK,
    }),
    [item],
  );

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={drag}
      role="DraggableBlock"
      style={getStyles(item, isDragging)}
    >
      <BlockNode title={item?.title} />
    </div>
  );
});
