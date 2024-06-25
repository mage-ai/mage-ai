import update from 'immutability-helper';
import React, { FC, memo, useEffect } from 'react';

import type { DragSourceMonitor } from 'react-dnd';
import { NodeItemType, PortType, RectType } from '../interfaces';
import { useDrag, useDrop } from 'react-dnd';
import { ItemTypeEnum } from '../types';
import { DragAndDropType } from '../Nodes/types';
import { buildPortUUID } from './utils';
import { ElementRoleEnum } from '@mana/shared/types';

type DraggablePortProps = {
  children: React.ReactNode;
  item: PortType;
} & DragAndDropType;

export const DraggablePort: FC<DraggablePortProps> = memo(function DraggablePort({
  children,
  item,
  itemRef,
  handlers,
}: DraggablePortProps) {
  const { onDragStart, onDrop, onMouseDown, onMouseUp } = handlers;

  const [, connectDrag] = useDrag(
    () => ({
      canDrag: (monitor: DragSourceMonitor) => {
        const { x, y } = monitor.getInitialClientOffset();

        const node = update(item, {
          rect: {
            $set: {
              height: item.rect.height,
              left: x,
              top: y,
              width: item.rect.width,
            },
          },
        });

        onDragStart({
          data: {
            node: update(node, {
              rect: {
                $set: itemRef?.current?.getBoundingClientRect() as RectType,
              },
            }),
          },
        } as any);

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
      accept: [ItemTypeEnum.BLOCK, ItemTypeEnum.NODE, ItemTypeEnum.PORT],
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
    itemRef?.current && connectDrag(itemRef);
    itemRef?.current && connectDrop(itemRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      key={buildPortUUID(item)}
      // @ts-ignore
      onDragEnd={event => onMouseUp(update(event, { data: { node: { $set: item } } }) as any)}
      // @ts-ignore
      onMouseDown={event => onMouseDown(update(event, { data: { node: { $set: item } } }) as any)}
      // @ts-ignore
      onMouseUp={event => onMouseUp(update(event, { data: { node: { $set: item } } }) as any)}
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
