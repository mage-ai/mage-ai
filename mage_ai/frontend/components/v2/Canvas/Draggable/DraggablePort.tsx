import update from 'immutability-helper';
import React, { FC, memo, useEffect, useMemo, useRef } from 'react';

import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { DragItem, NodeItemType, PortType, RectType } from '../interfaces';
import { DragPreviewImage, useDrag, useDrop } from 'react-dnd';
import { PortSubtypeEnum, ItemTypeEnum } from '../types';
import { DragAndDropType } from '../Nodes/types';
import { getNodeUUID } from './utils';
import { getTransformedBoundingClientRect } from '../utils/rect';
import { ElementRoleEnum } from '@mana/shared/types';

type DraggablePortProps = {
  children: React.ReactNode;
  item: PortType;
} & DragAndDropType;

export const DraggablePort: FC<DraggablePortProps> = memo(function DraggablePort({
  children,
  item,
  itemRef,
  onDragStart,
  onDrop,
  onMouseDown,
  onMouseUp,
}: DraggablePortProps) {
  const uuid = getNodeUUID(item);
  const phaseRef = useRef(0);

  const [, connectDrag] = useDrag(
    () => ({
      canDrag: (monitor: DragSourceMonitor) => {
        onDragStart(
          update(item, {
            rect: {
              $set: itemRef?.current?.getBoundingClientRect() as RectType,
            },
          }),
          monitor,
        );

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
      isDragging: (monitor: DragSourceMonitor) => {
        const node = monitor.getItem() as NodeItemType;
        return node.id === item.id;
      },
      item,
      type: item.type,
    }),
    [item, onDragStart],
  );

  const [{ canDrop, isOver }, connectDrop] = useDrop(
    () => ({
      accept: [ItemTypeEnum.BLOCK, ItemTypeEnum.PORT],
      collect: monitor => ({
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver(),
      }),
      drop: (dragTarget: NodeItemType) => {
        const { left, height, top, width } = itemRef?.current?.getBoundingClientRect() as RectType;
        onDrop(
          dragTarget,
          update(item, {
            rect: {
              $set: { height, left, top, width },
            },
          }),
        );
      },
    }),
    [onDrop, item],
  );

  useEffect(() => {
    if (itemRef.current) {
      if (phaseRef.current === 0) {
        connectDrag(itemRef);
        connectDrop(itemRef);
      }

      phaseRef.current += 1;
      console.log('Render port', phaseRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  return (
    <div
      key={uuid}
      onDragEnd={event => onMouseUp(event, item)}
      onMouseDown={event => onMouseDown(event, item)}
      onMouseUp={event => onMouseUp(event, item)}
      onTouchStart={event => event.stopPropagation()}
    >
      <div
        ref={itemRef}
        role={[ElementRoleEnum.DRAGGABLE, ElementRoleEnum.DROPPABLE].join(' ')}
        style={{
          backgroundColor: isOver && canDrop ? 'transparent' : 'transparent',
          cursor: 'move',
          display: 'inline-block',
        }}
      >
        {children}
      </div>
    </div>
  );
});
