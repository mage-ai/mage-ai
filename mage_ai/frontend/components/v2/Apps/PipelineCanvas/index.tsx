import update from 'immutability-helper';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ConnectionMappingType,
  ItemMappingType,
  NodeItemMappingType,
  PortMappingType,
} from '../../Canvas/interfaces';
import {
  ItemTypeEnum,
  LayoutConfigDirectionEnum,
  LayoutConfigDirectionOriginEnum,
} from '../../Canvas/types';
import { ElementRoleEnum } from '@mana/shared/types';
import { isDebug } from '@utils/environment';
import { BlockNodeWrapper } from '../../Canvas/Nodes/BlockNodeWrapper';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { snapToGrid } from '../../Canvas/utils/snapToGrid';
import { randomNameGenerator, randomSimpleHashGenerator } from '@utils/string';
import { ConnectionLine } from '../../Canvas/Connections/ConnectionLine';
import { ConnectionLines } from '../../Canvas/Connections/ConnectionLines';
import { calculateBoundingBox, getRectDiff, layoutItemsInGroups, layoutItemsInTreeFormation } from '../../Canvas/utils/rect';
import { updateAllPortConnectionsForItem } from '../../Canvas/utils/connections';
import { createConnection, getConnections, updatePaths } from '../../Canvas/Connections/utils';
import { rectFromOrigin } from './utils/positioning';
import { buildNodeGroups } from './utils/nodes';
import { buildPortUUID } from '@components/v2/Canvas/Draggable/utils';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { initializeBlocksAndConnections } from './utils/blocks';
import { extractNestedBlocks, groupBlocksByGroups, buildTreeOfBlockGroups } from '@utils/models/pipeline';
import {
  BlockMappingType,
  BlocksByGroupType,
  GroupMappingType,
  GroupLevelsMappingType,
  buildDependencies } from './utils/pipelines';
import { useZoomPan } from '@mana/hooks/useZoomPan';
import PipelineType from '@interfaces/PipelineType';
import { getBlockColor } from '@mana/themes/blocks';
import { countOccurrences, groupBy, indexBy, flattenArray } from '@utils/array';
import { ignoreKeys, objectSize } from '@utils/hash';
import PipelineExecutionFrameworkType, {
  PipelineExecutionFrameworkBlockType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';

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
  snapToGridOnDrag?: boolean;
  snapToGridOnDrop?: boolean;
};

