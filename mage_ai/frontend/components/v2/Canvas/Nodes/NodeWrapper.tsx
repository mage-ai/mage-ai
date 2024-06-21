import React from 'react';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { CSSProperties, FC } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { memo, useEffect, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { DragItem, NodeItemType, PortType, RectType } from '../interfaces';
import { ItemTypeEnum } from '../types';
import { DragAndDropType } from './types';
import { ElementRoleEnum } from '@mana/shared/types';

// This is the style used for the preview when dragging
function getStyles({ rect }: DragItem, { isDragging }: { isDragging: boolean }): CSSProperties {
  const {
    left,
    top,
    zIndex,
  } = rect || ({} as RectType);
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
    zIndex,
    ...(isDragging ? { height: 0, opacity: 0 } : {}),
  };
}

export type NodeWrapperProps = {
  children?: React.ReactNode;
  item: DragItem;
} & DragAndDropType;

export const NodeWrapper: FC<NodeWrapperProps> = memo(function NodeWrapper({
  children,
  draggingNode,
  handlers,
  item,
  itemRef,
}: NodeWrapperProps) {
  const {
    onDragEnd,
    onDragStart,
    onDrop,
    onMouseDown,
    onMouseUp,
  } = handlers;
  const itemToDrag: DragItem | PortType = useMemo(() => draggingNode || item, [draggingNode, item]);

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [{ isDragging }, connectDrag, preview] = useDrag(
    () => ({
      canDrag: () => {
        onDragStart(null, item);
        return true;
      },
      collect: (monitor: DragSourceMonitor) => ({ isDragging: monitor.isDragging() }),
      isDragging: (monitor: DragSourceMonitor) => {
        const node = monitor.getItem() as NodeItemType;
        return node.id === itemToDrag.id;
      },
      item: itemToDrag,
      type: itemToDrag.type,
    }),
    [itemToDrag, onDragStart],
  );

  const [, connectDrop] = useDrop(
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
      drop: (dragTarget: NodeItemType) => {
        onDrop(dragTarget, item);
      },
    }),
    [onDrop, item],
  );

  connectDrop(itemRef);
  draggingNode?.type === item?.type && connectDrag(itemRef);

  return (
    <div
      className={[
        styles.nodeWrapper,
        styles[itemToDrag?.type],
        stylesBuilder.level,
        stylesBuilder[`level-${item?.level}`],
      ].join(' ')}
      onDragEnd={event => onDragEnd(event, item)}
      onDragStart={event => onDragStart(event, item)}
      onMouseDown={event => onMouseDown(event, item)}
      onMouseUp={event => onMouseUp(event, item)}
      ref={itemRef}
      role={[ElementRoleEnum.DRAGGABLE].join(' ')}
      style={getStyles(item, { isDragging: isDragging && draggingNode?.type === item?.type })}
    >
      {children}
    </div>
  );
});
