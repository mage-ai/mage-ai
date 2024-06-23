import update from 'immutability-helper';
import { Ref, startTransition, useCallback, useEffect, useMemo, useRef, useState, createRef } from 'react';
import { useDrop } from 'react-dnd';
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
  onDragEnd: () => void;
  onDragStart: () => void;
  pipeline: PipelineType | PipelineExecutionFrameworkType;
  pipelineExecutionFramework: PipelineExecutionFrameworkType
  pipelineExecutionFrameworks: PipelineExecutionFrameworkType[];
  pipelines?: PipelineType[];
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
  pipelineExecutionFrameworks,
  pipelines,
  snapToGridOnDrag = true,
  snapToGridOnDrop = true,
  transformState,
}: PipelineBuilderProps) => {
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
    } as LayoutConfigType;

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

  function renderConnectionLines(opts?: {
    direction?: LayoutConfigDirectionEnum;
    origin?: LayoutConfigDirectionOriginEnum;
  }) {
    const { direction, origin } = opts ?? {};
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
      const port1 = portsRef?.current[portID];

      if (port1?.target?.id in (processed[port1?.parent?.id] ?? {})) return;
      if (port1?.parent?.id in (processed[port1?.target?.id] ?? {})) return;

      const item1 = itemsRef?.current[port1?.parent?.id];
      const node1 = itemsByNodeIDMapping[item1?.id];
      const rect1 = item1?.rect;
      const block1 = item1?.block;
      const color1 = getBlockColor(block1?.type, { getColorName: true })?.names?.base;
      const rect1Port = itemElementsRef?.current?.port?.[port1.id]?.current?.getBoundingClientRect();
      const rect1Item = itemElementsRef?.current?.block?.[item1.id]?.current?.getBoundingClientRect();
      const rect1Node = itemElementsRef?.current?.node?.[node1.id]?.current?.getBoundingClientRect();

      const item2 = itemsRef?.current[port1?.target?.id];
      const node2 = itemsByNodeIDMapping[item2?.id];
      const port2 = item2?.ports?.find(({ subtype, target }: PortType) => subtype !== port1?.subtype
        && target.id === item1?.id);
      const rect2 = item2?.rect;
      const block2 = item2?.block;
      const color2 = getBlockColor(block2?.type, { getColorName: true })?.names?.base;
      const rect2Port = itemElementsRef?.current?.port?.[port2.id]?.current?.getBoundingClientRect();
      const rect2Item = itemElementsRef?.current?.block?.[item2.id]?.current?.getBoundingClientRect();
      const rect2Node = itemElementsRef?.current?.node?.[node2.id]?.current?.getBoundingClientRect();

      const values = {
        [port1.id]: {
          color: color1,
          id: port1.id,
          rect: rect1,
          rects: [
            rect1Port,
            rect1Item,
            rect1Node,
          ],
          subtype: port1.subtype,
        },
        [port2.id]: {
          color: color2,
          id: port2.id,
          rect: rect2,
          rects: [
            rect2Port,
            rect2Item,
            rect2Node,
          ],
          subtype: port2.subtype,
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

      function transformRect(rect: RectType, transformState: ZoomPanStateType) {
        const {
          container,
          element,
          position,
        } = transformState ?? {} as ZoomPanStateType;

        const rectContainer = (container?.current ?? {} as HTMLElement)?.getBoundingClientRect();
        const containerWidth = rectContainer.width;
        const containerHeight = rectContainer.height;

        const rectViewport = (element?.current ?? {} as HTMLElement)?.getBoundingClientRect();
        const viewportWidth = rectViewport.width;
        const viewportHeight = rectViewport.height;

        const current = position?.current ?? {} as ZoomPanPositionType;
        const xCur = current?.x?.current ?? 0;
        const yCur = current?.y?.current ?? 0;

        const origin = position?.origin ?? {} as ZoomPanPositionType;
        const xOrg = origin?.x?.current ?? 0;
        const yOrg = origin?.y?.current ?? 0;

        const scale = transformState?.scale?.current ?? 1;

        const { left, top, width, height } = rect;



        const leftOrg = (left + xOrg); // Reset before panning
        const leftFactor = xOrg / (viewportWidth - containerWidth);
        const transformedLeft = leftOrg + ((containerWidth - viewportWidth) * leftFactor);
          // + (xCur - (containerWidth * leftFactor)); // Move to the current position
        // const leftFactor = ((left / containerWidth) * scale);
        // transformedLeft -= viewportWidth * leftFactor;
        // transformedLeft += viewportWidth * leftFactor;


        const topOrg = (top + yOrg); // Reset before panning
        const topFactor = yOrg / (viewportHeight - containerHeight);
        const transformedTop = topOrg + ((containerHeight - viewportHeight) * topFactor);
          // + (yCur - (containerHeight * topFactor)); // Move to the current position
        // const topFactor = ((top / containerHeight) * scale);
        // transformedTop -= viewportHeight * topFactor;
        // transformedTop += viewportHeight * topFactor;

        console.log('origin', xOrg, yOrg);
        console.log('current', xCur, yCur);
        console.log('factor', leftFactor, topFactor);
        console.log('rect', left, top);

        return {
          ...rect,
          height: height * scale,
          left: transformedLeft,
          top: transformedTop,
          width: width * scale,
        };
      }

      function buildRect(values: any) {
        const isOutput = PortSubtypeEnum.OUTPUT === values?.subtype;
        let rect = {
          height: values?.rect?.height ?? 0,
          left: values?.rect?.left ?? 0,
          top: values?.rect?.top ?? 0,
          width: values?.rect?.width ?? 0,
        };

        console.log(0, rect);
        rect = transformState ? transformRect(rect, transformState) : rect;
        console.log(1, rect);

        let leftOffset = 0;
        let topOffset = 0;
        values?.rects?.forEach((parent: DOMRect, idx: number) => {
          console.log(idx, leftOffset, topOffset);
          leftOffset += (parent?.left ?? 0);
          // + (parent?.width ?? 0);
          topOffset += (parent?.top ?? 0);
        });
        // rect.left += leftOffset;
        // rect.top -= topOffset;


        // if (Object.values(values?.rectElements)?.every(Boolean)) {
        //   const {
        //     item,
        //     node, // Need to handle node ports differently.
        //     port,
        //   } = values?.rectElements;

        //   if (isVertical) {
        //     if (isReverse) {

        //     } else {
        //     }
        //   } else {
        //     if (isReverse) {

        //     } else {
        //       rect.top += ((item?.height - port?.height) - (port?.top - item?.top)) / 2;
        //       if (isReverse) {
        //       } else {
        //         if (isOutput) {
        //           rect.left -= ((item?.width - port?.width) - (port?.left - item?.left)) + (port?.width / 2);
        //         } else {
        //           rect.left += (port?.left - item?.left) + (port?.width / 2);
        //         }
        //       }
        //     }
        //   }
        // }

        return rect;
      }
      const fromRect = buildRect(fromValues);
      const toRect = buildRect(toValues);

      const fromPosition = isVertical ? 'top' : 'right';
      const toPosition = isVertical ? 'bottom' : 'left';
      const dValue = getPathD({
        curveControl: 0,
        fromPosition: isReverse ? toPosition : fromPosition,
        toPosition: isReverse ? fromPosition : toPosition,
      }, fromRect, toRect);

      const portIDsCombined = [fromPort?.id, toPort?.id].sort().join('-');
      const gradientID = `${portIDsCombined}-grad`;
      const colors = [
        fromValues?.color,
        fromValues?.color && toValues?.color && fromValues?.color !== toValues?.color
          ? toValues?.color
          : null,
        ].filter(Boolean);

      if (colors?.length) {

      }
      paths[gradientID] = (
        <defs key={`${gradientID}-defs`}>
          <linearGradient id={gradientID} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" style={{ stopColor: `var(--colors-${colors[0]})`, stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: `var(--colors-${colors[1]})`, stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      );

      connectionLinesPathRef.current[portIDsCombined] ||= createRef();
      const pathRef = connectionLinesPathRef.current[portIDsCombined];

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
    });

    connectionLineRootRef.current ||= createRoot(element);
    connectionLineRootRef.current.render(
      <ConnectionLines>
        {Object.values(paths)}
      </ConnectionLines>,
    );
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

    renderConnectionLines({
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
    });
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

    if (id in connectionsRef.current) {
      const conn = connectionsRef.current[id];
      conn.fromItem = port;
      connectionsRef.current[id] = conn;
    }

    renderConnectionLines({
      direction: layoutConfig?.direction,
      origin: layoutConfig?.origin,
    });
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
      <CanvasContainer gridSize={GRID_SIZE} ref={containerRef}>
        <DragLayer snapToGrid={snapToGridOnDrag} />
        <div id={connectionLinesRootID('nodes')} />
        {nodesMemo}
      </CanvasContainer>
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
    initialPosition: {
      xPercent: 0.5,
      yPercent: 0.5,
    },
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
