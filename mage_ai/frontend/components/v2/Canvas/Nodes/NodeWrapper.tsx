import React from 'react';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { CSSProperties, FC } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { memo, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { DragItem, NodeItemType, PortType, RectType } from '../interfaces';
import { ItemTypeEnum } from '../types';
import { DragAndDropType } from './types';
import { ElementRoleEnum } from '@mana/shared/types';
import { DEBUG } from '@components/v2/utils/debug';

export type NodeWrapperProps = {
  children?: React.ReactNode;
  className?: string;
  node: NodeItemType;
  rect?: RectType;
} & DragAndDropType;

// This is the style used for the preview when dragging
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

export const NodeWrapper: FC<NodeWrapperProps> = memo(function NodeWrapper({
  children,
  className,
  connectDrag,
  draggable,
  droppable,
  handlers,
  node,
  nodeRef,
  rect,
}: NodeWrapperProps) {
  const { onDragEnd, onDragStart, onDrop, onMouseDown, onMouseLeave, onMouseOver, onMouseUp } =
    handlers;
  const [{ isDragging }, connectDragBase, preview] = useDrag(
    () => ({
      canDrag: () => {
        onDragStart({ data: { node } } as any);
        return draggable;
      },
      collect: (monitor: DragSourceMonitor) => ({ isDragging: monitor.isDragging() }),
      isDragging: (monitor: DragSourceMonitor) => {
        const draggingItem = monitor.getItem() as NodeItemType;
        return draggingItem.id === node.id;
      },
      item: node,
      type: node?.type,
    }),
    [draggable, node, onDragStart],
  );

  const [, connectDrop] = useDrop(
    () => ({
      accept: [ItemTypeEnum.PORT],
      canDrop: (droppingItem: NodeItemType, monitor: DropTargetMonitor) => {
        if (!droppable) return false;

        if (!monitor.isOver({ shallow: true })) {
          return false;
        }

        if (ItemTypeEnum.BLOCK === droppingItem.type) {
          return droppingItem.id !== node.id;
        } else if (ItemTypeEnum.PORT === droppingItem.type) {
          return (droppingItem as PortType).parent.id !== node.id;
        }

        return false;
      },
      collect: monitor => ({
        canDrop: monitor.canDrop(),
        isOverCurrent: monitor.isOver({ shallow: true }),
      }),
      drop: (dragTarget: NodeItemType) => {
        onDrop(dragTarget, node);
      },
    }),
    [droppable, onDrop, node],
  );

  useEffect(() => {
    // What does this even do? It sometimes shows a preview sometimes doesn’t.
    // preview(getEmptyImage(), { captureDraggingState: true });
    preview(nodeRef.current as Element);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This needs to always connect without any conditionals or else it’ll never connect after mount.
  connectDrop(nodeRef);
  (connectDrag ?? connectDragBase)(nodeRef);

  // DEBUG.dragging && console.log(
  //   'NodeWrapper',
  //   ['draggable', draggable],
  //   ['isDragging', isDragging],
  // );

  return (
    <div
      className={[
        styles.nodeWrapper,
        className ?? '',
      ].join(' ')}
      onDragEnd={draggable && onDragEnd ? event => onDragEnd?.(event as any) : undefined}
      onDragStart={draggable && onDragStart ? event => onDragStart?.(event as any) : undefined}
      onMouseDown={draggable && onMouseDown
        ? event => {
          DEBUG.dragging && console.log('NodeWrapper.onMouseDown', event);
          onMouseDown?.(event as any);
        }
        : undefined
      }
      // THESE WILL DISABLE the style opacity of the wrapper.
      // onMouseLeave={onMouseLeave ? event => onMouseLeave?.(event as any) : undefined}
      onMouseOver={!draggable && onMouseOver ? event => onMouseOver?.(event as any) : undefined}
      onMouseUp={draggable && onMouseUp ? event => onMouseUp?.(event as any) : undefined}
      ref={nodeRef}
      role={[ElementRoleEnum.DRAGGABLE].join(' ')}
      style={getStyles(node, {
        draggable,
        isDragging: isDragging && node?.type === node?.type,
        rect,
      })}
    >
      {children}
    </div>
  );
});
