import update from 'immutability-helper';
import { Ref, startTransition, useCallback, useEffect, useMemo, useRef, useState, createRef } from 'react';
import { useDrop, XYCoord } from 'react-dnd';
import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoot } from 'react-dom/client';

import CanvasContainer from './index.style';
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
  LayoutConfigType,
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
import BlockNodeWrapper from '../../Canvas/Nodes/BlockNodeWrapper';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { snapToGrid } from '../../Canvas/utils/snapToGrid';
import { randomNameGenerator, randomSimpleHashGenerator } from '@utils/string';
import { ConnectionLine } from '../../Canvas/Connections/ConnectionLine';
import { ConnectionLines } from '../../Canvas/Connections/ConnectionLines';
import { getPathD, extractBezierControlPoints } from '../../Canvas/Connections/utils';
import { buildNamesapceForLevel } from './utils/levels';
import { createConnections } from './utils/ports';
import { addRects, calculateBoundingBox, getRectDiff, layoutItemsInGroups, layoutItemsInTreeFormation, transformZoomPanRect } from '../../Canvas/utils/rect';
import { updateAllPortConnectionsForItem, drawLine } from '../../Canvas/utils/connections';
import { createConnection, getConnections, updatePaths } from '../../Canvas/Connections/utils';
import { rectFromOrigin } from './utils/positioning';
import { updateModelsAndRelationships, updateNodeGroupsWithItems } from './utils/nodes';
import { buildPortUUID } from '@components/v2/Canvas/Draggable/utils';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { initializeBlocksAndConnections } from './utils/blocks';
import { extractNestedBlocks, groupBlocksByGroups, buildTreeOfBlockGroups } from '@utils/models/pipeline';
import { buildDependencies } from './utils/pipelines';
import { ZoomPanPositionType, ZoomPanStateType, useZoomPan } from '@mana/hooks/useZoomPan';
import PipelineType from '@interfaces/PipelineType';
import { getBlockColor } from '@mana/themes/blocks';
import { countOccurrences, groupBy, indexBy, flattenArray, zip } from '@utils/array';
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
  canvasRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  pipeline: PipelineType | PipelineExecutionFrameworkType;
  pipelineExecutionFramework: PipelineExecutionFrameworkType
  pipelineExecutionFrameworks: PipelineExecutionFrameworkType[];
  onMouseDown: {
    current: any;
  };
  onMouseUp: {
    current: any;
  };
  pipelines?: PipelineType[];
  snapToGridOnDrag?: boolean;
  snapToGridOnDrop?: boolean;
  transformState: ZoomPanStateType;
};

