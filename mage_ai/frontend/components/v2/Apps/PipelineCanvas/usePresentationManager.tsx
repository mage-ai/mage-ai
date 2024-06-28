import React, { createRef, useRef } from 'react';
import update from 'immutability-helper';
import { ConnectionLines } from '../../Canvas/Connections/ConnectionLines';
import { DragItem, NodeItemType, NodeType, RectType, PortType, LayoutConfigType, ModelMappingType } from '../../Canvas/interfaces';
import { ItemTypeEnum, LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum, PortSubtypeEnum } from '../../Canvas/types';
import { LayoutManagerType } from './useLayoutManager';
import { ModelManagerType } from './useModelManager';
import { createRoot, Root } from 'react-dom/client';
import { getBlockColor } from '@mana/themes/blocks';
import { getPathD } from '../../Canvas/Connections/utils';
import { throttle } from '../../Canvas/utils/throttle';
import { ActiveLevelRefType, LayoutConfigRefType, ItemIDsByLevelRef, SetActiveLevelType } from './interfaces';
import useDynamicDebounce from '@utils/hooks/useDebounce';

function buildConnectionLinesRootID(uuid: string): string {
  return `connection-lines-root-${uuid}`;
}

type PresentationManagerProps = {
  activeLevel: ActiveLevelRefType;
  itemIDsByLevelRef: ItemIDsByLevelRef;
  itemsRef: ModelManagerType['itemsRef'];
  layoutConfig: LayoutConfigRefType;
  mutateModels: ModelManagerType['mutateModels'];
  portsRef: ModelManagerType['portsRef'];
  setActiveLevel: SetActiveLevelType;
  updateLayoutOfItems: LayoutManagerType['updateLayoutOfItems'];
  updateNodeItems: ModelManagerType['updateNodeItems'];
  itemElementsRef: React.MutableRefObject<Record<string, Record<string, React.RefObject<HTMLDivElement>>>>;
};

export type PresentationManagerType = {
  connectionLinesPathRef: React.MutableRefObject<
    Record<string, Record<string, {
      handleUpdatePath: (item: NodeItemType) => void;
      pathRef: React.RefObject<SVGPathElement>;
    }>>>;
  connectionLinesRootID: React.MutableRefObject<string>;
  itemDraggingRef: React.MutableRefObject<NodeItemType | null>;
  itemsMetadataRef: React.MutableRefObject<Record<string, any>>;

  onMountPort: (port: PortType, portRef: React.RefObject<HTMLDivElement>) => void;
  renderConnectionLines: (opts?: {
    layout?: LayoutConfigType | undefined; modelMapping?: ModelMappingType | undefined;
  } | undefined) => React.ReactNode;
  updateItemsMetadata: (data?: { version?: number }) => void;
};

