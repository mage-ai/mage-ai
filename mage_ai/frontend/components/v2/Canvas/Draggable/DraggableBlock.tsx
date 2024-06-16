import { CSSProperties, FC, ReactEventHandler, useCallback } from 'react';
import { createRef, useState, useRef } from 'react';
import { memo, useEffect, useMemo } from 'react';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { DragPreviewImage, useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

import BlockNode from '../Nodes/BlockNode';
import Grid from '@mana/components/Grid';
import { DragItem, NodeItemType, PortType } from '../interfaces';
import { PortSubtypeEnum, ItemTypeEnum } from '../types';
import { getNodeUUID } from './utils';
import { DraggablePort } from './DraggablePort';

// This is the style used for the preview when dragging
function getStyles({ left, top }: DragItem, {
  canDrop,
  isDragging,
  isOverCurrent,
}: {
  canDrop: boolean;
  isDragging: boolean;
  isOverCurrent: boolean;
}): CSSProperties {
  const transform = `translate3d(${left}px, ${top}px, 0)`;
  return {
    WebkitTransform: transform,
    backgroundColor: canDrop
      ? isOverCurrent ? 'blue' : undefined
      : undefined,
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
  const phaseRef = useRef(0);
  const portsRef = useRef({});
  const itemRef = useRef(null);

  const [ports, setPorts] = useState<PortType[]>([
    { id: `${item.id}-i1`, index: 0, subtype: PortSubtypeEnum.INPUT },
    { id: `${item.id}-i2`, index: 1, subtype: PortSubtypeEnum.INPUT },
    { id: `${item.id}-o1`, index: 0, subtype: PortSubtypeEnum.OUTPUT },
    { id: `${item.id}-o2`, index: 1, subtype: PortSubtypeEnum.OUTPUT },
    ].map((port) => ({ ...port, parent: item, type: ItemTypeEnum.PORT }) as PortType));
  const [draggingNode, setDraggingNode] = useState<NodeItemType | null>(null);

  const itemToDrag: DragItem | PortType = useMemo(() => draggingNode || item, [draggingNode, item]);

  useEffect(() => {
    if (phaseRef.current === 0) {
      preview(getEmptyImage(), { captureDraggingState: true });
    }

    phaseRef.current += 1;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnDrop = useCallback((dragTarget: NodeItemType, dropTarget: NodeItemType) => {
    console.log('Dragged ', dragTarget);
    console.log('Dropped on ', dropTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // https://react-dnd.github.io/react-dnd/docs/api/use-drag
  const [{
    backgroundColor,
    isDragging,
  }, connectDrag, preview] = useDrag(() => ({
    canDrag: () => canDrag ? canDrag(item) : true,
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
      return node.id === itemToDrag.id;
    },
    item: itemToDrag,
    type: itemToDrag.type,
  }), [itemToDrag]);

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
      collect: (monitor) => ({
        canDrop: monitor.canDrop(),
        isOverCurrent: monitor.isOver({ shallow: true }),
      }),
      drop: (dragTarget: NodeItemType, monitor: DropTargetMonitor) => {
        handleOnDrop(dragTarget, item);
      },
      // hover: (item: NodeItemType, monitor: DropTargetMonitor) => true,
    }),
    [handleOnDrop, item],
  );

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, obj: NodeItemType) => {
    event.stopPropagation();
    setDraggingNode(obj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseUp: ReactEventHandler = useCallback(() => {
    setDraggingNode(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPorts = useCallback((key: PortSubtypeEnum) => (
    <>
      {ports?.reduce((acc: PortType[], port: PortType) => {
        if (port?.subtype !== key) {
          return acc;
        }

        const uuid = getNodeUUID(port);
        const itemRef = portsRef?.current?.[uuid] ?? createRef<HTMLDivElement>();
        portsRef.current[uuid] = itemRef;

        return (
          <DraggablePort
            handleMouseDown={event => handleMouseDown(event, port)}
            handleMouseUp={handleMouseUp}
            handleOnDrop={handleOnDrop}
            item={port}
            itemRef={itemRef}
            key={uuid}
          />
        );
      }, [])}
    </>
  ), [handleMouseDown, handleOnDrop, handleMouseUp, ports]);

  const isDraggingBlock = useMemo(() => draggingNode?.type === item?.type, [draggingNode, item]);
  connectDrop(itemRef);

  if (isDraggingBlock) {
    connectDrag(itemRef);
  }

  return (
    <div
      onMouseDown={event => handleMouseDown(event, item)}
      onMouseUp={handleMouseUp}
      // @ts-ignore
      ref={itemRef}
      style={getStyles(item, {
        canDrop,
        isDragging: isDragging && draggingNode?.type === item?.type,
        isOverCurrent,
      })}
    >
      {false && (
        <DragPreviewImage
          connect={preview}
          key={String(Number(new Date()))}
          src="https://www.mage.ai/favicon.ico"
        />
      )}

      <Grid
        autoRows="auto"
        templateColumns="auto 1fr auto"
      >
        <div>{renderPorts(PortSubtypeEnum.INPUT)}</div>

        <BlockNode backgroundColor={backgroundColor} preview={isDraggingBlock} title={item?.title} />

        <div>{renderPorts(PortSubtypeEnum.OUTPUT)}</div>
      </Grid>
    </div>
  );
});
