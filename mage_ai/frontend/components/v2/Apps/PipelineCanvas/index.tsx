import update from 'immutability-helper';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useDrop } from 'react-dnd';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { CanvasStyled } from './index.style';
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
import { ElementRoleEnum } from '@mana/shared/types';
import { BlockNodeWrapper } from '../../Canvas/Nodes/BlockNodeWrapper';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { snapToGrid } from '../../Canvas/utils/snapToGrid';
import { randomNameGenerator, randomSimpleHashGenerator } from '@utils/string';
import { ConnectionLine } from '../../Canvas/Connections/ConnectionLine';
import { ConnectionLines } from '../../Canvas/Connections/ConnectionLines';
import { ConnectionType } from '../../Canvas/Connections/interfaces';
import { createConnection, updatePortConnectionPaths, getConnections, updatePaths } from '../../Canvas/Connections/utils';
import { getTransformedBoundingClientRect } from '../../Canvas/utils/rect';
import { rectFromOrigin } from './utils/positioning';
import { buildPortUUID } from '@components/v2/Canvas/Draggable/utils';
import BlockType from '@interfaces/BlockType';
import { initializeBlocksAndConnections } from './utils/blocks';
import { extractNestedBlocks, groupBlocksByGroups } from './utils/pipelines';
import { useZoomPan } from '@mana/hooks/useZoomPan';
import PipelineType from '@interfaces/PipelineType';
import { getBlockColor } from '@mana/themes/blocks';
import { indexBy } from '@utils/array';
import { objectSize } from '@utils/hash';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
// import styles from '@styles/scss/elements/Path.module.scss';
// import stylesPathGradient from '@styles/scss/elements/PathGradient.module.scss';

const GRID_SIZE = 40;