export default function usePresentationManager({
  activeLevel,
  itemIDsByLevelRef,
  itemsRef,
  layoutConfig,
  mutateModels,
  portsRef,
  setActiveLevel,
  itemElementsRef,
  updateLayoutOfItems,
  // Updates the itemsReftems,
  updateNodeItems,
}: PresentationManagerProps): PresentationManagerType {


  const connectionLinesRootID = useRef<string>(buildConnectionLinesRootID('nodes'));
  const connectionLineRootRef = useRef<React.MutableRefObject<Root>>(null);
  const connectionLinesPathRef = useRef<
    Record<
      string,
      // Redraws the rects
      Record<
        // Updates the items state
        string,
        // Redraws the path lines
        {
          handleUpdatePath: (item: NodeItemType) => void;
          pathRef: React.RefObject<SVGPathElement>;
        }
      >
    >
  >({});

  const itemDraggingRef = useRef<NodeItemType | null>(null);
  const itemsMetadataRef = useRef<Record<string, any>>({ rect: {} });


  function updateItemsMetadata(data?: { version?: number }) {
    const { version } = data ?? {};
    itemsMetadataRef.current.rect.version =
      version ?? (itemsMetadataRef.current.rect.version ?? 0) + 1;
  }



  function onMountPort(item: PortType, portRef: React.RefObject<HTMLDivElement>) {
    const { id, type } = item;

    itemElementsRef.current ||= {};
    itemElementsRef.current[type] ||= {};
    itemElementsRef.current[type][id] = portRef;

    const rect = portRef?.current?.getBoundingClientRect();
    const rectDef = layoutConfig?.current?.transformRect?.[ItemTypeEnum.PORT]?.(rect) ?? rect;
    const rectVersion = itemsMetadataRef.current.rect.version;
    const port = update(item, {
      rect: {
        $set: {
          height: (rect?.height ?? 0),
          left: (rect?.left ?? 0) + (rectDef?.left ?? 0),
          offset: {
            left: portRef?.current?.offsetLeft,
            top: portRef?.current?.offsetTop,
          },
          top: (rect?.top ?? 0) + (rectDef?.top ?? 0),
          version: rectVersion,
          width: (rect?.width ?? 0),
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

  function renderConnectionLines(opts?: {
    layout?: LayoutConfigType;
    modelMapping?: ModelMappingType;
  }): React.ReactNode {
    const { layout, modelMapping } = opts ?? {};
    const { direction, origin, transformStateRef } = layout ?? layoutConfig?.current ?? {};

    const isVertical = LayoutConfigDirectionEnum.VERTICAL === direction;
    const isReverse =
      (origin ?? false) &&
      origin && [LayoutConfigDirectionOriginEnum.BOTTOM, LayoutConfigDirectionOriginEnum.RIGHT].includes(
        origin,
      );

    const element = document.getElementById(connectionLinesRootID.current);
    if (!element) return;

    const paths = {};
    const processed = {};

    const itemMapping = {};
    const portMapping = {};

    itemIDsByLevelRef?.current?.[activeLevel?.current]?.forEach((id: string) => {
      const item = itemsRef?.current[id];
      item?.ports?.forEach(({ id: portID }) => {
        portMapping[portID] = portsRef?.current[portID];
      });

      itemMapping[id] = item;
    });

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
      // const rect1Node =
      //   itemElementsRef?.current?.node?.[node1.id]?.current?.getBoundingClientRect();

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
      const port2Override = modelMapping?.portMapping?.[(port2 ?? { id: 'null' }).id];
      port2 = port2Override ?? port2;

      // item.rect
      const rect2 = item2Override?.rect ?? item2?.rect;
      const rect2Item =
        item2Override?.rect ??
        itemElementsRef?.current?.block?.[item2.id]?.current?.getBoundingClientRect();
      // port.rect
      const rect2Port =
        port2Override?.rect ??
        itemElementsRef?.current?.port?.[(port2 ?? { id: 'null' }).id]?.current?.getBoundingClientRect();
      // node.rect
      // const rect2Node =
      //   itemElementsRef?.current?.node?.[node2.id]?.current?.getBoundingClientRect();

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
        [(port2 ?? { id: 'null' }).id]: {
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
      const fromValues = values[(fromPort ?? { id: 'fromPort' })?.id];
      const toValues = values[(toPort ?? { id: 'toPort' })?.id];

      function _buildRect(values: any) {
        const rect = {
          height: values?.rect?.height ?? 0,
          left: values?.rect?.left ?? 0,
          top: values?.rect?.top ?? 0,
          width: values?.rect?.width ?? 0,
        };

        // console.log(0, item1?.id, item2?.id, rect);
        // rect = transformState ? transformZoomPanRect(rect, transformState?.current) : rect;

        const scale = Number(transformStateRef?.current?.scale?.current ?? 1);
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

      const fromRect = _buildRect(fromValues);
      const toRect = _buildRect(toValues);

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


      if (typeof fromValues?.id !== 'undefined' && typeof toValues?.id !== 'undefined') {
        const pathRef =
          connectionLinesPathRef?.current?.[fromValues?.id]?.[toValues?.id]?.pathRef ?? createRef();

        function _handleUpdatePath(item: NodeItemType) {
          const isOutput = fromValues?.id === item?.id;
          const isInput = toValues?.id === item?.id;
          const rect1 = isOutput ? item?.rect : fromRect;
          const rect2 = isInput ? item?.rect : toRect;

          if (rect1 && rect2) {
            const dValue = getPathD(pathDOpts, rect1, rect2);
            pathRef?.current?.setAttribute('d', dValue);
          }
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
          handleUpdatePath: _handleUpdatePath,
          pathRef,
        };

        connectionLinesPathRef.current[toValues?.id] ||= {};
        connectionLinesPathRef.current[toValues?.id][fromValues?.id] = {
          handleUpdatePath: _handleUpdatePath,
          pathRef,
        };
      }
    });

    (connectionLineRootRef as { current: any }).current ||= createRoot(element);
    (connectionLineRootRef.current as any).render(<ConnectionLines>{Object.values(paths)}</ConnectionLines>);
  }

  return {
    connectionLinesPathRef,
    connectionLinesRootID,
    itemDraggingRef,
    itemsMetadataRef,
    onMountPort,
    renderConnectionLines,
    updateItemsMetadata,
  };
}
