import update from 'immutability-helper';
import React, { FC, memo, useEffect, useMemo } from 'react';

import { DragItem, NodeItemType, PortType, RectType } from '../interfaces';
import { PortSubtypeEnum, ItemTypeEnum } from '../types';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { DragPreviewImage, useDrag, useDrop } from 'react-dnd';
import { getNodeUUID } from './utils';

type DraggablePortProps = {
  item: PortType;
  itemRef: React.RefObject<HTMLDivElement>;
  handleOnDrop: (source: NodeItemType, target: NodeItemType) => void;
  handleMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseUp: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart: (item: NodeItemType, monitor: DragSourceMonitor) => void;
};

export const DraggablePort: FC<DraggablePortProps> = memo(function DraggablePort({
  item,
  itemRef,
  handleOnDrop,
  handleMouseDown,
  handleMouseUp,
  onDragStart,
}: DraggablePortProps) {
  const uuid = getNodeUUID(item);

  const [{
    backgroundColor,
    isDragging,
  }, connectDrag, preview] = useDrag(() => ({
    canDrag: (monitor: DragSourceMonitor) => {
      onDragStart(update(item, {
        rect: {
          $set: itemRef?.current?.getBoundingClientRect() as RectType,
        },
      }), monitor);

      return true;
    },
    collect: (monitor: DragSourceMonitor) => {
      const isDragging = monitor.isDragging();

      return {
        backgroundColor: isDragging ? 'red' : 'white',
        isDragging,
        opacity: isDragging ? 0.4 : 1,
      };
    },
    // end: (item: DragItem, monitor) => null,
    isDragging: (monitor: DragSourceMonitor) => {
      const node = monitor.getItem() as NodeItemType;
      return node.id === item.id;
    },
    item,
    type: item.type,
  }), [item, onDragStart]);

  const [{ canDrop, isOver }, connectDrop] = useDrop(
    () => ({
      accept: [ItemTypeEnum.BLOCK, ItemTypeEnum.PORT],
      canDrop: (node: NodeItemType, monitor: DropTargetMonitor) => true,
      collect: (monitor) => ({
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver(),
      }),
      drop: (dragTarget: NodeItemType, monitor: DropTargetMonitor) => {
        const { left, height, top, width } = itemRef?.current?.getBoundingClientRect() as RectType;
        handleOnDrop(dragTarget, update(item, {
          rect: {
            $set: { height, left, top, width },
          },
        }));
      },
    }),
    [handleOnDrop, item],
  );

  connectDrag(itemRef);
  connectDrop(itemRef);

  return (
    <div
      key={uuid}
      onDragEnd={handleMouseUp}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        border: '1px dotted black',
        padding: 12,
      }}
    >
      <div
        ref={itemRef}
        style={{
          backgroundColor: isOver && canDrop ? 'red' : 'green',
          cursor: 'move',
          display: 'inline-block',
          height: 24,
          width: 24,
        }}
      />
    </div>
  );
});
