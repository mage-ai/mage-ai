import update from 'immutability-helper';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useDrop } from 'react-dnd';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';

import { CanvasStyled } from './index.style';
import { Canvas } from '../../Canvas';
import { DragItem, NodeItemType, OffsetType, RectType } from '../../Canvas/interfaces';
import { ItemTypeEnum } from '../../Canvas/types';
import { DraggableBlock } from '../../Canvas/Draggable/DraggableBlock';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { snapToGrid } from '../../Canvas/utils/snapToGrid';
import { randomNameGenerator, randomSimpleHashGenerator } from '@utils/string';
import { ConnectionLine } from './Connections/ConnectionLine';
import { ConnectionLines } from './Connections/ConnectionLines';
import { ConnectionType } from './Connections/interfaces';
import { createConnection, connectionUUID, updatePaths } from './Connections/utils';
import { rectFromOrigin } from './utils/positioning';
import { getNodeUUID } from '@components/v2/Canvas/Draggable/utils';

type PipelineBuilderProps = {
  snapToGridOnDrag?: boolean;
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
  snapToGridOnDrag = true,
}: PipelineBuilderProps) => {
  console.log('PipelineBuilder render');

  const phaseRef = useRef<number>(0);
  const connectionsRef = useRef<Record<string, ConnectionType>>(null);
  const connectionsDraggingRef = useRef<Record<string, ConnectionType>>(null);

  const [connections, setConnectionsState] = useState<Record<string, ConnectionType>>(null);
  const [connectionsDragging, setConnectionsDraggingState] = useState<Record<string, ConnectionType>>(null);

  const itemDraggingRef = useRef<NodeItemType | null>(null);
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
    setItemsState(prev => ({ ...prev, ...items }));
    setConnections(connectionsRef.current);
  }

  useEffect(() => {
    if (phaseRef.current === 0) {
      const itemsMock = [
        {
          height: 50,
          left: 80,
          top: 20,
          width: 100,
        },
        {
          height: 50,
          left: 200,
          top: 180,
          width: 100,
        },
      ];

      const mapping = itemsMock.reduce((acc: Record<string, DragItem>, rect: RectType) => {
        const id = randomSimpleHashGenerator();
        acc[id] = {
          id,
          rect,
          title: `${id} ${randomNameGenerator()}`,
          type: ItemTypeEnum.BLOCK,
        };

        return acc;
      }, {});

      const connection = createConnection(...Object.values(mapping).slice(0, 2) as [DragItem, DragItem]);
      connectionsRef.current = { [connectionUUID(connection)]: connection };

      setItems(mapping);
    }

    phaseRef.current += 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onDrag(item: NodeItemType) {
    if (ItemTypeEnum.BLOCK === item.type) {
      updatePaths(item, connectionsRef);
    } else if (ItemTypeEnum.PORT === item.type) {
      updatePaths(item, connectionsDraggingRef);
    }
  }

  function onDragStart(node: NodeItemType, monitor: DragSourceMonitor) {
    if (!itemDraggingRef.current && ItemTypeEnum.PORT === node.type) {
      const { x, y } = monitor.getInitialClientOffset();
      const item = {
        ...node,
        rect: {
          height: node.rect.height,
          left: x,
          top: y,
          width: node.rect.width,
        },
      };
      itemDraggingRef.current = item;
      const connection = createConnection(item, {
        ...item,
        id: randomSimpleHashGenerator(),
      });
      setConnectionsDragging({ [connectionUUID(connection)]: connection });

      console.log('onDragStart', item);
    }
  }

  function onDragging(node: NodeItemType, monitor: DropTargetMonitor) {
    let rectOrigin = node?.rect;

    if (ItemTypeEnum.PORT === node.type
      && itemDraggingRef.current
      && getNodeUUID(node) === getNodeUUID(itemDraggingRef?.current)
    ) {
      rectOrigin = itemDraggingRef?.current?.rect;
    }

    onDrag({ ...node, rect: rectFromOrigin(rectOrigin, monitor) });
  }

  function updateItem(item: DragItem) {
    setItems({ [item.id]: item });
    onDrag(item);
  }

  function onDrop(node: NodeItemType, monitor: DropTargetMonitor) {
    itemDraggingRef.current = null;
    setConnectionsDragging(null);

    if (ItemTypeEnum.PORT === node.type) {
      return;
    }

    const delta = monitor.getDifferenceFromInitialOffset() as {
      x: number
      y: number
    };

    let left = Math.round(node?.rect?.left + delta.x);
    let top = Math.round(node?.rect?.top + delta.y);
    if (snapToGridOnDrag) {
      [left, top] = snapToGrid({
        x: left,
        y: top,
      }, { height: 100, width: 100 });
    }

    const item = {
      ...node,
      rect: {
        ...node.rect,
        left,
        top,
      },
    };

    console.log('onDrop', item);
    updateItem(item);
  }

  const [, drop] = useDrop(
    () => ({
      // https://react-dnd.github.io/react-dnd/docs/api/use-drop
      accept: [ItemTypeEnum.BLOCK, ItemTypeEnum.PORT],
      drop: (item: DragItem, monitor: DropTargetMonitor) => {
        onDrop(item, monitor);

        return undefined;
      },
      hover: onDragging,
    }),
    [snapToGridOnDrag],
  );

  return (
    <CanvasStyled
      onDoubleClick={(event: React.MouseEvent) => updateItem({
        id: randomSimpleHashGenerator(),
        rect: {
          left: event.clientX,
          top: event.clientY,
        },
        title: randomNameGenerator(),
        type: ItemTypeEnum.BLOCK,
      })}
      ref={drop}
    >
      <ConnectionLines>
        {connections && Object.values(connections || {}).map((connection: ConnectionType) => (
          <ConnectionLine
            connection={connection}
            key={connectionUUID(connection)}
          />
        ))}
        {connectionsDragging && Object.values(connectionsDragging || {}).map((connection: ConnectionType) => (
          <ConnectionLine
            connection={connection}
            key={connectionUUID(connection)}
          />
        ))}
      </ConnectionLines>

      {items && Object.keys(items || items).map((key) => (
        <DraggableBlock
          item={items[key] as DragItem}
          key={key}
          onDragStart={onDragStart}
        />
      ))}
    </CanvasStyled>
  );
};

export default function PipelineBuilderCanvas({
  snapToGridOnDrop = false,
  ...props
}: PipelineBuilderProps & { snapToGridOnDrop?: boolean }) {
  return (
    <Canvas>
      {/* <Layout /> */}
      <PipelineBuilder {...props} />
      <DragLayer snapToGrid={snapToGridOnDrop} />
    </Canvas>
  );
}
