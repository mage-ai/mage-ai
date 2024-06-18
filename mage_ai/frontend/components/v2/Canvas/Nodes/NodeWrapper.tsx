import React from 'react';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { CSSProperties, FC, useCallback } from 'react';
import { useState, useRef } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { memo, useEffect, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import Grid from '@mana/components/Grid';
import { DragItem, LayoutConfigType, NodeItemType, PortType, RectType } from '../interfaces';
import {
  ItemTypeEnum,
  LayoutConfigDirectionEnum,
} from '../types';
import { ElementRoleEnum } from '@mana/shared/types';


// This is the style used for the preview when dragging
function getStyles({ rect }: DragItem, { isDragging }: { isDragging: boolean }): CSSProperties {
  const { left, top } = rect || ({} as RectType);
  const transform = `translate3d(${left}px, ${top}px, 0)`;

  return {
    WebkitTransform: transform,
    // backgroundColor: canDrop ? (isOverCurrent ? 'blue' : backgroundColor) : backgroundColor,
    // border: '1px dashed gray',
    // IE fallback: hide the real node using CSS when dragging
    // because IE will ignore our custom "empty image" drag preview.
    cursor: 'move',
    position: 'absolute',
    transform,
    ...(isDragging ? { height: 0, opacity: 0 } : {}),
  };
}

export type NodeWrapperProps = {
  canDrag?: (item: DragItem) => boolean;
  children?: React.ReactNode;
  item: DragItem;
  onDragStart: (item: NodeItemType, monitor: DragSourceMonitor) => void;
  onDrop: (dragTarget: NodeItemType, dropTarget: NodeItemType) => void;
  onMouseDown: (
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    obj: NodeItemType,
  ) => void;
  onMouseUp: (
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    obj: NodeItemType,
  ) => void;
  itemRef: React.RefObject<HTMLDivElement>;
};

export const NodeWrapper: FC<NodeWrapperProps> = memo(function NodeWrapper({
  children,
  canDrag,
  item,
  onDragStart,
  onDrop,
  onMouseDown,
  onMouseUp,
  itemRef,
}: NodeWrapperProps) {
  const phaseRef = useRef(0);

  const [draggingNode, setDraggingNode] = useState<NodeItemType | null>(null);

  const itemToDrag: DragItem | PortType = useMemo(() => draggingNode || item, [draggingNode, item]);

  useEffect(() => {
    if (phaseRef.current === 0) {
      preview(getEmptyImage(), { captureDraggingState: true });
    }
    phaseRef.current += 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnDrop = useCallback(
    (dragTarget: NodeItemType, dropTarget: NodeItemType) => {
      onDrop(dragTarget, dropTarget);
    },
    [onDrop],
  );

  const [{ isDragging }, connectDrag, preview] = useDrag(
    () => ({
      canDrag: (monitor: DragSourceMonitor) => {
        if (!canDrag || canDrag(item)) {
          onDragStart(item, monitor);
          return true;
        }

        return false;
      },
      collect: (monitor: DragSourceMonitor) => {
        const isDragging = monitor.isDragging();

        return {
          backgroundColor: isDragging ? 'red' : undefined,
          isDragging,
          opacity: isDragging ? 0.4 : 1,
        };
      },
      // end: (item: DragItem, monitor) => null,
      isDragging: (monitor: DragSourceMonitor) => {
        const node = monitor.getItem() as NodeItemType;
        // console.log('isDragging?', node.id === itemToDrag.id);
        return node.id === itemToDrag.id;
      },
      item: itemToDrag,
      type: itemToDrag.type,
    }),
    [itemToDrag, onDragStart],
  );

  const [{ canDrop, isOverCurrent }, connectDrop] = useDrop(
    () => ({
      accept: [ItemTypeEnum.PORT],
      canDrop: (node: NodeItemType, monitor: DropTargetMonitor) => {
        if (!monitor.isOver({ shallow: true })) {
          return false;
        }

        if (ItemTypeEnum.BLOCK === node.type) {
          return node.id !== item.id;
        } else if (ItemTypeEnum.PORT === node.type) {
          return (node as PortType).parent.id !== item.id;
        }

        return false;
      },
      collect: monitor => ({
        canDrop: monitor.canDrop(),
        isOverCurrent: monitor.isOver({ shallow: true }),
      }),
      drop: (dragTarget: NodeItemType, monitor: DropTargetMonitor) => {
        handleOnDrop(dragTarget, item);
      },
    }),
    [handleOnDrop, item],
  );

  const handleMouseDown = useCallback(
    (
      event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      node: NodeItemType,
    ) => {
      onMouseDown(event, node);
      setDraggingNode(node);
    },
    [onMouseDown],
  );

  const handleMouseUp = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, node: NodeItemType) => {
      onMouseUp(event, node);
      setDraggingNode(null);
    },
    [onMouseUp],
  );

  const isDraggingBlock = useMemo(() => draggingNode?.type === item?.type, [draggingNode, item]);
  connectDrop(itemRef);

  if (isDraggingBlock) {
    connectDrag(itemRef);
  }

  return (
    <div
      onDragEnd={event => handleMouseUp(event, item)}
      onDragStart={event => handleMouseDown(event, item)}
      onMouseDown={event => handleMouseDown(event, item)}
      onMouseUp={event => handleMouseUp(event, item)}
      ref={itemRef}
      role={[ElementRoleEnum.DRAGGABLE].join(' ')}
      style={getStyles(item, {
        canDrop,
        isDragging: isDragging && draggingNode?.type === item?.type,
        isOverCurrent,
      })}
    >
      {children}
    </div>
  );
});
