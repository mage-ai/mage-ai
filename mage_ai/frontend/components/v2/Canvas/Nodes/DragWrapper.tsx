import React, { useEffect, useRef } from 'react';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { CSSProperties } from 'react';
import { ElementRoleEnum } from '@mana/shared/types';
import { ItemTypeEnum } from '../types';
import { NodeItemType, PortType, RectType } from '../interfaces';
import { useDrag, useDrop } from 'react-dnd';

export type DragWrapperType = {
  draggable?: boolean;
  droppable?: boolean;
  droppableItemTypes?: ItemTypeEnum[];
  eventHandlers?: {
    onDragEnd?: (event: any) => void;
    onDragStart?: (event: any) => void;
    onMouseDown?: (event: any) => void;
  };
  handleDrop?: (dragTarget: NodeItemType, dropTarget: NodeItemType) => void;
};

type DragWrapperProps = {
  children?: React.ReactNode;
  item?: NodeItemType;
  rect?: RectType;
} & DragWrapperType;

export function getStyles(
  node: NodeItemType,
  {
    draggable,
    isDragging,
    rect,
  }: {
    draggable: boolean;
    isDragging: boolean;
    rect?: RectType;
  },
): CSSProperties {
  const { id, type } = node;
  rect = rect ?? node?.rect;
  const { left, top, width, zIndex } = rect || ({} as RectType);
  const transform = `translate3d(${left ?? 0}px, ${top ?? 0}px, 0)`;

  return {
    WebkitTransform: transform,
    // backgroundColor: canDrop ? (isOverCurrent ? 'blue' : backgroundColor) : backgroundColor,
    // border: '1px dashed gray',
    // IE fallback: hide the real node using CSS when dragging
    // because IE will ignore our custom "empty image" drag preview.
    position: 'absolute',
    transform,
    zIndex,
    ...(draggable ? { cursor: 'move' } : {}),
    ...(isDragging
      ? ItemTypeEnum.APP === type
        ? { height: rect?.height ?? undefined, opacity: 0 }
        : { height: 0, opacity: 0 }
      : ItemTypeEnum.NODE === type
        ? {
          height: rect?.height ?? undefined,
          // minHeight: rect?.height === Infinity || rect?.height === -Infinity ? 0 : rect?.height ?? 0,
        }
        : {}
    ),
    ...((width ?? false) ? { minWidth: width } : {}),
  };
}

function DragWrapper({
  children,
  draggable,
  droppable,
  droppableItemTypes,
  eventHandlers,
  handleDrop,
  item,
  rect,
}: DragWrapperProps, ref: React.MutableRefObject<HTMLDivElement>) {
  const refInternal = useRef(null);
  const dragRef = ref ?? refInternal;

  const [{ isDragging }, connectDrag, preview] = useDrag(
    () => ({
      ...item,
      collect: (monitor: DragSourceMonitor) => ({ isDragging: monitor.isDragging() }),
      isDragging: (monitor: DragSourceMonitor) => {
        const draggingItem = monitor.getItem() as NodeItemType;
        return draggingItem.id === item.id;
      },
    }),
    [draggable, item],
  );

  const [, connectDrop] = useDrop(
    () => ({
      accept: droppableItemTypes ?? [],
      canDrop: (itemDrop: NodeItemType, monitor: DropTargetMonitor) => {
        if (!droppable) return false;
        if (!monitor.isOver({ shallow: true })) return false;

        if (ItemTypeEnum.BLOCK === itemDrop.type) {
          return itemDrop.id !== item.id;
        } else if (ItemTypeEnum.PORT === itemDrop.type) {
          return (itemDrop as PortType).parent.id !== item.id;
        }

        return false;
      },
      collect: monitor => ({
        canDrop: monitor.canDrop(),
        isOverCurrent: monitor.isOver({ shallow: true }),
      }),
      drop: (dragTarget: NodeItemType) => handleDrop?.(dragTarget, item),
    }),
    [droppable, droppableItemTypes, handleDrop, item],
  );

  useEffect(() => {
    preview(dragRef.current as Element);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This needs to always connect without any conditionals or else it’ll never connect after mount.
  connectDrop(dragRef);
  connectDrag(dragRef);

  return (
    <div
      {...Object.entries(
        eventHandlers ?? {},
      ).reduce((acc, [k, v]: [string, (event: any) => void]) => ({
        ...acc,
        [k]: draggable && v ? v : undefined,
      }), {})}
      ref={dragRef}
      role={[ElementRoleEnum.DRAGGABLE].join(' ')}
      style={getStyles(item, {
        draggable,
        isDragging,
        rect,
      })}
    >
      {children}
    </div>
  );
}

export function areEqual(p1: { rect: RectType }, p2: { rect: RectType }) {
  return p1.rect.left === p2.rect.left && p1.rect.top === p2.rect.top
    && p1.rect.width === p2.rect.width && p1.rect.height === p2.rect.height;
}

export default React.memo(React.forwardRef(DragWrapper), areEqual);
