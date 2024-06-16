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

export type DraggableBlockProps = {
  canDrag?: (item: DragItem) => boolean;
  item: DragItem;
  // itemsRef: { current: Record<string, DragItem> };
};

export const DraggableBlock: FC<DraggableBlockProps> = memo(function DraggableBlock({
  canDrag,
  item,
  // itemsRef,
}: DraggableBlockProps) {
  // function isCurrentItem(monitor: DragSourceMonitor): boolean {
  //   return item.id === (monitor.getItem() as DragItem).id;
  // }

  // https://react-dnd.github.io/react-dnd/docs/api/use-drag
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    canDrag: () =>
      // itemsRef.current = {
      //   ...(itemsRef.current || {}),
      //   [item.id]: {
      //     ...item,
      //     isDragging: true,
      //   },
      // };

       canDrag ? canDrag(item) : true
    ,
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item: DragItem, monitor) => {
      // const delta = monitor.getDifferenceFromInitialOffset() as {
      //   x: number;
      //   y: number;
      // };

      // const left = Math.round(item.left + delta.x);
      // const top = Math.round(item.top + delta.y);

      // item.moveBox({ ...item, left, top });
      //

      // itemsRef.current = {
      //   ...(itemsRef.current || {}),
      //   [item.id]: {
      //     ...item,
      //     isDragging: false,
      //   },
      // };
    },
    // isDragging: (monitor: DragSourceMonitor) => {
    //   if (!isCurrentItem(monitor)) {
    //     return false;
    //   }

    //   const offset = monitor.getClientOffset();
    //   const initialClientOffset = monitor.getInitialClientOffset();

    //   const newOffset = monitor.getClientOffset();
    //   if (offset && newOffset) {
    //     const dx = newOffset.x - initialClientOffset.x;
    //     const dy = newOffset.y - initialClientOffset.y;
    //     if (onDrag) {
    //       onDrag({
    //         ...item,
    //         left: Math.round(item.left + dx),
    //         top: Math.round(item.top + dy),
    //       });
    //     }
    //   }

    //   return true;
    // },
    item,
    type: ItemTypeEnum.BLOCK,
  }), [item]);

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
