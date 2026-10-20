import update from 'immutability-helper';
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  createRef,
} from 'react';
import { useDrop, XYCoord } from 'react-dnd';
import type { DropTargetMonitor } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoot } from 'react-dom/client';

import CanvasContainer from './index.style';
import {
  DragItem,
  NodeItemType,
  PortType,
  NodeType,
  ItemMappingType,
  PortMappingType,
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
import BlockNodeWrapper from '../../Canvas/Nodes/BlockNodeWrapper';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from '@interfaces/PipelineType';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import useContextMenu, {
  MenuItemType,
  RenderContextMenuOptions,
  RemoveContextMenuType,
  RenderContextMenuType,
} from '@mana/hooks/useContextMenu';
import {
  ClientEventType,
  EventOperationEnum,
  EventOperationOptionsType,
} from '@mana/shared/interfaces';
import { ConnectionLines } from '../../Canvas/Connections/ConnectionLines';
import { DragLayer } from '../../Canvas/Layers/DragLayer';
import { ElementRoleEnum } from '@mana/shared/types';
import { ArrowsAdjustingFrameSquare } from '@mana/icons';
import { ZoomPanStateType, useZoomPan } from '@mana/hooks/useZoomPan';
import { buildDependencies } from './utils/pipelines';
import { getBlockColor } from '@mana/themes/blocks';
import { getElementPositionInContainer, layoutItemsInGroups } from '../../Canvas/utils/rect';
import { getPathD } from '../../Canvas/Connections/utils';
import { initializeBlocksAndConnections } from './utils/blocks';
import { snapToGrid } from '../../Canvas/utils/snapToGrid';
import { updateModelsAndRelationships, updateNodeGroupsWithItems } from './utils/nodes';

const GRID_SIZE = 40;

function connectionLinesRootID(uuid: string) {
  return `connection-lines-root-${uuid}`;
}

type PipelineBuilderProps = {
  canvasRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  dragEnabled?: boolean;
  dropEnabled?: boolean;
  pipeline: PipelineType | PipelineExecutionFrameworkType;
  pipelineExecutionFramework: PipelineExecutionFrameworkType;
  pipelineExecutionFrameworks: PipelineExecutionFrameworkType[];
  pipelines?: PipelineType[];
  removeContextMenu: RemoveContextMenuType;
  renderContextMenu: RenderContextMenuType;
  setDragEnabled: (value: boolean) => void;
  setDropEnabled: (value: boolean) => void;
  setZoomPanDisabled: (value: boolean) => void;
  snapToGridOnDrag?: boolean;
  snapToGridOnDrop?: boolean;
  transformState: React.MutableRefObject<ZoomPanStateType>;
};

const PipelineBuilder: React.FC<PipelineBuilderProps> = ({
  canvasRef,
  containerRef,
  dragEnabled,
  dropEnabled,
  pipeline,
  pipelineExecutionFramework,
  pipelineExecutionFrameworks,
  pipelines,
  removeContextMenu,
  renderContextMenu,
  setDragEnabled,
  setDropEnabled,
  setZoomPanDisabled,
  snapToGridOnDrag = false,
  snapToGridOnDrop = true,
  transformState,
}: PipelineBuilderProps) => {
  console.log(JSON.stringify(pipeline));
  console.log(JSON.stringify(pipelines));
  const gridDimensions = useMemo(
    () => ({
      height: GRID_SIZE,
      width: GRID_SIZE,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [],
  );
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
      transformState: transformState?.current,
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [transformState],
  );

  // Control
  const wrapperRef = useRef(null);
  const phaseRef = useRef<number>(0);
  const connectionLineRootRef = useRef(null);
  const connectionLinesPathRef = useRef<
    Record<
      string,
      Record<
        string,
        {
          handleUpdatePath: (item: NodeItemType) => void;
          pathRef: React.RefObject<SVGPathElement>;
        }
      >
    >
  >({});

  // Presentation
  const activeLevel = useRef<number>(null);
  const itemDraggingRef = useRef<NodeItemType | null>(null);
  const itemElementsRef = useRef<Record<string, Record<string, React.RefObject<HTMLDivElement>>>>(
    {},
  );
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
  const [activeItems, setActiveItemsState] = useState<Record<string, ModelMappingType>>(null);

  function updateNodeItems(items: ItemMappingType) {
    // This should be the only setter for itemsRef.
    itemsRef.current = {
      ...itemsRef.current,
      ...Object.entries(items).reduce(
        (acc: ItemMappingType, [id, item]: [string, NodeItemType]) => ({
          ...acc,
          [id]: {
            ...item,
            version: String(Number(item?.version ?? -1) + 1),
          },
        }),
        {} as ItemMappingType,
      ),
    };
  }

  function updatePorts(ports: PortMappingType) {
    // This should be the only setter for portsRef.
    portsRef.current = {
      ...portsRef.current,
      ...Object.entries(ports).reduce(
        (acc: PortMappingType, [id, item]: [string, PortType]) => ({
          ...acc,
          [id]: {
            ...item,
            version: String(Number(item?.version ?? -1) + 1),
          },
        }),
        {} as PortMappingType,
      ),
    };
  }

  function mutateModels(payload?: ModelMappingType): ModelMappingType {
    const { items, ports } = updateModelsAndRelationships(
      {
        itemsRef,
        portsRef,
      },
      payload,
    );
    updateNodeItems(items);
    updatePorts(ports);

    return {
      itemMapping: itemsRef.current,
      portMapping: portsRef.current,
    };
  }

  function setActiveItems(modelMapping: ModelMappingType) {
    setActiveItemsState(modelMapping);
  }

  function renderLayoutChanges(opts?: { level?: number; items?: ItemMappingType }) {
    const itemMapping = opts?.items ?? modelLevelsMapping.current[opts.level]?.itemMapping ?? {};

    setItemsState(prev => ({
      ...prev,
      ...itemMapping,
    }));
  }

  function updateItemsMetadata(data?: { version?: number }) {
    const { version } = data ?? {};
    itemsMetadataRef.current.rect.version =
      version ?? (itemsMetadataRef.current.rect.version ?? 0) + 1;
  }

  function updateLayoutOfItems(): ItemMappingType {
    const layout = {
      boundingRect: canvasRef?.current?.getBoundingClientRect(),
      containerRect: containerRef?.current?.getBoundingClientRect(),
      defaultRect: {
        item: () => ({
          height: 0,
          left: 0,
          padding: {
            bottom: 12,
            left: 12,
            right: 12,
            top: 12,
          },
          top: 0,
          width: 0,
        }),
      },
      direction: LayoutConfigDirectionEnum.HORIZONTAL,
      gap: {
        column: 40,
        row: 40,
      },
      transformState: transformState?.current,
    } as LayoutConfigType;

    const nodeMapping = {
      ...itemsRef.current,
      ...updateNodeGroupsWithItems(itemsRef?.current ?? {}),
    };
    const itemsUpdated = {} as ItemMappingType;

    modelLevelsMapping?.current?.forEach((modelMapping: ModelMappingType) => {
      const nodeIDs = Object.keys(modelMapping?.itemMapping ?? {}) ?? [];
      const nodes = [] as NodeType[];
      nodeIDs.forEach((nodeID: string) => {
        const node = nodeMapping?.[nodeID] as NodeType;
        if (ItemTypeEnum.NODE === node?.type) {
          itemsUpdated[nodeID] = node;
          nodes.push(node);
        }
      });

      layoutItemsInGroups(nodes, layout)?.forEach((node: NodeType) => {
        itemsUpdated[node.id] = node;

        node?.items?.forEach((itemNode: DragItem) => {
          itemsUpdated[itemNode.id] = itemNode;
        });
      });
    });

    updateNodeItems(itemsUpdated);

    return itemsUpdated;
  }

  function onDragging({
    clientOffset,
    currentOffset,
    differenceFromInitialOffset,
    initialClientOffset,
    initialOffset,
    item,
    itemType,
  }: {
    clientOffset: XYCoord;
    currentOffset: XYCoord;
    differenceFromInitialOffset: XYCoord;
    initialClientOffset: XYCoord;
    initialOffset: XYCoord;
    itemType: ItemTypeEnum;
    item: NodeItemType;
  }) {
    if (!differenceFromInitialOffset) {
      return;
    }

    const { x, y } = differenceFromInitialOffset;

    function finalCoords(x2: number, y2: number) {
      if (snapToGridOnDrag) {
        const [xs, ys] = snapToGrid({ x: x2, y: y2 }, gridDimensions);
        return {
          x: xs,
          y: ys,
        };
      }
      return {
        x: x2,
        y: y2,
      };
    }

    const modelMapping = {
      itemMapping: {},
      portMapping: {},
    };

    if (ItemTypeEnum.BLOCK === itemType) {
      item?.ports?.forEach(({ id: portID }: PortType) => {
        Object.values(connectionLinesPathRef?.current?.[portID] ?? {})?.forEach(
          ({ handleUpdatePath }: { handleUpdatePath: (item: NodeItemType) => void }) => {
            const port1 = portsRef.current?.[portID];

            const port1ElementRect =
              itemElementsRef?.current?.port?.[port1.id]?.current?.getBoundingClientRect();
            let port1Rect = {} as RectType;

            if (port1ElementRect) {
              // Need to adjust this because the element’s ref’s coordinates are relative to the current viewport.
              const absolute = getElementPositionInContainer(
                canvasRef?.current?.getBoundingClientRect(),
                containerRef?.current?.getBoundingClientRect(),
                port1ElementRect,
              );
              port1Rect = {
                height: port1ElementRect.height,
                left: absolute.left,
                top: absolute.top,
                width: port1ElementRect.width,
              };
            }

            port1Rect = {
              ...port1?.rect,
              ...port1Rect,
            };

            const x1 = port1Rect?.left ?? 0;
            const y1 = port1Rect?.top ?? 0;
            const { x: x3, y: y3 } = finalCoords(x1 + x, y1 + y);
            const port2 = update(port1, {
              rect: {
                $merge: {
                  left: x3,
                  top: y3,
                },
              },
            });

            handleUpdatePath(port2);
            // modelMapping.portMapping[port2.id] = port2;
          },
        );
      });
    }

    // const xy = finalCoords(item.rect.left + x, item.rect.top + y);
    // const item2 = update(item, {
    //   rect: {
    //     $merge: {
    //       left: xy.x,
    //       top: xy.y,
    //     },
    //   },
    // });
    // modelMapping.itemMapping[item.id] = item2;
  }

  function renderConnectionLines(opts?: {
    layout?: LayoutConfigType;
    modelMapping?: ModelMappingType;
  }) {
    const { layout, modelMapping } = opts ?? {};
    const { direction, origin, transformState } = layout ?? layoutConfig;

    const isVertical = LayoutConfigDirectionEnum.VERTICAL === direction;
    const isReverse =
      (origin ?? false) &&
      [LayoutConfigDirectionOriginEnum.BOTTOM, LayoutConfigDirectionOriginEnum.RIGHT].includes(
        origin,
      );

    const element = document.getElementById(connectionLinesRootID('nodes'));
    if (!element) return;

    const paths = {};
    const processed = {};

    const { itemMapping, portMapping } = modelLevelsMapping?.current[activeLevel?.current] ?? {};

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
      const rect1Item =
        item1Override?.rect ??
        itemElementsRef?.current?.block?.[item1.id]?.current?.getBoundingClientRect();
      // port.rect
      const rect1Port =
        port1Override?.rect ??
        itemElementsRef?.current?.port?.[port1.id]?.current?.getBoundingClientRect();
      // node.rect
      const rect1Node =
        itemElementsRef?.current?.node?.[node1.id]?.current?.getBoundingClientRect();

      // 2
      let item2 = itemsRef?.current[port1?.target?.id];
      const item2Override = modelMapping?.itemMapping?.[item2?.id];
      item2 = item2Override ?? item2;
      const block2 = item2?.block;
      const color2 = getBlockColor(block2?.type, { getColorName: true })?.names?.base;
      const node2 = itemsByNodeIDMapping[item2?.id];

      // port2
      let port2 = item2?.ports?.find(
        ({ subtype, target }: PortType) => subtype !== port1?.subtype && target.id === item1?.id,
      );
      const port2Override = modelMapping?.portMapping?.[port2.id];
      port2 = port2Override ?? port2;

      // item.rect
      const rect2 = item2Override?.rect ?? item2?.rect;
      const rect2Item =
        item2Override?.rect ??
        itemElementsRef?.current?.block?.[item2.id]?.current?.getBoundingClientRect();
      // port.rect
      const rect2Port =
        port2Override?.rect ??
        itemElementsRef?.current?.port?.[port2.id]?.current?.getBoundingClientRect();
      // node.rect
      const rect2Node =
        itemElementsRef?.current?.node?.[node2.id]?.current?.getBoundingClientRect();

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
            // node: rect1Node,
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
            // node: rect2Node,
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
        // rect = transformState ? transformZoomPanRect(rect, transformState?.current) : rect;

        const scale = Number(transformState?.scale?.current ?? 1);
        if (ItemTypeEnum.PORT === values?.type) {
          const isOutput = PortSubtypeEnum.OUTPUT === values?.subtype;

          if (Object.values(values?.rects)?.every(Boolean)) {
            // Rect calcs are initially performed on the item/block level.
            // Recalculate so that the paths are drawn to the ports.
            const {
              item,
              // Need to handle node ports differently.
              // node,
              port,
            } = values?.rects;

            rect.height = port?.height ?? rect.height;
            rect.width = port?.width ?? rect.width;

            if (isVertical) {
              if (isReverse) {
              } else {
              }
            } else {
              if (isReverse) {
              } else {
                rect.top = (item?.top ?? 0) + (port?.top - item?.top ?? 0);

                if (isReverse) {
                } else {
                  rect.left += (port?.left ?? 0) - (item?.left ?? 0);
                  if (isOutput) {
                    rect.left -= (port?.width ?? 0) / 2;
                  } else {
                    rect.left += (port?.width ?? 0) / 2;
                  }
                }
              }
            }
          }
        }

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
      const dValueForPath = getPathD(pathDOpts, fromRect, toRect);

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
              <stop
                offset="0%"
                style={{ stopColor: `var(--colors-${colors[1]})`, stopOpacity: 1 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: `var(--colors-${colors[0]})`, stopOpacity: 1 }}
              />
            </linearGradient>
          </defs>
        );
      }

      const pathRef =
        connectionLinesPathRef?.current?.[fromValues?.id]?.[toValues?.id]?.pathRef ?? createRef();

      function handleUpdatePath(item: NodeItemType) {
        const isOutput = fromValues?.id === item?.id;
        const isInput = toValues?.id === item?.id;
        const rect1 = isOutput ? item?.rect : fromRect;
        const rect2 = isInput ? item?.rect : toRect;
        const dValue = getPathD(pathDOpts, rect1, rect2);
        pathRef?.current?.setAttribute('d', dValue);
      }

      paths[portIDsCombined] = (
        <path
          d={dValueForPath}
          fill="none"
          id={portIDsCombined}
          key={`${portIDsCombined}-path`}
          ref={pathRef}
          stroke={
            colors?.length >= 2 ? `url(#${gradientID})` : `var(--colors-${colors[0] ?? 'gray'})`
          }
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
    connectionLineRootRef.current.render(<ConnectionLines>{Object.values(paths)}</ConnectionLines>);
  }

  function setActiveLevel(levelArg?: number) {
    const levelPrevious: number = activeLevel.current;
    levelPrevious !== null &&
      containerRef?.current?.classList.remove(stylesBuilder[`level-${levelPrevious}-active`]);

    let level: number = levelArg ?? (activeLevel?.current ?? 0) + 1;
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

  function submitEventOperation(event: ClientEventType, opts?: EventOperationOptionsType) {
    const { operationType } = event;

    if (EventOperationEnum.CONTEXT_MENU_OPEN === operationType) {
      handleContextMenu(event, ...opts?.args, opts?.kwargs);
    }
  }

  function handleContextMenu(
    event: ClientEventType,
    items?: MenuItemType[],
    opts?: RenderContextMenuOptions,
  ) {
    const { data } = event;

    const menuItems = items ?? [
      {
        Icon: ArrowsAdjustingFrameSquare,
        onClick: (event: ClientEventType) => {
          removeContextMenu(event);
          startTransition(() => {
            setZoomPanDisabled(true);
            setDragEnabled(true);
            setDropEnabled(true);
          });
        },
        uuid: 'Reposition blocks',
      },
      { divider: true },
      {
        items: [
          {
            onClick: (event: ClientEventType) => {
              event?.preventDefault();
              removeContextMenu(event ?? null);
              transformState?.current?.handleZoom?.current?.((event ?? null) as any, 1);
              startTransition(() => {
                setZoomPanDisabled(false);
              });
            },
            uuid:
              (transformState?.current?.zoom?.current ?? 1) === 1 ? 'Default zoom' : 'Zoom to 100%',
          },
          {
            onClick: (event: ClientEventType) => {
              event?.preventDefault();
              removeContextMenu(event ?? null);
              transformState?.current?.handlePanning?.current?.((event ?? null) as any, {
                x: 0,
                y: 0,
              });
              startTransition(() => {
                setZoomPanDisabled(false);
              });
            },
            uuid: 'Reset view',
          },
          {
            onClick: (event: ClientEventType) => {
              event.preventDefault();
              removeContextMenu(event);
              transformState?.current?.handlePanning?.current?.((event ?? null) as any, {
                xPercent: 0.5,
                yPercent: 0.5,
              });
              startTransition(() => {
                setZoomPanDisabled(false);
              });
            },
            uuid: 'Center view',
          },
        ],
        uuid: 'View controls',
      },
      {
        Icon: ArrowsAdjustingFrameSquare,
        uuid: 'Open file',
      },
      { uuid: 'Duplicate', description: () => 'Carbon copy file' },
      { uuid: 'Move' },
      { divider: true },
      { uuid: 'Rename' },
      { divider: true },
      {
        uuid: 'Transfer',
        items: [{ uuid: 'Upload files' }, { uuid: 'Download file' }],
      },
      {
        uuid: 'Copy',
        items: [{ uuid: 'Copy path' }, { uuid: 'Copy relative path' }],
      },
      { divider: true },
      {
        uuid: 'View',
        items: [{ uuid: 'Expand subdirectories' }, { uuid: 'Collapse subdirectories' }],
      },
      { divider: true },
      {
        uuid: 'Projects',
        items: [{ uuid: 'New Mage project' }, { uuid: 'New dbt project' }],
      },
    ];

    if (data?.node) {
    }
    renderContextMenu(event, menuItems, opts);
  }

  useEffect(() => {
    if (phaseRef.current === 0) {
      const { blockMapping, blocksByGroup, groupLevelsMapping, groupMapping } = buildDependencies(
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
            groupMapping:
              finalLevel >= 1 ? groupLevelsMappingRef?.current?.[finalLevel - 1] : undefined,
          },
          {
            ...layout,
            level: finalLevel,
          },
        ),
      );

      startTransition(() => {
        const { itemMapping, portMapping } = modelLevelsMapping.current.reduce(
          (acc, mapping) => {
            const { itemMapping, portMapping } = mapping;

            return {
              itemMapping: {
                ...acc.itemMapping,
                ...itemMapping,
              },
              portMapping: {
                ...acc.portMapping,
                ...portMapping,
              },
            };
          },
          {
            itemMapping: {} as ItemMappingType,
            portMapping: {} as PortMappingType,
          },
        );

        mutateModels({
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

    if (
      [ItemTypeEnum.BLOCK, ItemTypeEnum.NODE].includes(type) &&
      (!item?.rect || item?.rect?.version <= rectVersion)
    ) {
      const previousVersion = (item?.rect?.version ?? -1) >= 0;
      const rectOld = item?.rect;
      const rect = itemRef.current.getBoundingClientRect() as RectType;
      rect.id = item.id;

      const defaultPositions: RectType = layoutConfig?.transformRect?.[type]?.(rect as RectType) ??
        rect ?? {
          left: undefined,
          top: undefined,
        };

      const elementBadge = itemRef?.current?.querySelector(`#${item.id}-badge`);
      const rectBadge = elementBadge?.getBoundingClientRect() ?? {
        height: 0,
        left: 0,
        top: 0,
        width: 0,
      };
      const elementTitle = itemRef?.current?.querySelector(`#${item.id}-title`);
      const rectTitle = elementTitle?.getBoundingClientRect() ?? {
        height: 0,
        left: 0,
        top: 0,
        width: 0,
      };

      const shouldUpdate =
        !previousVersion || rect?.width !== rectOld?.width || rect?.height !== rectOld?.height;

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
            left: previousVersion ? rectOld?.left : defaultPositions?.left ?? 0,
            offset: {
              left: itemRef?.current?.offsetLeft,
              top: itemRef?.current?.offsetTop,
            },
            top: previousVersion ? rectOld?.top : defaultPositions?.top ?? 0,
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
          setActiveLevel(3);
          const itemsUpdated = updateLayoutOfItems();
          renderLayoutChanges({ items: itemsUpdated });
          renderConnectionLines();
        }
      }
    }
  }

  function onMountPort(item: PortType, portRef: React.RefObject<HTMLDivElement>) {
    const { id, type } = item;

    itemElementsRef.current ||= {};
    itemElementsRef.current[type] ||= {};
    itemElementsRef.current[type][id] = portRef;

    const rect = portRef.current.getBoundingClientRect();
    const rectDef = layoutConfig?.transformRect?.[ItemTypeEnum.PORT]?.(rect) ?? rect;
    const rectVersion = itemsMetadataRef.current.rect.version;
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
          version: rectVersion,
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

  function handleDragStart(event: ClientEventType) {
    // setZoomPanDisabled(true);
    // if (!itemDraggingRef.current && ItemTypeEnum.PORT === node.type) {
    //   itemDraggingRef.current = node;
    //   setActiveItems({
    //     [`${node.type}Mapping`]: {
    //       [node.id]: node,
    //     },
    //   });
    // }
  }

  function handleDragEnd(event: ClientEventType) {
    setZoomPanDisabled(false);
    setDragEnabled(false);
    setDropEnabled(false);
  }

  function handleMouseDown(event: ClientEventType) {
    const { operationType } = event;

    if (EventOperationEnum.DRAG_START !== operationType) {
      setZoomPanDisabled(false);
      setDragEnabled(false);
      setDropEnabled(false);
    }
  }

  // function handleMouseOver(event: ClientEventType) {
  // }

  // function handleMouseLeave(event: ClientEventType) {
  //   setZoomPanDisabled(false);
  // }

  function onDragInit(node: NodeItemType, monitor: DropTargetMonitor) {
    // We still probably need this when we are draggin lines from port to port.
    // Called only once when it starts
    // updateNodeItems({ [node.id]: node });
    // let rectOrigin = node?.rect;
    // if (
    //   ItemTypeEnum.PORT === node.type &&
    //   itemDraggingRef.current &&
    //   buildPortUUID(node) === buildPortUUID(itemDraggingRef?.current)
    // ) {
    //   rectOrigin = itemDraggingRef?.current?.rect;
    //   console.log('What do we do with this rect?', rectOrigin);
    // } else {
    //   renderConnectionLines();
    // }
  }

  function resetAfterDrop() {
    // itemDraggingRef.current = null;
    // setActiveItems(null);
  }

  function onDropBlock(nodeInit: NodeItemType, monitor: DropTargetMonitor) {
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
      const [xSnapped, ySnapped] = snapToGrid(
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

    const portsUpdated = {
      ...portsRef.current,
    };
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

      portsUpdated[port2.id] = port2;
    });

    const elItem = itemElementsRef.current[node.type][node.id].current;
    if (elItem) {
      elItem.style.transform = `translate(${left}px, ${top}px)`;
    }

    const payload = {
      itemMapping: {
        ...itemsRef.current,
        [node2.id]: node2,
      },
      portMapping: portsUpdated,
    };

    // DON’T call renderLayout changes or else the item’s rect is changed.
    mutateModels(payload);
    renderConnectionLines();
  }

  function onDropPort(dragTarget: NodeItemType, dropTarget: NodeItemType) {
    if (ItemTypeEnum.PORT === dragTarget.type && ItemTypeEnum.PORT === dropTarget.type) {
      const node = itemDraggingRef.current;
      console.log('Create a new connection for:', node);
    }

    resetAfterDrop();
  }

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
    const arr = [...Object.values(items || {})];

    return arr?.map((node: NodeType, idx: number) => (
      <BlockNodeWrapper
        draggable={dragEnabled}
        droppable={dropEnabled}
        frameworkGroups={frameworkGroupsRef?.current}
        handlers={{
          onDragEnd: handleDragEnd,
          onDragStart: handleDragStart,
          onDrop: onDropPort,
          onMouseDown: handleMouseDown,
          // onMouseOver: handleMouseOver,
          // onMouseLeave: handleMouseLeave,
        }}
        item={node}
        key={`${node.id}-${node.type}-${idx}`}
        onMountItem={onMountItem}
        onMountPort={onMountPort}
        submitEventOperation={submitEventOperation}
      />
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragEnabled, dropEnabled, items]);

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
        onContextMenu={e => handleContextMenu(e as any)}
        onDoubleClick={handleDoubleClick}
        onMouseDown={e => handleMouseDown(e as any)}
        ref={canvasRef}
        style={{
          height: 'inherit',
          overflow: 'inherit',
          position: 'inherit',
          width: 'inherit',
        }}
      >
        <CanvasContainer gridSize={GRID_SIZE} ref={containerRef}>
          <DragLayer
            gridDimensions={gridDimensions}
            onDragging={onDragging}
            snapToGrid={snapToGridOnDrag}
          />

          <div
            id={connectionLinesRootID('nodes')}
            style={{
              height: '100%',
              pointerEvents: 'none',
              position: 'absolute',
              width: '100%',
              zIndex: 5,
            }}
          />

          {nodesMemo}

          <div
            style={{
              bottom: 0,
              height: '100vh',
              left: 0,
              position: 'fixed',
              top: 0,
              width: 1,
            }}
          />
          <div
            style={{
              bottom: 0,
              height: '100vh',
              position: 'fixed',
              right: 0,
              top: 0,
              width: 1,
            }}
          />
          <div
            style={{
              bottom: 0,
              height: 1,
              left: 0,
              position: 'fixed',
              right: 0,
              width: '100vw',
            }}
          />
          <div
            style={{
              height: 1,
              left: 0,
              position: 'fixed',
              right: 0,
              top: 0,
              width: '100vw',
            }}
          />
        </CanvasContainer>
      </div>
    </div>
  );
};

export default function PipelineBuilderCanvas(props: PipelineBuilderProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const disabledRef = useRef(false);
  const handlePanning = useRef<
    (
      event: MouseEvent,
      positionOverride?: {
        x?: number;
        xPercent?: number;
        y?: number;
        yPercent?: number;
      },
    ) => void
  >(() => null);
  const handleZoom = useRef<(event: WheelEvent, scaleOverride?: number) => void>(() => null);
  const originX = useRef(0);
  const originY = useRef(0);
  const panning = useRef({ active: false, direction: null });
  const phase = useRef(0);
  const scale = useRef(1);
  const startX = useRef(0);
  const startY = useRef(0);
  const transformRef = useRef(null);
  const zoom = useRef(1);

  const zoomPanStateRef = useRef<ZoomPanStateType>({
    container: containerRef,
    disabled: disabledRef,
    element: canvasRef,
    handlePanning,
    handleZoom,
    originX,
    originY,
    panning,
    phase,
    scale,
    startX,
    startY,
    transform: transformRef,
    zoom,
  });
  const [dragEnabled, setDragEnabled] = useState(false);
  const [dropEnabled, setDropEnabled] = useState(false);
  const [, setZoomPanDisabledState] = useState(false);

  const { contextMenu, renderContextMenu, removeContextMenu, shouldPassControl } = useContextMenu({
    container: containerRef,
    uuid: 'pipeline-builder-canvas',
  });

  useZoomPan(zoomPanStateRef, {
    roles: [ElementRoleEnum.DRAGGABLE],
    // initialPosition: {
    //   xPercent: 0.5,
    //   yPercent: 0.5,
    // },
  });

  function setZoomPanDisabled(value: boolean) {
    zoomPanStateRef.current.disabled.current = value;
    // We need to update any state or else dragging doesn’t work.
    setZoomPanDisabledState(value);
  }

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (shouldPassControl(event as ClientEventType)) return;
      removeContextMenu(event as ClientEventType, { conditionally: true });

      const targetElement = event.target as HTMLElement;
      const hasRole = [dragEnabled && ElementRoleEnum.DRAGGABLE]
        .filter(Boolean)
        .some(role => targetElement.closest(`[role="${role}"]`));

      if (hasRole) {
        // For some reason, we need to do this or else you can’t drag anything.
        setZoomPanDisabled(true);
        setDragEnabled(true);
        setDragEnabled(true);
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      // Always do this or else there will be situations where it’s never reset.

      if (shouldPassControl(event as ClientEventType)) return;

      const targetElement = event.target as HTMLElement;
      const hasRole = [
        dragEnabled && ElementRoleEnum.DRAGGABLE,
        dropEnabled && ElementRoleEnum.DROPPABLE,
      ]
        .filter(Boolean)
        .some(role => targetElement.closest(`[role="${role}"]`));

      if (hasRole) {
        setZoomPanDisabled(false);
        setDragEnabled(false);
        setDropEnabled(false);
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
  }, [dragEnabled, dropEnabled]);

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <PipelineBuilder
          {...props}
          canvasRef={canvasRef}
          containerRef={containerRef}
          dragEnabled={dragEnabled}
          dropEnabled={dropEnabled}
          removeContextMenu={removeContextMenu}
          renderContextMenu={renderContextMenu}
          setDragEnabled={setDragEnabled}
          setDropEnabled={setDropEnabled}
          setZoomPanDisabled={setZoomPanDisabled}
          transformState={zoomPanStateRef}
        />
      </DndProvider>

      {contextMenu}
    </>
  );
}
