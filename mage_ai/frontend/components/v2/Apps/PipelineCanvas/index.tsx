import update from 'immutability-helper';
import { createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { CanvasStyled } from './index.style';
import {
  DragItem,
  NodeItemType,
  ConnectionType,
  PortType,
  NodeType,
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
import { getRectDiff, layoutItemsInGroups } from '../../Canvas/utils/rect';
import { updateAllPortConnectionsForItem } from '../../Canvas/utils/connections';
import { createConnection, getConnections, updatePaths } from '../../Canvas/Connections/utils';
import { rectFromOrigin } from './utils/positioning';
import { buildNodeGroups } from './utils/nodes';
import { buildPortUUID } from '@components/v2/Canvas/Draggable/utils';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { initializeBlocksAndConnections } from './utils/blocks';
import { extractNestedBlocks, groupBlocksByGroups, buildTreeOfBlockGroups } from '@utils/models/pipeline';
import { useZoomPan } from '@mana/hooks/useZoomPan';
import PipelineType from '@interfaces/PipelineType';
import { getBlockColor } from '@mana/themes/blocks';
import { countOccurrences, groupBy, indexBy, flattenArray } from '@utils/array';
import { ignoreKeys, objectSize } from '@utils/hash';
import { FocusLevelEnum, FOCUS_LEVELS } from './types';
import PipelineExecutionFrameworkType, {
  PipelineExecutionFrameworkBlockType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';

const GRID_SIZE = 40;

type PipelineBuilderProps = {
  pipeline: PipelineType | PipelineExecutionFrameworkType;
  pipelineExecutionFramework: PipelineExecutionFrameworkType
  pipelineExecutionFrameworks: PipelineExecutionFrameworkType[];
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
  pipelineExecutionFramework,
  pipelineExecutionFrameworks,
  pipelines,
  canvasRef,
  containerRef,
  onDragEnd,
  onDragStart: onDragStartProp,
  snapToGridOnDrop = true,
}: PipelineBuilderProps) => {
  const layoutConfig = useMemo(
    () => ({

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [],
  );

  const connectionsDraggingRef = useRef<Record<string, ConnectionType>>({});
  const connectionsRef = useRef<Record<string, ConnectionType>>({});
  const frameworkGroups = useRef<Record<GroupUUIDEnum, Record<string, any>>>(null);
  const focusLevelRef = useRef<number>(FocusLevelEnum.DEFAULT);
  const itemDraggingRef = useRef<NodeItemType | null>(null);
  const itemsRef = useRef<Record<string, DragItem>>({});
  const itemsMetadataRef = useRef<Record<string, any>>({ rect: {} });
  const nodeItemsRef = useRef<Record<string, NodeType>>({});
  const itemsElementRef = useRef<Record<string, Record<string, React.RefObject<HTMLDivElement>>>>({});
  const phaseRef = useRef<number>(0);
  const pipelinesRef = useRef<Record<string, PipelineType>>({});
  const portsRef = useRef<Record<string, PortType>>({});

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

  function updateItemsMetadata(data?: {
    version?: number;
  }) {
    const { version } = data ?? {};
    itemsMetadataRef.current.rect.version = version ?? ((itemsMetadataRef.current.rect.version ?? 0) + 1);
  }

  useEffect(() => {
    if (phaseRef.current === 0 && pipelines?.length >= 1) {
      const pipelinesMapping = indexBy([
        // ...pipelines,
        ...pipelineExecutionFrameworks,
      ], ({ uuid }) => uuid);
      const blocksMapping = {};
      [
        // ...pipelines,
        ...pipelineExecutionFrameworks,
      ]?.forEach((pipe: PipelineType | PipelineExecutionFrameworkType) => {
        Object.values(
          extractNestedBlocks(pipe, pipelinesMapping) || {},
        )?.forEach((block: BlockType) => {
          blocksMapping[block.uuid] = ignoreKeys(block, ['pipeline']);
        });
      });

      const { connectionsMapping, itemsMapping, portsMapping } = initializeBlocksAndConnections(
        Object.values(blocksMapping),
        {
          layout: {
            ...layoutConfig,
            boundingRect: canvasRef?.current?.getBoundingClientRect(),
            containerRect: containerRef?.current?.getBoundingClientRect(),
          },
        },
      );

      const blocksFrameworkMapping = Object.values(extractNestedBlocks(
        pipelineExecutionFramework,
        indexBy(pipelineExecutionFrameworks, (p: PipelineExecutionFrameworkType) => p.uuid),
      ));
      frameworkGroups.current = groupBlocksByGroups(blocksFrameworkMapping);

      connectionsRef.current = connectionsMapping;
      pipelinesRef.current = pipelinesMapping;
      portsRef.current = portsMapping;
      updateItemsMetadata();

      setItems(itemsMapping);
      setConnections(connectionsMapping);
    }

    phaseRef.current += 1;

    return () => {
      phaseRef.current = 0;
      focusLevelRef.current = 0;

      connectionsDraggingRef.current = {};
      connectionsRef.current = {};
      frameworkGroups.current = null;
      itemDraggingRef.current = null;
      itemsRef.current = {};
      itemsMetadataRef.current = {
        rect: {},
      };
      nodeItemsRef.current = {};
      phaseRef.current = 0;
      pipelinesRef.current = {};
      portsRef.current = {};
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelines, layoutConfig]);

  function onDrag(item: NodeItemType) {
    updateAllPortConnectionsForItem(ItemTypeEnum.BLOCK === item.type
      ? item
      : (item as PortType).parent
    , connectionsRef, portsRef);
  }

  function setFocusLevel(level: FocusLevelEnum) {
    focusLevelRef.current = level;

    Object.entries(
      itemsElementRef?.current || {},
    )?.forEach(([itemType, mapping]: [ItemTypeEnum, Record<string, React.RefObject<HTMLDivElement>>]) => {
      Object.entries(mapping)?.forEach(([id, elementRef]: [string, React.RefObject<HTMLDivElement>]) => {
        const item = itemsRef?.current?.[id];
        if (!item || !elementRef?.current) return;

        elementRef?.current?.classList?.add(styles[String(itemType)]);

        FOCUS_LEVELS.forEach((focusLevel: FocusLevelEnum) => {
          const className = styles[`focus-level-${focusLevel}`];
          focusLevel === level
            ? elementRef?.current?.classList?.add(className)
            : elementRef?.current?.classList?.remove(className);
        });
      });
    });
  }

  function onMountItem(item: DragItem, itemRef: React.RefObject<HTMLDivElement>) {
    const rectVersion = itemsMetadataRef.current.rect.version;
    const { id, type } = item;

    if (!itemRef.current) return;

    if (ItemTypeEnum.BLOCK === type) {
      if (item?.rect?.version === rectVersion) return;

      const rect = itemRef.current.getBoundingClientRect();

      const newItem = update(item, {
        rect: {
          $set: {
            diff: item?.rect,
            height: rect.height,
            left: rect.left,
            offset: {
              left: itemRef?.current?.offsetLeft,
              top: itemRef?.current?.offsetTop,
            },
            top: rect.top,
            version: rectVersion,
            width: rect.width,
          },
        },
      });

      itemsRef.current[id] = newItem;

      const arr = Object.values(itemsRef.current || {});
      const versions = arr?.map(({ rect }) => rect?.version ?? 0);

      if (versions?.every((version: number) => version === rectVersion)) {
        const [nodes] = buildNodeGroups(arr);
        const nodesGroupedArr = layoutItemsInGroups(nodes, {
          boundingRect: canvasRef?.current?.getBoundingClientRect(),
          containerRect: containerRef?.current?.getBoundingClientRect(),
          direction: LayoutConfigDirectionEnum.HORIZONTAL,
          gap: {
            column: 100,
            row: 100,
          },
          origin: LayoutConfigDirectionOriginEnum.LEFT,
        });

        const itemsMapping = {};
        const nodesGrouped = {};
        nodesGroupedArr?.forEach((node: NodeType) => {
          node?.items?.forEach((itemNode: DragItem) => {
            itemsMapping[itemNode.id] = itemNode;
          });
          nodesGrouped[node.id] = node;
        });

        itemsRef.current = itemsMapping;
        nodeItemsRef.current = nodesGrouped;
        setItems(itemsRef.current);
        setFocusLevel(FocusLevelEnum.GROUPS);
      }
    } else if (ItemTypeEnum.NODE === type) {
      const node = nodeItemsRef?.current?.[id];

      if (node?.rect) {
        // NodeWrapper is already translating the x and y based on the node’s rect attribute.
        const { rect } = node;

        itemRef.current.style.height = `${rect?.height}px`;
        itemRef.current.style.width = `${rect?.width}px`;

        // console.log(`onMountItem Node: ${node.id}`, rect);
      }
    }

    if (!itemsElementRef?.current) {
      itemsElementRef.current = {};
    }

    itemsElementRef.current[type] ||= {};
    itemsElementRef.current[type][id] = itemRef;
  }

  function onMountPort(item: PortType, portRef: React.RefObject<HTMLDivElement>) {
    if (portRef.current) {
      const rect = portRef.current.getBoundingClientRect();

      const port = update(item, {
        rect: {
          $set: {
            height: rect.height,
            left: rect.left,
            offset: {
              left: portRef?.current?.offsetLeft,
              top: portRef?.current?.offsetTop,
            },
            top: rect.top,
            width: rect.width,
          },
        },
      });

      portsRef.current[port.id] = port;
      if (port.id in connectionsRef.current) {
        const conn = connectionsRef.current[port.id];
        conn.fromItem = port;
        connectionsRef.current[port.id] = conn;
      }
      updateAllPortConnectionsForItem(port?.parent, connectionsRef, portsRef);
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

  const [, connectDrop] = useDrop(
    () => ({
      // https://react-dnd.github.io/react-dnd/docs/api/use-drop
      accept: [ItemTypeEnum.BLOCK, ItemTypeEnum.NODE, ItemTypeEnum.PORT],
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

  const nodesMemo = useMemo(() => {
    const arr = [
     ...Object.values(items || {}),
     ...Object.values(nodeItemsRef?.current || {}),
   ];

    return arr?.map((node: NodeType, idx: number) => (
      <BlockNodeWrapper
       frameworkGroups={frameworkGroups?.current}
       handlers={{
         onDragEnd,
         onDragStart,
         onDrop: onDropPort,
         onMouseDown,
         onMouseUp,
       }}
       item={node}
       key={`${node.id}-${node.type}-${idx}`}
       onMountItem={onMountItem}
       onMountPort={onMountPort}
     />
   ));
  }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  , [items]);

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