type PipelineBuilderProps = {
  pipeline: PipelineType;
  pipelineExecutionFramework: PipelineExecutionFrameworkType
  pipelines?: PipelineType[];
  canvasRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragEnd: () => void;
  onDragStart: () => void;
  snapToGridOnDrop?: boolean;
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
  pipeline,
  pipelines,
  pipelineExecutionFramework,
  canvasRef,
  containerRef,
  onDragEnd,
  onDragStart: onDragStartProp,
  snapToGridOnDrop = true,
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
  const [linesMounted, setLinesMounted] = useState<Record<string, boolean>>({});

  const [connections, setConnectionsState] = useState<Record<string, ConnectionType>>(null);
  const [connectionsDragging, setConnectionsDraggingState] =
    useState<Record<string, ConnectionType>>(null);
  const [items, setItemsState] = useState<Record<string, DragItem>>(null);

  const frameworkGroups = useRef<Record<GroupUUIDEnum, Record<string, any>>>(null);

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
    if (phaseRef.current === 0 && pipelines?.length >= 1) {
      const pipelinesMapping = indexBy(pipelines, ({ uuid }) => uuid);
      let blocksMapping = {};
      pipelines?.forEach((pipe) => {
        blocksMapping = {
          ...blocksMapping,
          ...extractNestedBlocks(pipe, pipelinesMapping),
        };
      });

      const { connectionsMapping, itemsMapping, portsMapping } = initializeBlocksAndConnections(
        Object.values(blocksMapping),
        {
          containerRect: containerRef?.current?.getBoundingClientRect(),
          layout: layoutConfig,
        },
      );

      frameworkGroups.current = groupBlocksByGroups(pipelineExecutionFramework);

      connectionsRef.current = connectionsMapping;
      portsRef.current = portsMapping;

      setItems(itemsMapping);
      setConnections(connectionsMapping);
    }

    phaseRef.current += 1;
    console.log('Canvas render', phaseRef.current);

    return () => {
      phaseRef.current = 0;
      connectionsRef.current = null;
      portsRef.current = null;
      itemsRef.current = null;
      connectionsDraggingRef.current = null;
      itemDraggingRef.current = null;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelines, layoutConfig]);

  function onDrag(item: NodeItemType) {
    if (ItemTypeEnum.BLOCK === item.type) {
      const ports = (item?.inputs || [])?.concat(item?.outputs || [])?.map(({ id }) => portsRef.current[id]);
      ports.forEach((port) => {
        const conn = connectionsRef.current[port.id];
        if (conn) {
          updatePortConnectionPaths(port, conn, connectionsRef, item.rect);
        }
      });
    } else if (ItemTypeEnum.PORT === item.type) {
      const conn = connectionsRef.current[item.id];
      if (conn) {
        updatePortConnectionPaths(item as PortType, conn, connectionsDraggingRef);
      }
    }
  }

  function onMouseDown(_event: React.MouseEvent<HTMLDivElement>, _node: NodeItemType) {
    onDragStartProp();
  }

  function onMouseUp(_event: React.MouseEvent<HTMLDivElement>, _node: NodeItemType) {
    onDragEnd();
    resetAfterDrop();
  }

  function onDragStart(_event: React.MouseEvent<HTMLDivElement>, node: NodeItemType) {
    console.log('onDragStart', node?.type);

    if (!itemDraggingRef.current && ItemTypeEnum.PORT === node.type) {
      itemDraggingRef.current = node;
      const connection = createConnection(
        node,
        update(node, {
          id: { $set: randomSimpleHashGenerator() },
        }),
      );
      setConnectionsDragging({ [connection.id]: connection });
    }
  }

  function onDragging(node: NodeItemType, monitor: DropTargetMonitor) {
    // console.log('onDragging', node?.type);

    let rectOrigin = node?.rect;

    if (
      ItemTypeEnum.PORT === node.type &&
      itemDraggingRef.current &&
      buildPortUUID(node) === buildPortUUID(itemDraggingRef?.current)
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

  function onDropBlock(node: NodeItemType, monitor: DropTargetMonitor) {
    resetAfterDrop();

    const delta = monitor.getDifferenceFromInitialOffset() as {
      x: number;
      y: number;
    };

    let left = Math.round(node?.rect?.left + delta.x);
    let top = Math.round(node?.rect?.top + delta.y);

    // Prevents the item from being dragged outside the screen but the screen is larger
    // because of the zooming and panning.
    // const screenX = window.innerWidth;
    // const screenY = window.innerHeight;
    // const itemWidth = node?.rect?.width;
    // const itemHeight = node?.rect?.height;

    // if (left < 0) left = 0;
    // if (top < 0) top = 0;
    // if (left + itemWidth > screenX) left = screenX - itemWidth;
    // if (top + itemHeight > screenY) top = screenY - itemHeight;

    if (snapToGridOnDrop) {
      const [snappedX, snappedY] = snapToGrid(
        {
          x: left,
          y: top,
        },
        {
          height: GRID_SIZE,
          width: GRID_SIZE,
        },
      );
      left = snappedX;
      top = snappedY;
    }

    const item = update(node, {
      rect: {
        $merge: {
          left,
          top,
        },
      },
    });

    updateItem(item);
  }

  const onDropPort = useCallback(
    (dragTarget: NodeItemType, dropTarget: NodeItemType) => {
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
        setConnections({ [connection.id]: connection });
      }

      resetAfterDrop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  function onMountPort(item: PortType, portRef: React.RefObject<HTMLDivElement>) {
    if (portRef.current) {
      const rect = portRef.current.getBoundingClientRect();
      const port = update(item, {
        rect: {
          $set: {
            height: rect.height,
            left: rect.left,
            offsetLeft: portRef?.current?.offsetLeft,
            offsetTop: portRef?.current?.offsetTop,
            top: rect.top,
            width: rect.width,
          },
        },
      });

      console.log(port.id, connectionsRef.current[port.id], objectSize(connectionsRef.current));
      portsRef.current[port.id] = port;

      if (port.id in connectionsRef.current) {
        const conn = connectionsRef.current[port.id];
        conn.fromItem = port;
        connectionsRef.current[port.id] = conn;
        updatePortConnectionPaths(port, conn, connectionsRef);
      }
    }
  }

  const [, connectDrop] = useDrop(
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
        onDropBlock(item, monitor);

        return undefined;
      },
      hover: onDragging,
    }),
    [],
  );
  connectDrop(canvasRef);

  const nodesMemo = useMemo(() => phaseRef.current >= 1
    // && items
    // && objectSize(linesMounted) >= objectSize(connectionsRef?.current)
    && Object.keys(items || items).map(key => (
      <BlockNodeWrapper
        frameworkGroups={frameworkGroups?.current}
        handlers={{
          onDragEnd,
          onDragStart,
          onDrop: onDropPort,
          onMouseDown,
          onMouseUp,
        }}
        item={items[key]}
        key={key}
        onMountPort={onMountPort}
      />
      // eslint-disable-next-line react-hooks/exhaustive-deps
    )), [items, linesMounted]);

  return (
    <>
      <ConnectionLines>
        {connections &&
          Object.values(connections || {}).map((connection: ConnectionType) => (
            <ConnectionLine
              connection={connection}
              key={connection.id}
              stop0ColorName="gray"
              stop1ColorName="graymd"
            />
          ))}
        {connectionsDragging &&
          Object.values(connectionsDragging || {}).map((connection: ConnectionType) => (
            <ConnectionLine
              connection={connection}
              key={connection.id}
              stop0ColorName="gray"
              stop1ColorName="graymd"
            />
          ))}
      </ConnectionLines>

      {nodesMemo}
    </>
  );
};

