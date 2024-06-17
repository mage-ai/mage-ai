import update from 'immutability-helper';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useDrop } from 'react-dnd';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';

import { CanvasStyled } from './index.style';
import { Canvas } from '../../Canvas';
import {
  DragItem,
  NodeItemType,
  OffsetType,
  PortType,
  RectType,
  LayoutConfigType,
} from '../../Canvas/interfaces';
import {
  ItemTypeEnum,
  LayoutConfigDirectionEnum,
  LayoutConfigDirectionOriginEnum,
} from '../../Canvas/types';
import { DraggableBlock } from '../../Canvas/Draggable/DraggableBlock';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { snapToGrid } from '../../Canvas/utils/snapToGrid';
import { randomNameGenerator, randomSimpleHashGenerator } from '@utils/string';
import { ConnectionLine } from './Connections/ConnectionLine';
import { ConnectionLines } from './Connections/ConnectionLines';
import { ConnectionType } from './Connections/interfaces';
import { createConnection, connectionUUID, getConnections, updatePaths } from './Connections/utils';
import { rectFromOrigin } from './utils/positioning';
import { getNodeUUID } from '@components/v2/Canvas/Draggable/utils';
import BlockType from '@interfaces/BlockType';
import { initializeBlocksAndConnections } from './utils/blocks';
import { useZoomPan } from '@mana/hooks/useZoomPan';

type PipelineBuilderProps = {
  blocks?: BlockType[];
  snapToGridOnDrag?: boolean;
  onChildDragEnd: () => void;
  onChildDragStart: () => void;
};

// Drag preview image
// https://react-dnd.github.io/react-dnd/docs/api/drag-preview-image

// Drag layer
// https://react-dnd.github.io/react-dnd/docs/api/use-drag-layer

// Drop manager
// https://react-dnd.github.io/react-dnd/docs/api/use-drag-drop-manager

// Monitors
// https://react-dnd.github.io/react-dnd/docs/api/drag-source-monitor
// https://react-dnd.github.io/react-dnd/docs/api/drop-target-monitor
// https://react-dnd.github.io/react-dnd/docs/api/drag-layer-monitor

