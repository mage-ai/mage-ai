import update from 'immutability-helper';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useDrop } from 'react-dnd';

import { CanvasStyled } from './index.style';
import { Canvas } from '../../Canvas';
import { DragItem } from '../../Canvas/interfaces';
import { ItemTypeEnum } from '../../Canvas/types';
import { DraggableBlock } from '../../Canvas/Draggable/DraggableBlock';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { snapToGrid } from '../../Canvas/utils/snapToGrid';
import { randomNameGenerator, randomSimpleHashGenerator } from '@utils/string';
import ConnectionLines from './Connections/ConnectionLines';
import { ConnectionType } from './Connections/interfaces';
import { getConnections, getPathD, createConnection, connectionUUID, updatePaths } from './Connections/utils';

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

  const connectionsRef = useRef<Record<string, ConnectionType>>(null);

  const [connections, setConnectionsState] = useState<Record<string, ConnectionType>>(null);
  const [items, setItemsState] = useState<Record<string, DragItem>>(null);

  function setConnections(connections: Record<string, ConnectionType>) {
    connectionsRef.current = {
      ...connectionsRef.current,
      ...connections,
    };
    setConnectionsState(connectionsRef.current);
  }
  function setItems(items: Record<string, DragItem>) {
    setItemsState(prev => ({ ...prev, ...items }));
    setConnections(connectionsRef.current);
  }

  useEffect(() => {
    if (!items) {
      const itemsMock = {
        a: {
          height: 50,
          id: 'a',
          left: 80,
          title: randomNameGenerator(),
          top: 20,
          type: ItemTypeEnum.BLOCK,
          width: 100,
        },
        b: {
          height: 50,
          id: 'b',
          left: 200,
          title: randomNameGenerator(),
          top: 180,
          type: ItemTypeEnum.BLOCK,
          width: 100,
        },
      };
      setItems(itemsMock);

      const connection = createConnection(itemsMock.a, itemsMock.b);
      setConnections({ [connectionUUID(connection)]: connection });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onDrag(item: DragItem) {
    updatePaths(item, connectionsRef);
  }

  function updateItem(item: DragItem) {
    setItems({ [item.id]: item });
    onDrag(item);
  }

  const [, drop] = useDrop(
    () => ({
      // https://react-dnd.github.io/react-dnd/docs/api/use-drop
      accept: ItemTypeEnum.BLOCK,
      drop(item: DragItem, monitor) {
        const delta = monitor.getDifferenceFromInitialOffset() as {
          x: number
          y: number
        };

        let left = Math.round(item.left + delta.x);
        let top = Math.round(item.top + delta.y);
        if (snapToGridOnDrag) {
          [left, top] = snapToGrid({
            x: left,
            y: top,
          }, { height: 100, width: 100 });
        }

        updateItem({ ...item, left, top });

        return undefined;
      },
      hover: (item, monitor) => {
        const offset = monitor.getClientOffset();
        const initialClientOffset = monitor.getInitialClientOffset();

        const newOffset = monitor.getClientOffset();
        if (offset && newOffset) {
          const dx = newOffset.x - initialClientOffset.x;
          const dy = newOffset.y - initialClientOffset.y;

          onDrag({
            ...item,
            left: Math.round(item.left + dx),
            top: Math.round(item.top + dy),
          });
        }
      },
    }),
    [snapToGridOnDrag],
  );

  return (
    <CanvasStyled
      onDoubleClick={(event: React.MouseEvent) => updateItem({
        id: randomSimpleHashGenerator(),
        left: event.clientX,
        title: randomNameGenerator(),
        top: event.clientY,
        type: ItemTypeEnum.BLOCK,
      })}
      ref={drop}
    >
      {connections && items && (
        <ConnectionLines
          connections={connections}
          items={items}
        />
      )}

      {items && Object.keys(items || items).map((key) => (
        <DraggableBlock
          item={items[key] as DragItem}
          key={key}
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