export default function PipelineBuilderCanvas({
  snapToGridOnDrag = true,
  ...props
}: PipelineBuilderProps & {
  pipeline: PipelineType;
  pipelines?: PipelineType[];
  snapToGridOnDrag?: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isZoomPanDisabled, setZoomPanDisabled] = useState(false);

  useZoomPan(canvasRef, {
    disabled: isZoomPanDisabled,
    roles: [ElementRoleEnum.DRAGGABLE],
  });

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const targetElement = e.target as HTMLElement;
      const hasRole = [ElementRoleEnum.DRAGGABLE].some(role =>
        targetElement.closest(`[role="${role}"]`),
      );

      if (hasRole) {
        setZoomPanDisabled(true);
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      const targetElement = e.target as HTMLElement;
      const hasRole = [ElementRoleEnum.DRAGGABLE, ElementRoleEnum.DROPPABLE].some(role =>
        targetElement.closest(`[role="${role}"]`),
      );

      if (hasRole) {
        setZoomPanDisabled(false);
      }
    };

    const canvasElement = canvasRef.current;

    if (canvasElement) {
      canvasElement.addEventListener('mousedown', handleMouseDown);
      canvasElement.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (canvasElement) {
        canvasElement.removeEventListener('mousedown', handleMouseDown);
        canvasElement.removeEventListener('mouseup', handleMouseUp);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onDoubleClick={(event: React.MouseEvent) => {
        console.log('Add block...');
        // updateItem({
        //   id: randomSimpleHashGenerator(),
        //   rect: {
        //     left: event.clientX,
        //     top: event.clientY,
        //   },
        //   title: randomNameGenerator(),
        //   type: ItemTypeEnum.BLOCK,
        // })
      }}
      ref={canvasRef}
      style={{
        height: '100vh',
        overflow: 'visible',
        position: 'relative',
        width: '100vw',
      }}
    >
      <CanvasStyled ref={containerRef}>
        <DndProvider backend={HTML5Backend}>
          <DragLayer snapToGrid={snapToGridOnDrag} />
          <PipelineBuilder
            {...props}
            canvasRef={canvasRef}
            containerRef={containerRef}
            onDragEnd={() => setZoomPanDisabled(false)}
            onDragStart={() => setZoomPanDisabled(true)}
          />
        </DndProvider>
      </CanvasStyled>
    </div>
  );
}
