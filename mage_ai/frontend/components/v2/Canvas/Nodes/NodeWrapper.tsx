import React from 'react';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { CSSProperties, FC, useCallback } from 'react';
import { createRef, useState, useRef } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { memo, useEffect, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import Grid from '@mana/components/Grid';
import { DragItem, LayoutConfigType, NodeItemType, PortType, RectType } from '../interfaces';
import {
  PortSubtypeEnum,
  ItemTypeEnum,
  LayoutConfigDirectionEnum,
} from '../types';
import { ElementRoleEnum } from '@mana/shared/types';
import { getNodeUUID } from '../Draggable/utils';
import { DraggablePort } from '../Draggable/DraggablePort';

// This is the style used for the preview when dragging
function getStyles(
  { rect }: DragItem,
  {
    canDrop,
    isDragging,
    isOverCurrent,
  }: {
    canDrop: boolean;
    isDragging: boolean;
    isOverCurrent: boolean;
  },
): CSSProperties {
  const { left, top } = rect || ({} as RectType);
  const transform = `translate3d(${left}px, ${top}px, 0)`;

  return {
    WebkitTransform: transform,
    // backgroundColor: canDrop ? (isOverCurrent ? 'blue' : backgroundColor) : backgroundColor,
    // border: '1px dashed gray',
    // IE fallback: hide the real node using CSS when dragging
    // because IE will ignore our custom "empty image" drag preview.
    position: 'absolute',
    transform,
    ...(isDragging ? { height: 0, opacity: 0 } : {}),
  };
}

export type NodeWrapperProps = {
  canDrag?: (item: DragItem) => boolean;
  children?: React.ReactNode;
  item: DragItem;
  layout?: LayoutConfigType;
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
  onPortMount: (item: PortType, itemRef: React.RefObject<HTMLDivElement>) => void;
};

export const NodeWrapper: FC<NodeWrapperProps> = memo(function NodeWrapper({
  children,
  canDrag,
  item,
  layout,
  onDragStart,
  onDrop,
  onMouseDown,
  onMouseUp,
  onPortMount,
}: NodeWrapperProps) {
  const phaseRef = useRef(0);
  const portsRef = useRef({});
  const itemRef = useRef(null);

  const ports: PortType[] = useMemo(
    () => ((item?.inputs || []) as PortType[]).concat((item?.outputs || []) as PortType[]),
    [item],
  );
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

  const renderPorts = useCallback(
    (key: PortSubtypeEnum) => (
      <>
        {ports?.reduce((acc: any[], port: PortType) => {
          if (port?.subtype !== key) {
            return acc;
          }

          const uuid = getNodeUUID(port);
          const itemRef = portsRef?.current?.[uuid] ?? createRef<HTMLDivElement>();
          portsRef.current[uuid] = itemRef;

          return acc.concat(
            <DraggablePort
              handleMouseDown={event => handleMouseDown(event, port)}
              handleMouseUp={event => handleMouseUp(event, port)}
              handleOnDrop={handleOnDrop}
              item={port}
              itemRef={itemRef}
              key={uuid}
              onDragStart={onDragStart}
              onMount={onPortMount}
            />,
          );
        }, [])}
      </>
    ),
    [handleMouseDown, handleOnDrop, handleMouseUp, onDragStart, onPortMount, ports],
  );

  const isDraggingBlock = useMemo(() => draggingNode?.type === item?.type, [draggingNode, item]);
  connectDrop(itemRef);

  if (isDraggingBlock) {
    connectDrag(itemRef);
  }

  const isVertical = useMemo(
    () => LayoutConfigDirectionEnum.VERTICAL === layout?.direction,
    [layout],
  );
  const gridProps = useMemo(
    () => ({
      alignItems: 'center',
      autoColumns: isVertical ? 'auto' : null,
      autoRows: isVertical ? null : 'auto',
      columnGap: isVertical ? 12 : null,
      height: 'inherit',
      rowGap: isVertical ? null : 12,
      templateColumns: isVertical ? 'auto' : 'auto 1fr auto',
      templateRows: isVertical ? 'auto 1fr auto' : 'auto',
    }),
    [isVertical],
  );
  const gridPortProps = useMemo(
    () => ({
      columnGap: isVertical ? 12 : null,
      rowGap: isVertical ? null : 12,
      style: {
        gridTemplateColumns: isVertical ? 'repeat(auto-fit, minmax(0px, min-content))' : 'auto',
        gridTemplateRows: isVertical ? 'auto' : 'repeat(auto-fit, minmax(0px, min-content))',
      },
    }),
    [isVertical],
  );

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
      <Grid {...gridProps}>
        <Grid {...gridPortProps}>{renderPorts(PortSubtypeEnum.INPUT)}</Grid>
        {children}
        <Grid {...gridPortProps}>{renderPorts(PortSubtypeEnum.OUTPUT)}</Grid>
      </Grid>
    </div>
  );
});
