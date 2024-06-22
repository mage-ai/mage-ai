import update from 'immutability-helper';
import { Ref, startTransition, useCallback, useEffect, useMemo, useRef, useState, createRef } from 'react';
import { useDrop } from 'react-dnd';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoot } from 'react-dom/client';

import { CanvasStyled } from './index.style';
import {
  DragItem,
  NodeItemType,
  ConnectionType,
  PortType,
  NodeType,
  ConnectionMappingType,
  ItemMappingType,
  PortMappingType,
  BlockMappingType,
  BlocksByGroupType,
  GroupMappingType,
  GroupLevelsMappingType,
  ModelMappingType,
  RectType,
} from '../../Canvas/interfaces';
import {
  ItemTypeEnum,
  LayoutConfigDirectionEnum,
  PortSubtypeEnum,
  LayoutConfigDirectionOriginEnum,
} from '../../Canvas/types';
import PathGradient from '@mana/elements/PathGradient';
import { ElementRoleEnum } from '@mana/shared/types';
import { isDebug } from '@utils/environment';
import { BlockNodeWrapper } from '../../Canvas/Nodes/BlockNodeWrapper';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { snapToGrid } from '../../Canvas/utils/snapToGrid';
import { randomNameGenerator, randomSimpleHashGenerator } from '@utils/string';
import { ConnectionLine } from '../../Canvas/Connections/ConnectionLine';
import { ConnectionLines } from '../../Canvas/Connections/ConnectionLines';
import { getPathD } from '../../Canvas/Connections/utils';
import { buildNamesapceForLevel } from './utils/levels';
import { createConnections } from './utils/ports';
import { addRects, calculateBoundingBox, getRectDiff, layoutItemsInGroups, layoutItemsInTreeFormation } from '../../Canvas/utils/rect';
import { updateAllPortConnectionsForItem, drawLine } from '../../Canvas/utils/connections';
import { createConnection, getConnections, updatePaths } from '../../Canvas/Connections/utils';
import { rectFromOrigin } from './utils/positioning';
import { updateModelsAndRelationships, updateNodeGroupsWithItems } from './utils/nodes';
import { buildPortUUID } from '@components/v2/Canvas/Draggable/utils';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { initializeBlocksAndConnections } from './utils/blocks';
import { extractNestedBlocks, groupBlocksByGroups, buildTreeOfBlockGroups } from '@utils/models/pipeline';
import { buildDependencies } from './utils/pipelines';
import { ZoomPanStateType, useZoomPan } from '@mana/hooks/useZoomPan';
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

function connectionLinesRootID(uuid: string) {
  return `connection-lines-root-${uuid}`;
}

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
  transformState: ZoomPanStateType;
};