const PipelineBuilder: React.FC<PipelineBuilderProps> = ({
  canvasRef,
  containerRef,
  onDragEnd,
  onDragStart: onDragStartProp,
  pipeline,
  pipelineExecutionFramework,
  pipelineExecutionFrameworks,
  pipelines,
  snapToGridOnDrag = true,
  snapToGridOnDrop = true,
}: PipelineBuilderProps) => {
  const layoutConfig = useMemo(
    () => ({

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [],
  );

  // Control
  const phaseRef = useRef<number>(0);

  // Presentation
  const activeLevel = useRef<number>(null);
  const connectionsDraggingRef = useRef<Record<string, ConnectionType>>({});
  const itemDraggingRef = useRef<NodeItemType | null>(null);
  const itemsElementRef = useRef<Record<string, Record<string, React.RefObject<HTMLDivElement>>>>({});
  const itemsMetadataRef = useRef<Record<string, any>>({ rect: {} });

  // Framework
  const frameworkGroupsRef = useRef<GroupMappingType>({} as GroupMappingType);
  const blocksByGroupRef = useRef<BlocksByGroupType>({} as BlocksByGroupType);
  const groupLevelsMappingRef = useRef<GroupLevelsMappingType>([]);

  // Models
  const connectionsRef = useRef<ConnectionMappingType>({});
  const itemsRef = useRef<ItemMappingType>({});
  const nodeItemsRef = useRef<NodeItemMappingType>({});
  const portsRef = useRef<PortMappingType>({});

  const connectionsActiveRef = useRef<ConnectionMappingType>({});
  const itemsActiveRef = useRef<ItemMappingType>({});
  const nodeItemsActiveRef = useRef<NodeItemMappingType>({});
  const portsActiveRef = useRef<PortMappingType>({});

  const modelLevelsMapping = useRef<{
    connectionsMapping: ConnectionMappingType;
    itemsMapping: ItemMappingType;
    nodeItemsMapping?: NodeItemMappingType;
    portsMapping: PortMappingType;
  }[]>([]);

  // State management
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

  function setItems(items: Record<string, DragItem>) {
    itemsRef.current = items;
    setItemsState(prev => ({ ...prev, ...items }));
    setConnections(connectionsRef.current);
  }

  function setPorts(portsMapping: PortMappingType) {
    portsRef.current = portsMapping;
  }

  function setConnectionsDragging(connectionsDragging: Record<string, ConnectionType>) {
    connectionsDraggingRef.current = connectionsDragging;
    setConnectionsDraggingState(connectionsDragging);
  }

  function updateItemsMetadata(data?: {
    version?: number;
  }) {
    const { version } = data ?? {};
    itemsMetadataRef.current.rect.version = version ?? ((itemsMetadataRef.current.rect.version ?? 0) + 1);
  }

  useEffect(() => {
    if (phaseRef.current === 0 && pipelines?.length >= 1) {
      const {
        blockMapping,
        blocksByGroup,
        groupLevelsMapping,
        groupMapping,
      } = buildDependencies(
        pipelineExecutionFramework,
        pipelineExecutionFrameworks,
        pipeline,
        pipelines,
      );

      const layout = {
        layout: {
          ...layoutConfig,
          boundingRect: canvasRef?.current?.getBoundingClientRect(),
          containerRect: containerRef?.current?.getBoundingClientRect(),
        },
      };

      // Presentation
      updateItemsMetadata();

      // Framework
      blocksByGroupRef.current = blocksByGroup;
      groupLevelsMappingRef.current = groupLevelsMapping;
      frameworkGroupsRef.current = groupMapping;

      // Models
      groupLevelsMapping?.forEach((groupMapping: GroupMappingType, level: number) => {
        modelLevelsMapping.current.push(
          initializeBlocksAndConnections(
            Object.values(groupMapping),
            { ...layout, level, namespace: `level_${level}` },
          ),
        );
      });
      modelLevelsMapping.current.push(
        initializeBlocksAndConnections(Object.values(blockMapping), {
          ...layout,
          level: modelLevelsMapping.current.length,
          namespace: `level_${modelLevelsMapping.current.length}`,
        }),
      );

      const {
        connectionsMapping,
        itemsMapping,
        portsMapping,
      } = modelLevelsMapping.current.reduce((acc, mapping) => {
        const {
          connectionsMapping,
          itemsMapping,
          nodeItemsMapping,
          portsMapping,
        } = mapping;

        return {
          connectionsMapping: {
            ...acc.connectionsMapping,
            ...connectionsMapping,
          },
          itemsMapping: {
            ...acc.itemsMapping,
            ...itemsMapping,
          },
          nodeItemsMapping: {
            ...acc.nodeItemsMapping,
            ...nodeItemsMapping,
          },
          portsMapping: {
            ...acc.portsMapping,
            ...portsMapping,
          },
        };
      }, {
        connectionsMapping: {} as ConnectionMappingType,
        itemsMapping: {} as ItemMappingType,
        nodeItemsMapping: {} as NodeItemMappingType,
        portsMapping: {} as PortMappingType,
      });

      startTransition(() => {
        setConnections(connectionsMapping);
        setItems(itemsMapping);
        setPorts(portsMapping);
        setActiveLevel(0);

        console.log(
          itemsMapping,
          portsMapping,
          connectionsMapping,
        );
      });
    }

    phaseRef.current += 1;

    return () => {
      // Control
      phaseRef.current = 0;

      // Presentation
      activeLevel.current = null;
      connectionsDraggingRef.current = {};
      itemDraggingRef.current = null;
      itemsElementRef.current = {};
      itemsMetadataRef.current = { rect: {} };

      // Framework
      frameworkGroupsRef.current = {} as GroupMappingType;
      blocksByGroupRef.current = {} as BlocksByGroupType;
      groupLevelsMappingRef.current = [];

      // Models
      connectionsRef.current = {} as ConnectionMappingType;
      itemsRef.current = {} as ItemMappingType;
      nodeItemsRef.current = {} as NodeItemMappingType;
      portsRef.current = {} as PortMappingType;
      modelLevelsMapping.current = [];

      connectionsActiveRef.current = {} as ConnectionMappingType;
      itemsActiveRef.current = {} as ItemMappingType;
      nodeItemsActiveRef.current = {} as NodeItemMappingType;
      portsActiveRef.current = {} as PortMappingType;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelines, layoutConfig]);

  function onDrag(item: NodeItemType) {
    updateAllPortConnectionsForItem(ItemTypeEnum.BLOCK === item.type
      ? item
      : (item as PortType).parent
    , connectionsRef, portsRef);
  }

  function setActiveLevel(levelArg?: number) {
    const levelPrevious: number = activeLevel.current;
    levelPrevious !== null
      && containerRef?.current?.classList.remove(stylesBuilder[`level-${levelPrevious}-active`]);

    let level: number = levelArg ?? ((activeLevel?.current ?? 0) + 1);
    if (level >= modelLevelsMapping?.current?.length) {
      level = 0;
    }

    activeLevel.current = level;
    containerRef?.current?.classList.add(stylesBuilder[`level-${level}-active`]);
  }

  function onMountItem(item: DragItem, itemRef: React.RefObject<HTMLDivElement>) {
    const rectVersion = itemsMetadataRef.current.rect.version;
    const { id, type } = item;

    if (!itemRef.current) return;

    if (ItemTypeEnum.BLOCK === type) {
      if (item?.rect?.version === rectVersion) return;
      const rect = itemRef.current.getBoundingClientRect();
      const elementBadge = itemRef?.current?.querySelector(`#${item.id}-badge`);
      const rectBadge =
        elementBadge?.getBoundingClientRect()
          ?? { height: 0, left: 0, top: 0, width: 0 };
      const elementTitle = itemRef?.current?.querySelector(`#${item.id}-title`);
      const rectTitle =
        elementTitle?.getBoundingClientRect()
          ?? { height: 0, left: 0, top: 0, width: 0 };

      let newItem = update(item, {
        rect: {
          $set: {
            diff: item?.rect,
            height: rect.height,
            inner: {
              badge: {
                height: rectBadge?.height,
                left: rectBadge?.left,
                top: rectBadge?.top,
                width: rectBadge?.width,
              },
              title: {
                height: rectTitle?.height,
                left: rectTitle?.left,
                top: rectTitle?.top,
                width: rectTitle?.width,
              },
            },
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
      newItem = update(newItem, {
        rect: {
          inner: {
            badge: {
              offset: {
                $set: {
                  // No need to offset it because there is no extra spacing besides the group’s padding.
                  // left: (elementBadge as { offsetLeft?: number })?.offsetLeft,
                  top: (elementBadge as { offsetTop?: number })?.offsetTop,
                },
              },
            },
            title: {
              offset: {
                $set: {
                  // No need to offset it because there is no extra spacing besides the group’s padding.
                  // left: (elementTitle as { offsetLeft?: number })?.offsetLeft,
                  top: (elementTitle as { offsetTop?: number })?.offsetTop,
                },
              },
            },
          },
        },
      });

      itemsRef.current[id] = newItem;

      const arr = Object.values(itemsRef.current || {});
      const versions = arr?.map(({ rect }) => rect?.version ?? 0);

      if (versions?.every((version: number) => version === rectVersion)) {
        const layout = {
          boundingRect: canvasRef?.current?.getBoundingClientRect(),
          containerRect: containerRef?.current?.getBoundingClientRect(),
          defaultRect: {
            node: () => ({
              height: 100,
              left: 0,
              padding: {
                bottom: 12,
                left: 12,
                right: 12,
                top: 12,
              },
              top: 0,
              width: 100,
            }),
          },
          direction: LayoutConfigDirectionEnum.HORIZONTAL,
          gap: {
            column: 40,
            row: 40,
          },
        };

        const [nodes] = buildNodeGroups(arr);
        const nodesGroupedArr = layoutItemsInGroups(nodes, layout);

        // const items2 = layoutItemsInTreeFormation(arr, layout);
        // const itemsMapping = indexBy(items2, ({ id }) => id);

        const itemsMapping = {};
        const nodesGrouped = {};
        nodesGroupedArr?.forEach((node: NodeType) => {
          node?.items?.forEach((itemNode: DragItem) => {
            itemsMapping[itemNode.id] = itemNode;
          });
          nodesGrouped[node.id] = node;
        });

        nodeItemsRef.current = nodesGrouped;
        itemsRef.current = itemsMapping;

        startTransition(() => {
          setItems(itemsRef.current);
        });
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
       frameworkGroups={frameworkGroupsRef?.current}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  } , [items]);

  return (
    <div
      onDoubleClick={(event: React.MouseEvent) => {
        setActiveLevel();
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
        <DragLayer snapToGrid={snapToGridOnDrag} />

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
      </CanvasStyled>
    </div>
  );
};

export default function PipelineBuilderCanvas(props: PipelineBuilderProps) {
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
    <DndProvider backend={HTML5Backend}>
      <PipelineBuilder
        {...props}
        canvasRef={canvasRef}
        containerRef={containerRef}
        onDragEnd={() => setZoomPanDisabled(false)}
        onDragStart={() => setZoomPanDisabled(true)}
      />
    </DndProvider>
  );
}