const PipelineBuilder: React.FC<PipelineBuilderProps> = ({
  blocks,
  snapToGridOnDrag = true,
  onChildDragEnd,
  onChildDragStart,
}: PipelineBuilderProps) => {
  console.log('PipelineBuilder render');

  const layoutConfig = useMemo(
    () => ({
      direction: LayoutConfigDirectionEnum.VERTICAL,
      origin: LayoutConfigDirectionOriginEnum.TOP,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [],
  );

  const phaseRef = useRef<number>(0);
  const connectionsRef = useRef<Record<string, ConnectionType>>(null);
  const portsRef = useRef<Record<string, PortType>>(null);
  const itemsRef = useRef<Record<string, DragItem>>(null);
  const connectionsDraggingRef = useRef<Record<string, ConnectionType>>(null);
  const itemDraggingRef = useRef<NodeItemType | null>(null);

  const [connections, setConnectionsState] = useState<Record<string, ConnectionType>>(null);
  const [connectionsDragging, setConnectionsDraggingState] =
    useState<Record<string, ConnectionType>>(null);
  const [items, setItemsState] = useState<Record<string, DragItem>>(null);

  function setConnections(connections: Record<string, ConnectionType>) {
    connectionsRef.current = {
      ...connectionsRef.current,
      ...connections,
    };
    setConnectionsState(connectionsRef.current);
  }

  function setConnectionsDragging(connectionsDragging: Record<string, ConnectionType>) {
    connectionsDraggingRef.current = connectionsDragging;
    setConnectionsDraggingState(connectionsDragging);
  }

  function setItems(items: Record<string, DragItem>) {
    itemsRef.current = items;
    setItemsState(prev => ({ ...prev, ...items }));
    setConnections(connectionsRef.current);
  }

  useEffect(() => {
    if (phaseRef.current === 0 && blocks?.length >= 1) {
      const { connectionsMapping, itemsMapping, portsMapping } = initializeBlocksAndConnections(
        blocks,
        {
          blockHeight: 200,
          blockWidth: 300,
          layout: layoutConfig,
          maxHeight: typeof window !== 'undefined' ? window.innerHeight : null,
        },
      );

      connectionsRef.current = connectionsMapping;
      portsRef.current = portsMapping;
      setItems(itemsMapping);
    }

    phaseRef.current += 1;

    return () => {
      phaseRef.current = 0;
      connectionsRef.current = null;
      portsRef.current = null;
      itemsRef.current = null;
      connectionsDraggingRef.current = null;
      itemDraggingRef.current = null;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, layoutConfig]);

  function onDrag(item: NodeItemType) {
    if (ItemTypeEnum.BLOCK === item.type) {
      updatePaths(item, connectionsRef);
    } else if (ItemTypeEnum.PORT === item.type) {
      updatePaths(item, connectionsDraggingRef);
    }
  }

  function onDragStart(node: NodeItemType, monitor: DragSourceMonitor) {
    onChildDragStart();

    if (!itemDraggingRef.current && ItemTypeEnum.PORT === node.type) {
      const { x, y } = monitor.getInitialClientOffset();
      const item = update(node, {
        rect: {
          $set: {
            height: node.rect.height,
            left: x,
            top: y,
            width: node.rect.width,
          },
        },
      });

      itemDraggingRef.current = item;
      const connection = createConnection(
        item,
        update(item, {
          id: { $set: randomSimpleHashGenerator() },
        }),
      );
      setConnectionsDragging({ [connectionUUID(connection)]: connection });

      console.log('onDragStart', item);
    }
  }

  function onDragging(node: NodeItemType, monitor: DropTargetMonitor) {
    let rectOrigin = node?.rect;

    if (
      ItemTypeEnum.PORT === node.type &&
      itemDraggingRef.current &&
      getNodeUUID(node) === getNodeUUID(itemDraggingRef?.current)
    ) {
      rectOrigin = itemDraggingRef?.current?.rect;
    }

    onDrag(update(node, { rect: { $set: rectFromOrigin(rectOrigin, monitor) } }));
  }

  function updateItem(item: DragItem) {
    setItems({ [item.id]: item });
    onDrag(item);
  }

  function resetAfterDrop() {
    itemDraggingRef.current = null;
    setConnectionsDragging(null);
  }

  function onDrop(node: NodeItemType, monitor: DropTargetMonitor) {
    onChildDragEnd?.();
    resetAfterDrop();

    const delta = monitor.getDifferenceFromInitialOffset() as {
      x: number;
      y: number;
    };

    let left = Math.round(node?.rect?.left + delta.x);
    let top = Math.round(node?.rect?.top + delta.y);

    const screenX = window.innerWidth;
    const screenY = window.innerHeight;
    const itemWidth = node?.rect?.width;
    const itemHeight = node?.rect?.height;

    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left + itemWidth > screenX) left = screenX - itemWidth;
    if (top + itemHeight > screenY) top = screenY - itemHeight;

    if (snapToGridOnDrag) {
      [left, top] = snapToGrid(
        {
          x: left,
          y: top,
        },
        {
          height: 100,
          width: 100,
        },
      );
    }

    const item = update(node, {
      rect: {
        $merge: {
          left,
          top,
        },
      },
    });

    console.log('onDrop', item);
    updateItem(item);
  }

  const onDropNode = useCallback(
    (dragTarget: NodeItemType, dropTarget: NodeItemType) => {
      onChildDragEnd?.();

      if (ItemTypeEnum.PORT === dragTarget.type && ItemTypeEnum.PORT === dropTarget.type) {
        const node = itemDraggingRef.current;
        const connection = createConnection(
          update(node, {
            parent: { $set: items?.[(node as PortType)?.parent?.id] },
          }),
          update(dropTarget, {
            parent: { $set: items?.[(dropTarget as PortType)?.parent?.id] },
          }),
        );
        setConnections({ [connectionUUID(connection)]: connection });
        console.log('onDropNode', connection);
      }

      resetAfterDrop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, onChildDragEnd],
  );

  function onDragCancel(node: NodeItemType) {
    console.log('onDragCancel', node);
    resetAfterDrop();
  }

  function onPortMount(item: PortType, itemRef: React.RefObject<HTMLDivElement>) {
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      const port = update(item, {
        rect: {
          $set: {
            height: rect.height,
            left: rect.left,
            top: rect.top,
            width: rect.width,
          },
        },
      });

      portsRef.current = update(portsRef.current, {
        [getNodeUUID(port)]: { $set: port },
      });

      // console.log(portsRef.current, Object.keys(portsRef.current).length);
      // console.log(connectionsRef.current, Object.keys(connectionsRef.current).length);

      const ready = Object.values(connectionsRef?.current || {})?.every(
        (connection: ConnectionType) => {
          const { fromItem, toItem } = connection;

          if (
            !fromItem ||
            !toItem ||
            (ItemTypeEnum.PORT !== fromItem?.type && ItemTypeEnum.PORT !== toItem?.type)
          ) {
            return true;
          }

          const connReady = [fromItem, toItem].every((item: PortType) => {
            const uuid = getNodeUUID(item);
            const port = portsRef?.current?.[uuid];
            return (
              port &&
              ['left', 'height', 'top', 'width'].every((key: string) => port?.rect?.[key] ?? false)
            );
          });

          if (connReady) {
            const connectionUpdated = update(connection, {
              fromItem: { $set: portsRef?.current?.[getNodeUUID(fromItem)] },
              toItem: { $set: portsRef?.current?.[getNodeUUID(toItem)] },
            });
            connectionsRef.current = update(connectionsRef.current, {
              [connectionUUID(connectionUpdated)]: { $set: connectionUpdated },
            });
          }

          return connReady;
        },
      );

      if (ready) {
        console.log(portsRef.current);
        console.log(connectionsRef.current);
        Object.values(itemsRef?.current || {}).forEach((item: NodeItemType) => {
          updatePaths(item, connectionsRef);
        });
      }
    }
  }

  const [, drop] = useDrop(
    () => ({
      // https://react-dnd.github.io/react-dnd/docs/api/use-drop
      accept: [ItemTypeEnum.BLOCK, ItemTypeEnum.PORT],
      canDrop: (node: NodeItemType, monitor: DropTargetMonitor) => {
        if (!monitor.isOver({ shallow: true })) {
          return false;
        }

        return ItemTypeEnum.BLOCK === node.type;
      },
      drop: (item: DragItem, monitor: DropTargetMonitor) => {
        onDrop(item, monitor);

        return undefined;
      },
      hover: onDragging,
    }),
    [snapToGridOnDrag],
  );

  return (
    <div
      onDoubleClick={(event: React.MouseEvent) =>
        updateItem({
          id: randomSimpleHashGenerator(),
          rect: {
            left: event.clientX,
            top: event.clientY,
          },
          title: randomNameGenerator(),
          type: ItemTypeEnum.BLOCK,
        })
      }
      ref={drop}
    >
      <ConnectionLines>
        {connections &&
          Object.values(connections || {}).map((connection: ConnectionType) => (
            <ConnectionLine connection={connection} key={connectionUUID(connection)} />
          ))}
        {connectionsDragging &&
          Object.values(connectionsDragging || {}).map((connection: ConnectionType) => (
            <ConnectionLine connection={connection} key={connectionUUID(connection)} />
          ))}
      </ConnectionLines>

      {phaseRef.current >= 1 &&
        items &&
        Object.keys(items || items).map(key => (
          <DraggableBlock
            item={items[key] as DragItem}
            key={key}
            layout={layoutConfig}
            onDragCancel={onDragCancel}
            onDragStart={onDragStart}
            onDrop={onDropNode}
            onPortMount={onPortMount}
          />
        ))}
    </div>
  );
};

export default function PipelineBuilderCanvas({
  snapToGridOnDrop = false,
  ...props
}: PipelineBuilderProps & { snapToGridOnDrop?: boolean }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  function setIsDragging(value: boolean) {
    isDraggingRef.current = value;
  }

  useZoomPan(canvasRef, isDraggingRef);

  return (
    <div
      ref={canvasRef}
      style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'visible' }}
    >
      <CanvasStyled>
        <Canvas>
          <PipelineBuilder
            {...props}
            onChildDragEnd={() => setIsDragging(false)}
            onChildDragStart={() => setIsDragging(true)}
          />
          <DragLayer snapToGrid={snapToGridOnDrop} />
        </Canvas>
      </CanvasStyled>
    </div>
  );
}