const PipelineBuilder: React.FC<PipelineBuilderProps> = ({
  canvasRef,
  containerRef,
  onMouseDown: onMouseDownRef,
  onMouseUp: onMouseUpRef,
  pipeline,
  pipelineExecutionFramework,
  pipelineExecutionFrameworks,
  pipelines,
  snapToGridOnDrag = false,
  snapToGridOnDrop = true,
  transformState,
}: PipelineBuilderProps) => {
  const gridDimensions = useMemo(() => ({
    height: GRID_SIZE,
    width: GRID_SIZE,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const layoutConfig: LayoutConfigType = useMemo(
    () => ({
      defaultRect: {
        item: () => ({
          height: 75,
          left: null,
          top: null,
          width: 300,
        }),
      },
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
      origin: LayoutConfigDirectionOriginEnum.LEFT,
      transformState,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [transformState],
  );

  // Control
  const wrapperRef = useRef(null);
  const phaseRef = useRef<number>(0);
  const connectionLineRootRef = useRef(null);
  const connectionLinesPathRef = useRef<Record<string, Record<string, {
    handleUpdatePath: (item: NodeItemType) => void;
    pathRef: React.RefObject<SVGPathElement>;
  }>>>({});

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
  const itemsRef = useRef<ItemMappingType>({});
  const portsRef = useRef<PortMappingType>({});
  const modelLevelsMapping = useRef<ModelMappingType[]>([]);

  // State management
  const [items, setItemsState] = useState<Record<string, NodeItemType>>(null);

  function updateNodeItems(items: ItemMappingType) {
    itemsRef.current = {
      ...itemsRef.current,
      ...Object.entries(items).reduce((acc: ItemMappingType, [id, item]: [string, NodeItemType]) => ({
        ...acc,
        [id]: {
          ...item,
          version: String(Number(item?.version ?? -1) + 1),
        },
      }), {} as ItemMappingType),
    };
  }

  function updatePorts(ports: PortMappingType) {
    portsRef.current = ports;
  }

  function mutateModels(payload?: ModelMappingType) {
    const {
      items,
      ports,
    } = updateModelsAndRelationships({
      itemsRef,
      portsRef,
    }, payload);
    updateNodeItems(items);
    updatePorts(ports);
  }

  function setConnectionsDragging(connectionsDragging: Record<string, ConnectionType>) {
    connectionsDraggingRef.current = connectionsDragging;
  }

  function renderLayoutChanges(opts?: {
    level?: number;
    items?: ItemMappingType;
  }) {
    const itemMapping = opts?.items
      ?? modelLevelsMapping.current[opts.level]?.itemMapping
      ?? {};

    console.log('Updating items:', itemMapping);

    setItemsState(prev => ({
      ...prev,
      ...itemMapping,
    }));
  }

  function updateItemsMetadata(data?: {
    version?: number;
  }) {
    const { version } = data ?? {};
    itemsMetadataRef.current.rect.version = version ?? ((itemsMetadataRef.current.rect.version ?? 0) + 1);
  }

  function updateLayoutOfModels() {
    const layout = {
      boundingRect: canvasRef?.current?.getBoundingClientRect(),
      containerRect: containerRef?.current?.getBoundingClientRect(),
      defaultRect: {
        item: () => ({
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
      transformState,
    } as LayoutConfigType;

    updateNodeItems({
      ...itemsRef.current,
      ...updateNodeGroupsWithItems(itemsRef?.current ?? {}),
    });
    const nodesGroupedArr = [];

    modelLevelsMapping?.current?.forEach((modelMapping: ModelMappingType) => {
      const { itemMapping } = modelMapping;

      const nodeIDs = Object.keys(itemMapping ?? {}) ?? [];

      const nodes = nodeIDs.map(
        (nodeID: string) => (itemsRef.current ?? {})?.[nodeID] as NodeType)?.filter(
          n => ItemTypeEnum.NODE === n?.type,
        );
      const nodesArr = layoutItemsInGroups(nodes, layout);
      nodesGroupedArr.push(...nodesArr);
    });

    nodesGroupedArr?.forEach((node: NodeType) => {
      node?.items?.forEach((itemNode: DragItem) => {
        updateNodeItems({ [itemNode.id]: itemNode });
      });

      updateNodeItems({ [node.id]: node });
    });
  }

  function onDragging({
    currentOffset,
    initialOffset,
    item,
    itemType,
  }: {
    currentOffset: XYCoord,
    initialOffset: XYCoord,
    itemType: ItemTypeEnum;
    item: NodeItemType;
  }) {
    if (!initialOffset || !currentOffset) {
      return;
    }

    let { x, y } = currentOffset;

    if (snapToGridOnDrag) {
      x -= initialOffset.x;
      y -= initialOffset.y;

      [x, y] = snapToGrid({ x, y }, gridDimensions);
      x += initialOffset.x;
      y += initialOffset.y;
    }

    if (ItemTypeEnum.BLOCK === itemType) {
      item?.ports?.forEach(({ id: portID }: PortType) => {
        Object.values(connectionLinesPathRef?.current?.[portID] ?? {})?.forEach(
          ({ handleUpdatePath }: { handleUpdatePath: (item: NodeItemType) => void },
        ) => {
          const port1 = portsRef.current?.[portID];
          handleUpdatePath(update(port1, {
            rect: {
              $merge: {
                left: x + (port1?.rect?.offset?.left ?? 0),
                top: y + (port1?.rect?.offset?.top ?? 0),
              },
            },
          }));
        });
      });
    }
  }

  function renderConnectionLines(opts?: {
    layout?: LayoutConfigType;
    modelMapping?: ModelMappingType;
  }) {
    const {
      layout,
      modelMapping,
    } = opts ?? {};
    const {
      direction,
      origin,
      transformState,
    } = layout ?? layoutConfig;

    const isVertical = LayoutConfigDirectionEnum.VERTICAL === direction;
    const isReverse = (origin ?? false) && [
      LayoutConfigDirectionOriginEnum.BOTTOM,
      LayoutConfigDirectionOriginEnum.RIGHT,
    ].includes(origin);

    const element = document.getElementById(connectionLinesRootID('nodes'));
    if (!element) return;

    const paths = {};
    const processed = {};

    const {
      itemMapping,
      portMapping,
    } = modelLevelsMapping?.current[activeLevel?.current] ?? {};

    const itemsByNodeIDMapping = {};
    Object.keys(itemMapping ?? {})?.forEach((nodeID: string) => {
      const node = itemsRef?.current[nodeID];
      if (!node || ItemTypeEnum.NODE !== node?.type) return;

      (node as NodeType)?.items?.forEach((item: DragItem) => {
        itemsByNodeIDMapping[item.id] = node;
      });
    });

    Object.keys(portMapping ?? {})?.forEach((portID: string) => {
      let port1 = portsRef?.current[portID];

      if (port1?.target?.id in (processed[port1?.parent?.id] ?? {})) return;
      if (port1?.parent?.id in (processed[port1?.target?.id] ?? {})) return;

      // 1
      let item1 = itemsRef?.current[port1?.parent?.id];
      const item1Override = modelMapping?.itemMapping?.[item1?.id];
      item1 = item1Override ?? item1;
      const block1 = item1?.block;
      const color1 = getBlockColor(block1?.type, { getColorName: true })?.names?.base;
      const node1 = itemsByNodeIDMapping[item1?.id];

      // port1
      const port1Override = modelMapping?.portMapping?.[port1.id];
      port1 = port1Override ?? port1;

      // item.rect
      const rect1 = item1Override?.rect ?? item1?.rect;
      const rect1Item = item1Override?.rect
        ?? itemElementsRef?.current?.block?.[item1.id]?.current?.getBoundingClientRect();
      // port.rect
      const rect1Port = port1Override?.rect
        ?? itemElementsRef?.current?.port?.[port1.id]?.current?.getBoundingClientRect();
      // node.rect
      const rect1Node = itemElementsRef?.current?.node?.[node1.id]?.current?.getBoundingClientRect();

      // 2
      let item2 = itemsRef?.current[port1?.target?.id];
      const item2Override = modelMapping?.itemMapping?.[item2?.id];
      item2 = item2Override ?? item2;
      const block2 = item2?.block;
      const color2 = getBlockColor(block2?.type, { getColorName: true })?.names?.base;
      const node2 = itemsByNodeIDMapping[item2?.id];

      // port2
      let port2 = item2?.ports?.find(({ subtype, target }: PortType) => subtype !== port1?.subtype
        && target.id === item1?.id);
      const port2Override = modelMapping?.portMapping?.[port2.id];
      port2 = port2Override ?? port2;

      // item.rect
      const rect2 = item2Override?.rect ?? item2?.rect;
      const rect2Item = item2Override?.rect
        ?? itemElementsRef?.current?.block?.[item2.id]?.current?.getBoundingClientRect();
      // port.rect
      const rect2Port = port2Override?.rect
        ?? itemElementsRef?.current?.port?.[port2.id]?.current?.getBoundingClientRect();
      // node.rect
      const rect2Node = itemElementsRef?.current?.node?.[node2.id]?.current?.getBoundingClientRect();

      const values = {
        [port1.id]: {
          ...port1,
          block: block1,
          color: color1,
          item: item1,
          node: node1,
          rect: rect1,
          rects: {
            item: rect1Item,
            node: rect1Node,
            port: rect1Port,
          },
        },
        [port2.id]: {
          ...port2,
          block: block2,
          color: color2,
          item: item2,
          node: node2,
          rect: rect2,
          rects: {
            item: rect2Item,
            node: rect2Node,
            port: rect2Port,
          },
        },
      };

      const [fromPort, toPort] = [
        PortSubtypeEnum.OUTPUT === port1?.subtype
          ? port1
          : PortSubtypeEnum.OUTPUT === port2?.subtype
            ? port2
            : null,
        PortSubtypeEnum.INPUT === port1?.subtype
          ? port1
          : PortSubtypeEnum.INPUT === port2?.subtype
            ? port2
            : null,
      ];
      const fromValues = values[fromPort?.id];
      const toValues = values[toPort?.id];

      function buildRect(values: any) {
        const rect = {
          height: values?.rect?.height ?? 0,
          left: values?.rect?.left ?? 0,
          top: values?.rect?.top ?? 0,
          width: values?.rect?.width ?? 0,
        };

        // console.log(0, item1?.id, item2?.id, rect);
        // rect = transformState ? transformZoomPanRect(rect, transformState) : rect;

        const scale = Number(transformState?.scale?.current ?? 1);
        let leftOffset = 0;
        let topOffset = 0;
        if (ItemTypeEnum.PORT === values?.type) {
          const isOutput = PortSubtypeEnum.OUTPUT === values?.subtype;

          if (Object.values(values?.rects)?.every(Boolean)) {
            const {
              item,
              // Need to handle node ports differently.
              // node,
              port,
            } = values?.rects;

            if (isVertical) {
              if (isReverse) {

              } else {
              }
            } else {
              if (isReverse) {

              } else {
                topOffset += (
                  (
                    (item?.height - port?.height) - (port?.top - item?.top)
                  ) / 2
                ) / scale;
                if (isReverse) {
                } else {
                  if (isOutput) {
                    leftOffset -= (
                      (
                        (item?.width - port?.width) - (port?.left - item?.left)
                      )
                      + (port?.width / 2)
                    ) / scale;
                  } else {
                    leftOffset += (
                      (port?.left - item?.left) + (port?.width / 2)
                    ) / scale;
                  }
                }
              }
            }
          }
        }

        rect.left += leftOffset;
        rect.top += topOffset;
        // console.log(1, item1?.id, item2?.id, rect);

        return rect;
      }

      const fromRect = buildRect(fromValues);
      const toRect = buildRect(toValues);

      const fromPosition = isVertical ? 'top' : 'right';
      const toPosition = isVertical ? 'bottom' : 'left';
      const pathDOpts = {
        curveControl: 0,
        fromPosition: isReverse ? toPosition : fromPosition,
        toPosition: isReverse ? fromPosition : toPosition,
      } as any;
      const dValue = getPathD(pathDOpts, fromRect, toRect);

      const portIDsCombined = [fromPort?.id, toPort?.id].sort().join('-');
      const gradientID = `${portIDsCombined}-grad`;
      const colors = [
        fromValues?.color,
        fromValues?.color && toValues?.color && fromValues?.color !== toValues?.color
          ? toValues?.color
          : null,
        ].filter(Boolean);

      if (colors?.length >= 2) {
        paths[gradientID] = (
          <defs key={`${gradientID}-defs`}>
            <linearGradient id={gradientID} x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" style={{ stopColor: `var(--colors-${colors[1]})`, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: `var(--colors-${colors[0]})`, stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        );
      }

      const pathRef =
        connectionLinesPathRef?.current?.[fromValues?.id]?.[toValues?.id]?.pathRef ?? createRef();

      function handleUpdatePath(item: NodeItemType) {
        const isOutput = fromValues?.id === item?.id;
        const isInput = toValues?.id === item?.id;
        const dValue = getPathD(
          pathDOpts,
          isOutput ? item?.rect : fromRect,
          isInput ? item?.rect : toRect,
        );

        pathRef?.current?.setAttribute('d', dValue);
      }

      paths[portIDsCombined] = (
        <path
          d={dValue}
          fill="none"
          id={portIDsCombined}
          key={`${portIDsCombined}-path`}
          ref={pathRef}
          stroke={colors?.length >= 2 ? `url(#${gradientID})` : `var(--colors-${colors[0] ?? 'gray'})`}
          style={{
            strokeWidth: 1.5,
          }}
        />
      );

      processed[fromValues.id] ||= {};
      processed[fromValues.id][toValues.id] = portIDsCombined;

      processed[toValues.id] ||= {};
      processed[toValues.id][fromValues.id] = portIDsCombined;

      connectionLinesPathRef.current[fromValues?.id] ||= {};
      connectionLinesPathRef.current[fromValues?.id][toValues?.id] = {
        handleUpdatePath,
        pathRef,
      };

      connectionLinesPathRef.current[toValues?.id] ||= {};
      connectionLinesPathRef.current[toValues?.id][fromValues?.id] = {
        handleUpdatePath,
        pathRef,
      };
    });

    connectionLineRootRef.current ||= createRoot(element);
    connectionLineRootRef.current.render(
      <ConnectionLines>
        {Object.values(paths)}
      </ConnectionLines>,
    );
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

  function handleDoubleClick(event: React.MouseEvent) {
    setActiveLevel();
    renderConnectionLines();
  }

  function handleMouseDown(event: React.MouseEvent, node: NodeItemType, target?: any): boolean {
    if (event.button > 0) return;

    console.log('down');

    return true;
  }

  function handleMouseUp(event: React.MouseEvent, node: NodeItemType, target?: any): boolean {
    resetAfterDrop();

    console.log('up');

    return false;
  }

  function handleDragEnd(event: React.MouseEvent) {

  }

  useEffect(() => {
    onMouseDownRef.current = handleMouseDown;
    onMouseUpRef.current = handleMouseUp;

    const onMouseDownR = onMouseDownRef.current;
    const onMouseUpR = onMouseUpRef.current;

    return () => {
      onMouseDownR.current = null;
      onMouseUpR.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // if (level > 1) {
        //   return;
        // }

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

      const finalLevel = modelLevelsMapping.current.length;
      modelLevelsMapping.current.push(
        initializeBlocksAndConnections(
          Object.values(blockMapping),
          {
            groupMapping: finalLevel >= 1 ? groupLevelsMappingRef?.current?.[finalLevel - 1] : undefined,
          },
          {
          ...layout,
          level: finalLevel,
        }),
      );

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

        renderLayoutChanges({ items: itemsRef?.current });
      });
    }

    phaseRef.current += 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onMountItem(item: DragItem, itemRef: React.RefObject<HTMLDivElement>) {
    const { id, type } = item;
    itemElementsRef.current ||= {};
    itemElementsRef.current[type] ||= {};
    itemElementsRef.current[type][id] = itemRef;

    const rectVersion = itemsMetadataRef.current.rect.version;
    if (!itemRef.current) return;

    if ([ItemTypeEnum.BLOCK, ItemTypeEnum.NODE].includes(type)
      && (!item?.rect || item?.rect?.version <= rectVersion)
    ) {
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

      const shouldUpdate = !previousVersion
        || rect?.width !== rectOld?.width
        || rect?.height !== rectOld?.height;

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

      updateNodeItems({ [item.id]: newItem });

      const arr = Object.values(itemsRef.current || {});
      const versions = arr?.map(({ rect }) => rect?.version ?? 0);

      if (versions?.every((version: number) => version === rectVersion)) {
        if (activeLevel?.current === null) {
          setActiveLevel(0);
          updateLayoutOfModels();
          renderConnectionLines();
          renderLayoutChanges({ items: itemsRef?.current });
        }
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
  }

  function onMountPort(item: PortType, portRef: React.RefObject<HTMLDivElement>) {
    if (!portRef?.current) return;
    const { id, type } = item;

    itemElementsRef.current ||= {};
    itemElementsRef.current[type] ||= {};
    itemElementsRef.current[type][id] = portRef;

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
        [id]: port,
      },
    });

    renderConnectionLines();
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

  function onDragInit(node: NodeItemType, monitor: DropTargetMonitor) {
    // We still probably need this when we are draggin lines from port to port.

    // Called only once when it starts
    updateNodeItems({ [node.id]: node });

    // let rectOrigin = node?.rect;

    if (
      ItemTypeEnum.PORT === node.type &&
      itemDraggingRef.current &&
      buildPortUUID(node) === buildPortUUID(itemDraggingRef?.current)
    ) {
      // rectOrigin = itemDraggingRef?.current?.rect;
    } else {
      renderConnectionLines();
    }

    // onDrag(update(node, { rect: { $set: rectFromOrigin(rectOrigin, monitor) } }));
  }

  function resetAfterDrop() {
    itemDraggingRef.current = null;
    setConnectionsDragging(null);
  }

  function onDropBlock(nodeInit: NodeItemType, monitor: DropTargetMonitor) {
    console.log('onDropBlock', nodeInit?.id);

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

    let leftOffset = 0;
    let topOffset = 0;
    if (snapToGridOnDrop) {
      // TODO (dangerous): This doesn’t apply to the ports; need to handle that separately.
      const [
        xSnapped,
        ySnapped,
      ] = snapToGrid(
        {
          x: left,
          y: top,
        },
        gridDimensions,
      );
      leftOffset = xSnapped - left;
      topOffset = ySnapped - top;
    }

    left += leftOffset;
    top += topOffset;


    const node2 = update(node, {
      rect: {
        $merge: {
          left,
          top,
        },
      },
    });

    const portsUpdated = {};
    node2?.ports?.forEach(({ id: portID }: PortType) => {
      const port1 = portsRef.current[portID];
      const port2 = update(port1, {
        rect: {
          $merge: {
            left: left + (port1?.rect?.offset?.left ?? 0),
            top: top + (port1?.rect?.offset?.top ?? 0),
          },
        },
      });
      portsRef.current[port2.id] = port2;
      portsUpdated[port2.type] ||= {};
      portsUpdated[port2.type][port2.id] = port2;
    });

    const elItem = itemElementsRef.current[node.type][node.id].current;
    if (elItem) {
      elItem.style.transform = `translate(${left}px, ${top}px)`;
    }

    const modelMapping = {
      itemMapping: {
        [node2.id]: node2,
      },
      portMapping: portsUpdated,
    };

    mutateModels(modelMapping);
    renderConnectionLines({ modelMapping });
    renderLayoutChanges({ items: modelMapping.itemMapping });
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
      hover: onDragInit,
    }),
    [],
  );
  connectDrop(canvasRef);

  const nodesMemo = useMemo(() => {
    const arr = [
     ...Object.values(items || {}),
   ];

    return arr?.map((node: NodeType, idx: number) => (
      <BlockNodeWrapper
       frameworkGroups={frameworkGroupsRef?.current}
       handlers={{
         onDragEnd: handleDragEnd,
         onDragStart,
         onDrop: onDropPort,
         onMouseDown: handleMouseDown,
         onMouseUp: handleMouseUp,
       }}
       item={node}
       key={`${node.id}-${node.type}-${idx}`}
       onMountItem={onMountItem}
       onMountPort={onMountPort}
     />
   ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  } , [items]);

  const { boundaryRefs } = transformState;

  return (
    <div
      ref={wrapperRef}
      style={{
        height: '100vh',
        overflow: 'visible',
        position: 'relative',
        width: '100vw',
      }}
    >
      <div
        onDoubleClick={handleDoubleClick}
        ref={canvasRef}
        style={{
          height: 'inherit',
          overflow: 'inherit',
          position: 'inherit',
          width: 'inherit',
        }}
      >
        <CanvasContainer gridSize={GRID_SIZE} ref={containerRef}>
          <DragLayer gridDimensions={gridDimensions} onDragging={onDragging} snapToGrid={snapToGridOnDrag} />

          <div
            id={connectionLinesRootID('nodes')}
            style={{
              height: '100%',
              position: 'absolute',
              width: '100%',
              zIndex: 3,
            }}
          />

          {nodesMemo}

          <div ref={boundaryRefs?.left} style={{
            bottom: 0,
            height: '100vh',
            left: 0,
            position: 'fixed',
            top: 0,
            width: 1,
          }} />
          <div ref={boundaryRefs?.right} style={{
            bottom: 0,
            height: '100vh',
            position: 'fixed',
            right: 0,
            top: 0,
            width: 1,
          }} />
          <div ref={boundaryRefs?.bottom} style={{
            bottom: 0,
            height: 1,
            left: 0,
            position: 'fixed',
            right: 0,
            width: '100vw',
          }} />
          <div ref={boundaryRefs?.top} style={{
            height: 1,
            left: 0,
            position: 'fixed',
            right: 0,
            top: 0,
            width: '100vw',
          }} />
        </CanvasContainer>
      </div>
    </div>
  );
};

export default function PipelineBuilderCanvas(props: PipelineBuilderProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onMouseDownRef = useRef(null);
  const onMouseUpRef = useRef(null);

  const transformState = useZoomPan(canvasRef, {
    containerRef,
    // initialPosition: {
    //   xPercent: 0.5,
    //   yPercent: 0.5,
    // },
    roles: [ElementRoleEnum.DRAGGABLE],
  });

  function handleMouseDown(event: MouseEvent) {
    if (event.button > 0) return;

    const targetElement = event.target as HTMLElement;
    const hasRole = [ElementRoleEnum.DRAGGABLE].some(role =>
      targetElement.closest(`[role="${role}"]`),
    );

    if (onMouseDownRef?.current?.(event)) return;

    console.log('down2');
    if (hasRole) {
      transformState.panning.current.active = true;
    }
  }

  function handleMouseUp(event: MouseEvent) {
    if (event.button > 0) return;

    const targetElement = event.target as HTMLElement;
    const hasRole = [ElementRoleEnum.DRAGGABLE, ElementRoleEnum.DROPPABLE].some(role =>
      targetElement.closest(`[role="${role}"]`),
    );

    if (onMouseUpRef?.current?.(event)) return;

    console.log('up2');
    if (hasRole) {
      transformState.panning.current.active = false;
    }
  }

  useEffect(() => {
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
        onMouseDown={onMouseDownRef}
        onMouseUp={onMouseUpRef}
        transformState={transformState}
      />
    </DndProvider>
  );
}