const PipelineBuilder: React.FC<PipelineBuilderProps> = ({
  canvasRef,
  containerRef,
  onDragEnd,
  onDragStart: onDragStartProp,
  pipeline,
  pipelineExecutionFramework,
  transformState,
  pipelineExecutionFrameworks,
  pipelines,
  snapToGridOnDrag = true,
  snapToGridOnDrop = true,
}: PipelineBuilderProps) => {
  const layoutConfig = useMemo(
    () => ({
      defaultRect: {
        item: () => ({
          height: 75,
          width: 300,
        }),
      },
      transformRect: {
        block: (rect: RectType) => transformState?.offsetRectToCenter(rect),
        port: (rect: RectType) => transformState?.offsetRectToCenter(rect),
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [transformState],
  );

  // Control
  const phaseRef = useRef<number>(0);
  const connectionLineRootRef = useRef(null);
  const connectionLinesPathRef = useRef<Record<string, React.RefObject<SVGPathElement>>>({});

  // Presentation
  const activeLevel = useRef<number>(null);
  const connectionsDraggingRef = useRef<Record<string, ConnectionType>>({});
  const itemDraggingRef = useRef<NodeItemType | null>(null);
  const itemElementsRef = useRef<Record<string, Record<string, React.RefObject<HTMLDivElement>>>>({});
  const itemsMetadataRef = useRef<Record<string, any>>({ rect: {} });

  // Framework
  const frameworkGroupsRef = useRef<GroupMappingType>({} as GroupMappingType);
  const blocksByGroupRef = useRef<BlocksByGroupType>({} as BlocksByGroupType);
  const groupLevelsMappingRef = useRef<GroupLevelsMappingType>([]);

  // Models
  const connectionsRef = useRef<ConnectionMappingType>({});
  const itemsRef = useRef<ItemMappingType>({});
  const portsRef = useRef<PortMappingType>({});

  const connectionsActiveRef = useRef<ConnectionMappingType>({});
  const itemsActiveRef = useRef<ItemMappingType>({});
  const portsActiveRef = useRef<PortMappingType>({});

  const modelLevelsMapping = useRef<ModelMappingType[]>([]);

  // State management
  const [connections, setConnectionsState] = useState<Record<string, ConnectionType>>(null);
  const [connectionsDragging, setConnectionsDraggingState] =
    useState<Record<string, ConnectionType>>(null);
  const [items, setItemsState] = useState<Record<string, DragItem>>(null);

  function mutateModels(payload?: ModelMappingType) {
    updateModelsAndRelationships({
      connectionsRef,
      itemsRef,
      portsRef,
    }, payload);
  }

  function setConnectionsDragging(connectionsDragging: Record<string, ConnectionType>) {
    connectionsDraggingRef.current = connectionsDragging;
    setConnectionsDraggingState(connectionsDragging);
  }

  function renderLayoutChanges() {
    startTransition(() => {
      setItemsState(itemsRef.current);
      setConnectionsState(connectionsRef.current);
    });
  }

  function updateItemsMetadata(data?: {
    version?: number;
  }) {
    const { version } = data ?? {};
    itemsMetadataRef.current.rect.version = version ?? ((itemsMetadataRef.current.rect.version ?? 0) + 1);
  }

  function updateLayoutOfModels(opts?: {
    level?: number;
    mutateModels?: boolean;
  }) {
    const layout = {
      boundingRect: canvasRef?.current?.getBoundingClientRect(),
      containerRect: containerRef?.current?.getBoundingClientRect(),
      defaultRect: {
        node: () => ({
          height: 75,
          left: 0,
          padding: {
            bottom: 12,
            left: 12,
            right: 12,
            top: 12,
          },
          top: 0,
          width: 300,
        }),
      },
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
      gap: {
        column: 40,
        row: 40,
      },
      transform: transformState,
    };

    itemsRef.current = {
      ...itemsRef.current,
      ...updateNodeGroupsWithItems(itemsRef?.current ?? {}),
    };
    const nodesGroupedArr = [];

    modelLevelsMapping?.current?.forEach((modelMapping: ModelMappingType) => {
      const { itemMapping } = modelMapping;

      const nodeIDs = Object.keys(itemMapping ?? {}) ?? [];

      const nodes = nodeIDs.map(
        (nodeID: string) => (itemsRef.current ?? {})?.[nodeID] as NodeType)?.filter(
          n => ItemTypeEnum.NODE === n?.type,
        );
      const nodesArr = layoutItemsInGroups(nodes, layout);
      false &&
      isDebug() && console.log(
        'nodeIDs', nodeIDs,
        'nodes', nodes,
        connectionsRef?.current,
        nodesArr,
        opts?.mutateModels,
      );
      nodesGroupedArr.push(...nodesArr);
    });

    nodesGroupedArr?.forEach((node: NodeType) => {
      node?.items?.forEach((itemNode: DragItem) => {
        itemsRef.current[itemNode.id] = itemNode;
      });
      itemsRef.current[node.id] = node;
    });
    // renderLayoutChanges();
  }

  function renderConnectionLines() {
    const element = document.getElementById(connectionLinesRootID('nodes'));

    if (!element) return;

    connectionLineRootRef.current ||= createRoot(element);

    connectionLineRootRef.current.render(
      <>
        {Object.entries(portsRef?.current ?? {})?.map(([id, port]: [string, PortType]) => {
          connectionLinesPathRef.current[id] ||= createRef();

          const item = itemsRef?.current[id];
          item?.ports?.forEach((p: PortType) => {
            const port = portsRef?.current[p.id];
            const isInput = port?.subtype === PortSubtypeEnum.INPUT;

            const item2 = itemsRef?.current[port?.target?.id];
            const block2 = item2?.block;

            const fromItem = isInput ? item2 : item;
            const fromBlock = isInput ? block2 : item?.block;
            const fromColor = getBlockColor(fromBlock?.type, { getColorName: true })?.names?.base ?? 'red';
            const fromRect = fromItem?.rect;
            const toItem = isInput ? item : item2;
            const toBlock = isInput ? item?.block : block2;
            const toColor = getBlockColor(toBlock?.type, { getColorName: true })?.names?.base ?? 'purple';
            const toRect = toItem?.rect;

            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!', id, fromColor, toColor, fromRect, toRect);

            connectionLinesPathRef.current[id] ||= createRef();

            const d = getPathD({
              curveControl: 0,
              fromPosition: isInput ? 'right' : 'left',
              toPosition: isInput ? 'left' : 'right',
            }, {
              height: 1000,
              left: 1000,
              top: 1000,
              width: 1000,
            }, {
              height: 1000,
              left: 3000,
              top: 3000,
              width: 1000,
            });

            return  (
              <>
                <defs key={`${id}-defs`}>
                  <linearGradient id={`${id}-grad`} x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" style={{ stopColor: 'var(--colors-red)' }} />
                    <stop offset="100%" style={{ stopColor: 'var(--colors-white)' }} />
                  </linearGradient>
                </defs>
                <path
                  d={d}
                  fill="none"
                  id={id}
                  key={`${id}-path`}
                  ref={connectionLinesPathRef.current[id]}
                  stroke={`url(#${id}-grad)`}
                />
              </>
            );
          });

          const d = getPathD({
            curveControl: 0,
            fromPosition: 'left',
            toPosition: 'right',
          }, {
            height: 10,
            left: 10,
            top: 10,
            width: 10,
          }, {
            height: 100,
            left: 4000,
            top: 4000,
            width: 100,
          });

          console.log(id, d);

          // drawLine
          return  (
            <>
              <defs>
                <linearGradient id={`${id}-grad`} x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" style={{ stopColor: 'var(--colors-red)' }} />
                  <stop offset="100%" style={{ stopColor: 'var(--colors-white)' }} />
                </linearGradient>
              </defs>
              <path
                d={d}
                fill="none"
                id={id}
                ref={connectionLinesPathRef.current[id]}
                stroke={`url(#${id}-grad)`}
              />
            </>
          );
        })}
      </>,
    );

    // const {
    //   connectionMapping,
    // } = createConnections(Object.values(portsRef?.current ?? {}), {
    //   connectionMapping: connectionsRef?.current,
    //   itemMapping: itemsRef?.current,
    // }, { level: activeLevel.current });

    // const linesMap = {
    //   ...connectionMapping,
    //   ...(connectionsRef?.current ?? {}),
    //   ...(connectionsDraggingRef?.current ?? {}),
    // };

    // connectionLineRootRef.current.render(
    //   <>
    //     {console.log(linesMap)}
    //     {Object.values(linesMap).map((connection: ConnectionType) => {
    //       const colorNames = [
    //         connection?.fromItem?.id,
    //         connection?.toItem?.id,
    //       ]?.map((id: string) => {
    //         const item = itemsRef?.current?.[id];
    //         const blockType = item?.block?.type;
    //         return getBlockColor(blockType, { getColorName: true })?.names?.base;
    //       });
    //       return (
    //         <ConnectionLine
    //           connection={connection}
    //           key={connection.id}
    //           stop0ColorName="gray"
    //           stop1ColorName="graymd"
    //         />
    //       );
    //     })}
    //   </>,
    // );

    // mutateModels({
    //   connectionMapping,
    // });

    // Object.values(portsRef?.current ?? {}).forEach((port: PortType) => {
    //   const item = itemsRef?.current?.[port?.parent?.id];
    //   updateAllPortConnectionsForItem(item, {
    //     connectionsRef,
    //     itemsRef,
    //     portsRef,
    //   });
    // });
  }

  function setActiveLevel(opts?: {
    level?: number;
    skipUpdateLayout?: boolean;
    mutateModels?: boolean;
  }) {
    const {
      level: levelArg,
      skipUpdateLayout,
      mutateModels,
    } = opts ?? {};

    console.log(connections);

    const levelPrevious: number = activeLevel.current;
    levelPrevious !== null
      && containerRef?.current?.classList.remove(stylesBuilder[`level-${levelPrevious}-active`]);

    let level: number = levelArg ?? ((activeLevel?.current ?? 0) + 1);
    if (level >= modelLevelsMapping?.current?.length) {
      level = 0;
    }

    activeLevel.current = level;
    containerRef?.current?.classList.add(stylesBuilder[`level-${level}-active`]);

    !skipUpdateLayout && updateLayoutOfModels({
      level,
      mutateModels,
    });

    modelLevelsMapping?.[activeLevel?.current]?.itemMapping?.forEach((item: DragItem) => {
      onDrag(itemsRef.current[item.id]);
    });

    console.log('level:', activeLevel?.current);

    renderConnectionLines();
  }

  function handleDoubleClick(event: React.MouseEvent) {
    setActiveLevel({
      mutateModels: true,
    });
  }

  useEffect(() => {
    if (phaseRef.current === 0) {
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

      const boundingRect = canvasRef?.current?.getBoundingClientRect();
      const rectCon = containerRef?.current?.getBoundingClientRect();
      const layout = {
        layout: {
          ...layoutConfig,
          boundingRect,
          containerRect: rectCon,
        },
      };

      // Presentation
      updateItemsMetadata();

      // Framework
      blocksByGroupRef.current = blocksByGroup;
      groupLevelsMappingRef.current = groupLevelsMapping;
      frameworkGroupsRef.current = groupMapping;

      // Models
      groupLevelsMappingRef?.current?.forEach((groupMapping: GroupMappingType, level: number) => {
        if (level > 1) {
          return;
        }

        modelLevelsMapping.current.push(
          initializeBlocksAndConnections(
            Object.values(groupMapping),
            {
              groupMapping: level >= 1 ? groupLevelsMappingRef?.current?.[level - 1] : undefined,
            },
            {
              layout,
              level,
            } as any,
          ),
        );
      });

      // const finalLevel = modelLevelsMapping.current.length;
      // modelLevelsMapping.current.push(
      //   initializeBlocksAndConnections(
      //     Object.values(blockMapping),
      //     {
      //       groupMapping: finalLevel >= 1 ? groupLevelsMappingRef?.current?.[finalLevel - 1] : undefined,
      //     },
      //     {
      //     ...layout,
      //     level: finalLevel,
      //   }),
      // );

      startTransition(() => {
        const {
          connectionMapping,
          itemMapping,
          portMapping,
        } = modelLevelsMapping.current.reduce((acc, mapping) => {
          const {
            connectionMapping,
            itemMapping,
            portMapping,
          } = mapping;

          return {
            connectionMapping: {
              ...acc.connectionMapping,
              ...connectionMapping,
            },
            itemMapping: {
              ...acc.itemMapping,
              ...itemMapping,
            },
            portMapping: {
              ...acc.portMapping,
              ...portMapping,
            },
          };
        }, {
          connectionMapping: {} as ConnectionMappingType,
          itemMapping: {} as ItemMappingType,
          portMapping: {} as PortMappingType,
        });

        false && isDebug() && console.log(
          itemMapping,
          portMapping,
          connectionMapping,
        );

        mutateModels({
          connectionMapping,
          itemMapping,
          portMapping,
        });

        renderLayoutChanges();
      });
    }

    phaseRef.current += 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onDrag(item: NodeItemType) {
    updateAllPortConnectionsForItem(ItemTypeEnum.BLOCK === item.type
      ? item
      : (item as PortType).parent
    , {
      connectionsRef,
      itemsRef,
      portsRef,
    });
  }

  function onMountItem(item: DragItem, itemRef: React.RefObject<HTMLDivElement>) {
    const rectVersion = itemsMetadataRef.current.rect.version;
    const { id, type } = item;

    if (!itemRef.current) return;

    if ([ItemTypeEnum.BLOCK, ItemTypeEnum.NODE].includes(type)) {
      if (item?.rect?.version === rectVersion) return;
      const previousVersion = (item?.rect?.version ?? -1) >= 0;
      const rectOld = item?.rect;
      const rect = itemRef.current.getBoundingClientRect() as RectType;
      rect.id = item.id;

      const defaultPositions:
        RectType = (layoutConfig?.transformRect?.[type]?.(rect as RectType) ?? rect) ?? {
          left: undefined,
          top: undefined,
        };

      const elementBadge = itemRef?.current?.querySelector(`#${item.id}-badge`);
      const rectBadge =
        elementBadge?.getBoundingClientRect()
          ?? { height: 0, left: 0, top: 0, width: 0 };
      const elementTitle = itemRef?.current?.querySelector(`#${item.id}-title`);
      const rectTitle =
        elementTitle?.getBoundingClientRect()
          ?? { height: 0, left: 0, top: 0, width: 0 };

      const shouldUpdate = !previousVersion || rect?.width !== rectOld?.width || rect?.height !== rectOld?.height;
      let newItem = update(item, {
        rect: {
          $set: {
            diff: item?.rect,
            height: shouldUpdate ? rect.height : rectOld?.height,
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
            left: previousVersion ? rectOld?.left : (defaultPositions?.left ?? 0),
            offset: {
              left: itemRef?.current?.offsetLeft,
              top: itemRef?.current?.offsetTop,
            },
            top: previousVersion ? rectOld?.top : (defaultPositions?.top ?? 0),
            version: rectVersion,
            width: shouldUpdate ? rect.width : rectOld?.width,
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
        if (activeLevel?.current === null) {
          // console.log('onMountItem.setActiveLevel', item, activeLevel?.current);
          setActiveLevel({ level: 0 });
        } else {
          // console.log('onMountItem.updateLayoutOfModels', item, activeLevel?.current);
          updateLayoutOfModels({ mutateModels: true });
        }
        // console.log('onMountItem.renderLayoutChanges', item, activeLevel?.current);
        renderLayoutChanges();
      }
    }

    if (ItemTypeEnum.NODE === type) {
      const node = itemsRef?.current?.[id];

      if (node?.rect) {
        const { rect } = node;

        itemRef.current.style.height = `${rect?.height}px`;
        itemRef.current.style.width = `${rect?.width}px`;
      }
    }

    if (!itemElementsRef?.current) {
      itemElementsRef.current = {};
    }

    itemElementsRef.current[type] ||= {};
    itemElementsRef.current[type][id] = itemRef;
  }

  function onMountPort(item: PortType, portRef: React.RefObject<HTMLDivElement>) {
    if (portRef.current) {
      const rect = portRef.current.getBoundingClientRect();
      const rectDef = layoutConfig?.transformRect?.[ItemTypeEnum.PORT]?.(rect) ?? rect;

      const port = update(item, {
        rect: {
          $set: {
            height: rect.height,
            left: rect.left + (rectDef?.left ?? 0),
            offset: {
              left: portRef?.current?.offsetLeft,
              top: portRef?.current?.offsetTop,
            },
            top: rect.top + (rectDef?.top ?? 0),
            width: rect.width,
          },
        },
      });

      mutateModels({
        portMapping: {
          [port.id]: port,
        },
      });

      if (port.id in connectionsRef.current) {
        const conn = connectionsRef.current[port.id];
        conn.fromItem = port;
        connectionsRef.current[port.id] = conn;
      }

      console.log('PORT MOUNT!!!!!!!!!!!!', portsRef?.current?.[port.id],
        itemsRef?.current?.[port.parent?.id],
        connectionsRef?.current?.[port.id],
      );
      updateAllPortConnectionsForItem(port?.parent, { connectionsRef, itemsRef, portsRef });
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
    itemsRef.current[node.id].rect = node?.rect;

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

  function resetAfterDrop() {
    itemDraggingRef.current = null;
    setConnectionsDragging(null);
  }

  function onDropBlock(nodeInit: NodeItemType, monitor: DropTargetMonitor) {
    console.log('nodeInit', nodeInit, nodeInit?.rect);

    const node = itemsRef.current[nodeInit.id];

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

    mutateModels({
      itemMapping: {
        [node.id]: update(node, {
          rect: {
            $merge: {
              left,
              top,
            },
          },
        }),
      },
    });
    onDrag(itemsRef.current[node.id]);
    itemElementsRef.current[node.type][node.id].current.style.transform = `translate(${left}px, ${top}px)`;
    setItemsState({ ...itemsRef.current });
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

        throw new Error('setConnections({ [connection.id]: connection });');
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

        return true;
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
   ];

    console.log('Re-rendering children...', arr, itemsRef?.current);
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
      onDoubleClick={handleDoubleClick}
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


        <ConnectionLines id={connectionLinesRootID('nodes')} />

        {nodesMemo}
      </CanvasStyled>
    </div>
  );
};

export default function PipelineBuilderCanvas(props: PipelineBuilderProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isZoomPanDisabled, setZoomPanDisabled] = useState(false);

  const transformState = useZoomPan(canvasRef, {
    containerRef,
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
        transformState={transformState}
      />
    </DndProvider>
  );
}
