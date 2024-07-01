import React from 'react';
import type { DragSourceMonitor } from 'react-dnd';
import { DraggableType } from './types';
import { ElementRoleEnum } from '@mana/shared/types';
import { FC } from 'react';
import { NodeType, RectType } from '../interfaces';
import { getDraggableStyles } from './utils';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { memo, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';

export type DraggableWrapperProps = {
  children?: React.ReactNode;
  className?: string;
  draggable?: boolean;
  node: NodeType
  nodeRef: React.RefObject<HTMLDivElement>;
  rect: RectType
} & DraggableType;

export const DraggableWrapper: FC<DraggableWrapperProps> = memo(function DraggableWrapper({
  children,
  className,
  draggable,
  handlers,
  node,
  nodeRef,
  rect,
}: DraggableWrapperProps) {
  const {
    onDragEnd,
    onDragStart,
    onMouseDown,
    onMouseOver,
    onMouseUp,
  } = handlers ?? {};

  const [{ isDragging }, connectDrag, preview] = useDrag(
    () => ({
      canDrag: () => draggable,
      collect: (monitor: DragSourceMonitor) => ({ isDragging: monitor.isDragging() }),
      isDragging: (monitor: DragSourceMonitor) => (monitor.getItem() as NodeType).id === node.id,
      item: node,
      type: node.type,
    }),
    [draggable, node],
  );

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This needs to always connect without any conditionals or else it’ll never connect after mount.
  connectDrag(nodeRef);

  return (
    <div
      className={[
        styles.nodeWrapper,
        className ?? '',
      ].join(' ')}
      onDragEnd={draggable && onDragEnd ? event => onDragEnd?.(event as any) : undefined}
      onDragStart={draggable && onDragStart ? event => onDragStart?.(event as any) : undefined}
      onMouseDown={draggable && onMouseDown ? event => onMouseDown?.(event as any) : undefined}
      // THESE WILL DISABLE the style opacity of the wrapper.
      // onMouseLeave={onMouseLeave ? event => onMouseLeave?.(event as any) : undefined}
      onMouseOver={!draggable && onMouseOver ? event => onMouseOver?.(event as any) : undefined}
      onMouseUp={draggable && onMouseUp ? event => onMouseUp?.(event as any) : undefined}
      ref={nodeRef}
      role={[ElementRoleEnum.DRAGGABLE].join(' ')}
      style={getDraggableStyles(rect, {
        draggable,
        isDragging,
      })}
    >
      {children}
    </div>
  );
});
