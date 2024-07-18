import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import html2canvas from 'html2canvas';
import { AppStatusEnum } from '../constants';
import type { DropTargetMonitor } from 'react-dnd';
import update from 'immutability-helper';
import {
  ModelManagerType,
  EventManagerType,
  LayoutManagerType,
  ActiveLevelRefType,
  AppHandlersRefType,
  LayoutConfigRefType,
  ItemIDsByLevelRef,
} from './interfaces';
import {
  TreeWithArrowsDown,
  OpenInSidekick,
  Select,
  SearchV2,
  CubeWithArrowDown,
  PaginateArrowRight,
  BatchSquaresStacked,
  Table,
  Circle,
  BranchAlt,
  Monitor,
  Undo,
  ArrowsAdjustingFrameSquare,
  Check,
  Group,
  TemplateShapes,
  Trash,
  GroupV2,
  ArrowsPointingInFromAllCorners,
  CloseV2,
  CopyV2,
} from '@mana/icons';
import {
  ClientEventType,
  EventOperationEnum,
  EventOperationOptionsType,
} from '@mana/shared/interfaces';
import { ItemTypeEnum, LayoutConfigDirectionEnum, TransformRectTypeEnum } from '../../Canvas/types';
import {
  MenuItemType,
  RenderContextMenuOptions,
  RemoveContextMenuType,
  RenderContextMenuType,
} from '@mana/hooks/useContextMenu';
import {
  NodeItemType,
  PortType,
  RectType,
  ItemMappingType,
  PortMappingType,
  ModelMappingType,
  LayoutConfigType,
  NodeType,
  OutputNodeType,
} from '../../Canvas/interfaces';
import { PresentationManagerType } from './usePresentationManager';
import { XYCoord } from 'react-dnd';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { getElementPositionInContainer } from '../../Canvas/utils/rect';
import { pluralize } from '@utils/string';
import { pushAtIndex, sortByKey } from '@utils/array';
import { snapToGrid } from '../../Canvas/utils/snapToGrid';
import { calculateBoundingBox, findRectAtPoint } from '../../Canvas/utils/rect';
import { useRef, useState, startTransition } from 'react';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { MutateType } from '@api/interfaces';
import { isElementReallyVisible } from '@utils/elements';
import { IconProps } from '@mana/elements/Icon';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { DEBUG } from '@components/v2/utils/debug';
import { copyToClipboard } from '@utils/clipboard';

const GRID_SIZE = 40;

type EventManagerProps = {
  activeLevel: React.MutableRefObject<number>;
  appHandlersRef: AppHandlersRefType;
  canvasRef: React.MutableRefObject<HTMLDivElement>;
  connectionLinesPathRef: PresentationManagerType['connectionLinesPathRef'];
  containerRef: React.MutableRefObject<HTMLDivElement>;
  itemDraggingRef: React.MutableRefObject<NodeItemType | null>;
  itemElementsRef: React.MutableRefObject<
    Record<string, Record<string, React.RefObject<HTMLDivElement>>>
  >;
  itemsRef: React.MutableRefObject<ItemMappingType>;
  itemIDsByLevelRef: ItemIDsByLevelRef;
  mutateModels: ModelManagerType['mutateModels'];
  outputsRef: ModelManagerType['outputsRef'];
  portsRef: React.MutableRefObject<PortMappingType>;
  removeContextMenu: RemoveContextMenuType;
  renderConnectionLines: PresentationManagerType['renderConnectionLines'];
  renderContextMenu: RenderContextMenuType;
  setDragEnabled: (value: boolean) => void;
  setDropEnabled: (value: boolean) => void;
  setLayoutConfig: (prev: (value: LayoutConfigType) => LayoutConfigType) => void;
  setZoomPanDisabled: (value: boolean) => void;
  transformState: React.MutableRefObject<ZoomPanStateType>;
  layoutConfig: LayoutManagerType['layoutConfig'];
};

export default function useEventManager({
  activeLevel,
  wrapperRef,
  appHandlersRef,
  itemIDsByLevelRef,
  canvasRef,
  connectionLinesPathRef,
  containerRef,
  itemDraggingRef,
  itemElementsRef,
  itemsRef,
  mutateModels,
  outputsRef,
  portsRef,
  selectedGroupsRef,
  removeContextMenu,
  snapToGridOnDrop: snapToGridOnDropProp,
  renderConnectionLines,
  renderContextMenu,
  setDragEnabled,
  setDropEnabled,
  setLayoutConfig,
  layoutConfig,
  setZoomPanDisabled,
  transformState,
}: EventManagerProps): EventManagerType {
  const gridDimensions = useRef<RectType>({ height: GRID_SIZE, left: 0, top: 0, width: GRID_SIZE });

  const [snapToGridOnDrag, setSnapToGridOnDrag] = useState(false);
  const [snapToGridOnDrop, setSnapToGridOnDrop] = useState(snapToGridOnDropProp);

  function handleStartDragging(event?: CustomEvent) {
    startTransition(() => {
      setZoomPanDisabled(true);
      setDragEnabled(true);
      setDropEnabled(true);
    });
    DEBUG.dragging && console.log('handleStartDragging', event);
    containerRef?.current?.classList.add(stylesBuilder.dragging);
  }

  const { convertEvent, dispatchAppEvent } = useAppEventsHandler(
    {
      gridDimensions,
    } as any,
    {
      [CustomAppEventEnum.NODE_DROPPED]: onDropBlock,
      [CustomAppEventEnum.START_DRAGGING]: handleStartDragging,
    },
  );

  function updateNodeLayouts(
    event?: MouseEvent,
    opts?: {
      layoutConfig?: LayoutConfigType;
      level?: number;
    },
  ) {
    dispatchAppEvent(CustomAppEventEnum.UPDATE_SETTINGS, {
      event: convertEvent(event ?? {}),
      options: {
        kwargs: opts,
      },
    });
  }

  function onDragging({
    // clientOffset,
    // currentOffset,
    differenceFromInitialOffset,
    // initialClientOffset,
    // initialOffset,
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
    DEBUG.dragging && console.log('onDragging', event);
    if (!differenceFromInitialOffset) {
      return;
    }

    const { x, y } = differenceFromInitialOffset;

    function finalCoords(x2: number, y2: number) {
      if (snapToGridOnDrag) {
        const [xs, ys] = snapToGrid(
          { x: x2, y: y2 },
          { height: gridDimensions.current.height, width: gridDimensions.current.width },
        );
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

    // const modelMapping = {
    //   itemMapping: {},
    //   portMapping: {},
    // };

    // if (ItemTypeEnum.BLOCK === itemType) {
    //   item?.ports?.forEach(({ id: portID }: PortType) => {
    //     Object.values(connectionLinesPathRef?.current?.[portID] ?? {})?.forEach(
    //       ({ handleUpdatePath }: { handleUpdatePath: (item: NodeItemType) => void }) => {
    //         const port1 = portsRef.current?.[portID];

    //         const port1ElementRect =
    //           itemElementsRef?.current?.port?.[port1.id]?.current?.getBoundingClientRect();
    //         let port1Rect = {} as RectType;

    //         if (port1ElementRect) {
    //           // Need to adjust this because the element’s ref’s coordinates are relative to the current viewport.
    //           const absolute = getElementPositionInContainer(
    //             canvasRef?.current?.getBoundingClientRect(),
    //             containerRef?.current?.getBoundingClientRect(),
    //             port1ElementRect,
    //           );
    //           port1Rect = {
    //             height: port1ElementRect.height,
    //             left: absolute.left,
    //             top: absolute.top,
    //             width: port1ElementRect.width,
    //           };
    //         }

    //         port1Rect = {
    //           ...port1?.rect,
    //           ...port1Rect,
    //         };

    //         const x1 = port1Rect?.left ?? 0;
    //         const y1 = port1Rect?.top ?? 0;
    //         const { x: x3, y: y3 } = finalCoords(x1 + x, y1 + y);
    //         const port2 = update(port1, {
    //           rect: {
    //             $merge: {
    //               left: x3,
    //               top: y3,
    //             },
    //           },
    //         });

    //         handleUpdatePath(port2);
    //         // modelMapping.portMapping[port2.id] = port2;
    //       },
    //     );
    //   });
    // }

    if ([ItemTypeEnum.BLOCK, ItemTypeEnum.NODE, ItemTypeEnum.OUTPUT].includes(itemType)) {
      const xy = finalCoords(item?.rect?.left + x, item?.rect?.top + y);

      const item2 = update(item, {
        rect: {
          $merge: {
            left: xy.x,
            top: xy.y,
          },
        },
      });

      const data: {
        node?: NodeItemType;
        output?: OutputNodeType;
      } = {};

      if (ItemTypeEnum.OUTPUT === itemType) {
        data.node = item2.node;
        data.output = item2;
      } else {
        data.node = item2;
      }

      dispatchAppEvent(CustomAppEventEnum.NODE_DRAGGING, {
        ...data,
        options: {
          kwargs: {
            redraw: true,
          },
        },
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

  function handleDoubleClick(event: React.MouseEvent) {
    alert('DOUBLE CLICK!');
    // renderConnectionLines();
  }

  function submitEventOperation(event: ClientEventType, opts?: EventOperationOptionsType) {
    if (opts?.handler) {
      opts?.handler(event, appHandlersRef.current as unknown as Record<string, MutateType>, {
        removeContextMenu,
        renderContextMenu,
      });
    } else {
      const { operationType } = event;

      if (EventOperationEnum.CONTEXT_MENU_OPEN === operationType) {
        handleContextMenu(event, ...opts?.args, opts?.kwargs);
      } else if (EventOperationEnum.APP_START === operationType) {
        const [type, subtype] = opts?.args;
        const app = {
          status: AppStatusEnum.INITIALIZED,
          subtype,
          type,
          uuid: event?.data?.block?.uuid,
        };

        if (!app?.uuid) {
          console.error('App UUID is required to start the app.');
        }

        dispatchAppEvent(CustomAppEventEnum.START_APP, {
          app,
          event,
          node: event?.data?.node,
        });
      }
    }
  }

  function handleContextMenu(
    event: ClientEventType,
    items?: MenuItemType[],
    opts?: RenderContextMenuOptions,
  ) {
    const { data } = event;
    removeContextMenu(event);

    const rects = [];
    const itemsToTest = [];

    Object.values(itemsRef?.current ?? {})?.forEach(item => {
      itemsToTest.push(item);
      const outputs = Object.values(outputsRef?.current?.[item?.id] ?? {}) ?? [];
      outputs?.length >= 1 && itemsToTest.push(...(outputs ?? []));
    });

    itemsToTest.forEach((item: NodeItemType, index: number) => {
      // const element = itemElementsRef?.current?.[item?.type]?.[item?.id]?.current;
      // if (!element || !isElementReallyVisible(element)) return;
      // const { left, top, width, height } = element?.getBoundingClientRect() ?? item?.rect;

      if (!item?.rect) return;
      const { left, top, width, height } = item?.rect ?? {};

      if (!left && !top && !width && !height) return;

      rects.push({
        height,
        id: item.id,
        index,
        item,
        left,
        top,
        width,
      });
    });

    const parseTransform = (transform: string) => {
      const translateMatch = transform?.match(/translate\(([^)]+)\)/);
      const scaleMatch = transform?.match(/scale\(([^)]+)\)/);

      let translate = [0, 0];
      if (translateMatch) {
        translate = translateMatch
          ? translateMatch[1].split(',').map(val => parseFloat(val.trim()))
          : [0, 0];
      }

      let scale = 1;
      if (scaleMatch) {
        scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
      }

      return { translate, scale };
    };

    const applyTransform = (
      event: React.MouseEvent<HTMLButtonElement>,
      currentTransform: { translate: number[]; scale: number },
    ) => {
      const pageX = event.pageX;
      const pageY = event.pageY;

      // Calculate new translate values based on click position
      const newTranslateX = pageX - currentTransform.translate[0];
      const newTranslateY = pageY - currentTransform.translate[1];

      return {
        translate: [newTranslateX, newTranslateY],
        scale: currentTransform.scale,
      };
    };

    const [x1, y1] = applyTransform(
      event,
      parseTransform(transformState?.current?.transform?.current),
    ).translate;
    const rect = rects?.length >= 1 ? findRectAtPoint(x1, y1, rects) : null;

    const target = rect ? rect.item : null;

    const menuItems = [];

    if (target && ItemTypeEnum.OUTPUT === target?.type) {
      menuItems.push(
        ...[
          {
            Icon: CloseV2,
            onClick: (event: ClientEventType) => {
              removeContextMenu(event);
              dispatchAppEvent(CustomAppEventEnum.CLOSE_OUTPUT, {
                event,
                node: target.node,
                output: target,
              });
            },
            uuid: 'Close output',
          },
          {
            Icon: CopyV2,
            onClick: (event2: ClientEventType) => {
              removeContextMenu(event2);
              const targetElement = event?.target as HTMLElement;
              const mruuid = targetElement?.getAttribute('data-message-request-uuid');
              const events = sortByKey(
                Object.values(target?.eventStreams?.[mruuid] ?? {}) ?? [],
                ({ result }) => result?.timestamp,
              );
              const text = events
                ?.map(({ result }) => (result?.output_text ?? '')?.trim() ?? '')
                .join('\n');
              copyToClipboard(text);
            },
            uuid: 'Copy output',
          },
          {
            Icon: Trash,
            onClick: (event: ClientEventType) => {
              removeContextMenu(event);
              dispatchAppEvent(CustomAppEventEnum.CLOSE_OUTPUT, {
                event,
                node: target,
              });
            },
            uuid: 'Delete output',
          },
          { divider: true },
        ],
      );
    } else {
      menuItems.push({
        Icon: Select,
        onClick: (event: ClientEventType) => {
          removeContextMenu(event);
          handleStartDragging();
        },
        uuid: 'Reposition blocks',
      });
    }

    menuItems.push(
      ...(items ?? [
        {
          Icon: SearchV2,
          items: [
            {
              Icon: iconProps => <Undo {...iconProps} secondary />,
              onClick: (event: ClientEventType) => {
                event?.preventDefault();
                removeContextMenu(event ?? null);
                transformState?.current?.handleZoom?.current?.((event ?? null) as any, 1);
                startTransition(() => {
                  setZoomPanDisabled(false);
                });
              },
              uuid:
                (transformState?.current?.zoom?.current ?? 1) === 1
                  ? 'Default zoom'
                  : 'Zoom to 100%',
            },
            {
              Icon: ArrowsAdjustingFrameSquare,
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
              Icon: ArrowsPointingInFromAllCorners,
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
          Icon: GroupV2,
          items: [
            ...[
              [LayoutConfigDirectionEnum.VERTICAL, 'Vertical layout', CubeWithArrowDown],
              [LayoutConfigDirectionEnum.HORIZONTAL, 'Horizontal layout', PaginateArrowRight],
            ].map(([direction, uuid, icon]) => {
              const selected =
                (layoutConfig?.current?.direction ?? LayoutConfigDirectionEnum.HORIZONTAL) ===
                direction;
              const Icon = selected ? Check : icon;

              return {
                Icon: (props: IconProps) => (
                  <Icon {...props} colorName={selected ? 'green' : undefined} />
                ),
                onClick: (event: ClientEventType) => {
                  event.preventDefault();
                  updateNodeLayouts(event, {
                    layoutConfig: {
                      direction: direction as LayoutConfigDirectionEnum,
                    },
                  });
                  removeContextMenu(event);
                },
                uuid,
              };
            }),
            ...Object.entries({
              [TransformRectTypeEnum.LAYOUT_GRID]: ['Square layout', BatchSquaresStacked],
              [TransformRectTypeEnum.LAYOUT_RECTANGLE]: ['Rows and column layout', Table],
              [TransformRectTypeEnum.LAYOUT_SPIRAL]: ['Spiral layout', Circle],
              [TransformRectTypeEnum.LAYOUT_TREE]: ['Tree layout', BranchAlt],
              [TransformRectTypeEnum.LAYOUT_WAVE]: ['Wave layout', Monitor],
            }).map(([value, arr]) => {
              const selected = layoutConfig?.current?.rectTransformations?.find(
                ({ type }) => type === value,
              );
              const uuid = arr[0];
              const Icon = selected ? Check : arr[1];

              return {
                Icon: (props: IconProps) => (
                  <Icon {...props} colorName={selected ? 'green' : undefined} />
                ),
                onClick: (event: ClientEventType) => {
                  event.preventDefault();
                  updateNodeLayouts(event, {
                    layoutConfig: {
                      rectTransformations: [
                        {
                          type: value as TransformRectTypeEnum,
                        },
                      ],
                    },
                  });
                  removeContextMenu(event);
                },
                uuid,
              };
            }),
          ],
          uuid: 'Customize block layout',
        },
        // { divider: true },
        // {
        //   uuid: 'Groupings',
        // },
        // ...buildMenuItemGroupsForPipelineFramework(),
        { divider: true },
        {
          Icon: TreeWithArrowsDown,
          onClick: (event: ClientEventType) => {
            event?.preventDefault();
            removeContextMenu(event);
            dispatchAppEvent(CustomAppEventEnum.SAVE_AS_IMAGE, {
              event,
            });
          },
          uuid: 'Save pipeline as image',
        },
      ]),
    );

    if (target) {
      if (ItemTypeEnum.NODE === target?.type) {
        const block = target?.block;
        const selectedUUID =
          selectedGroupsRef?.current[selectedGroupsRef?.current?.length - 1]?.uuid;

        if (block?.uuid !== selectedUUID) {
          menuItems.unshift(
            ...[
              {
                Icon: OpenInSidekick,
                onClick: (event: ClientEventType) => {
                  event?.preventDefault();

                  dispatchAppEvent(CustomAppEventEnum.TELEPORT_INTO_BLOCK, {
                    block,
                    event: convertEvent(event),
                  });

                  removeContextMenu(event);
                },
                uuid: `Teleport into ${block?.name}`,
              },
              { divider: true },
            ],
          );
        }
      } else if (
        target?.type === ItemTypeEnum.BLOCK &&
        ![BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(target?.block?.type)
      ) {
        menuItems.push(
          ...[
            { divider: true },
            {
              Icon: Trash,
              onClick: (event: ClientEventType) => {
                event?.preventDefault();

                // const itemRemoved = itemsRef?.current?.[target?.id];
                // if (itemRemoved) {
                //   itemRemoved.rect = {
                //     ...itemRemoved?.rect,
                //     diff: itemRemoved?.rect,
                //     height: 0,
                //     left: 0,
                //     top: 0,
                //     width: 0,
                //   };

                //   const element = itemElementsRef?.current?.[target.type]?.[target.id]?.current;
                //   if (element) {
                //     const rect = element.getBoundingClientRect();
                //     itemRemoved.rect.diff.height = rect.height;
                //     itemRemoved.rect.diff.width = rect.width;

                //     element.style.width = '0px';
                //     element.style.height = '0px';
                //     element.style.visibility = 'hidden';
                //     element.style.opacity = '0';
                //     element.style.display = 'none';

                //     delete itemElementsRef.current[target.type][target.id];
                //   }

                //   if (itemRemoved?.node) {
                //     const node = itemsRef.current[itemRemoved.node.id] as NodeType;

                //     const rects1 = [];
                //     const rects2 = [];

                //     itemRemoved?.node?.items?.forEach((item1: any) => {
                //       if (!item1) return;
                //       const item2 = itemsRef.current[typeof item1 === 'string' ? item1 : item1?.id];
                //       if (!item2) return;

                //       rects1.push(item2.rect);
                //       if (itemRemoved?.id !== item2?.id) {
                //         rects2.push(item2.rect);
                //       }
                //     });

                //     const box1 = calculateBoundingBox(rects1);
                //     const box2 = calculateBoundingBox(rects2);

                //     const diffHeight = box1.height - box2.height;
                //     const diffWidth = box1.width - box2.width;

                //     const rect = node?.rect;
                //     node.rect = {
                //       ...node.rect,
                //       diff: rect,
                //       height: rect.height -= diffHeight,
                //       width: rect.width -= diffWidth,
                //     };
                //     node.items = node?.items?.filter(
                //       (item: any) => (typeof item === 'string' ? item : item.id) !== itemRemoved.id
                //     );

                //     itemsRef.current[node.id] = node;
                //   }

                //   delete itemsRef.current[itemRemoved.id];
                // }

                // updateNodeLayouts();

                appHandlersRef.current?.pipelines.update.mutate({
                  event,
                  onSuccess: () => {
                    removeContextMenu(event);
                  },
                  payload: pipeline => ({
                    ...pipeline,
                    blocks: pipeline?.blocks?.filter(
                      (block: BlockType) => block.uuid !== target.block.uuid,
                    ),
                  }),
                });
              },
              uuid: `Remove ${target?.block?.name} from pipeline`,
            },
          ],
        );
      }
    }

    if (data?.node) {
    }

    renderContextMenu(event, menuItems, {
      ...opts,
      rects: {
        bounding: wrapperRef.current.getBoundingClientRect(),
      },
    });
  }

  function buildMenuItemGroupsForPipelineFramework() {
    return (itemIDsByLevelRef?.current ?? []).map((ids: string[], level: number) => {
      const items = sortByKey(
        ids
          ?.map((id: string) => itemsRef.current?.[id])
          ?.filter(i => ItemTypeEnum.BLOCK === i?.type),
        ({ block, title, id }) => block?.name || title || block?.uuid || id,
      );

      return {
        Icon: level === activeLevel?.current ? Check : Group,
        description: () => pluralize('block', ids?.length ?? 0),
        items: items?.map((item: NodeItemType) => {
          const { block, title } = item;

          return {
            onClick: (event?: ClientEventType) => {
              event?.preventDefault();
              removeContextMenu(event);
              alert(`Focus on item for block ${block?.name || block?.uuid} with title ${title}`);
            },
            uuid: title || block?.name || block?.uuid,
          };
        }),
        onClick: (event?: ClientEventType) => {
          event?.preventDefault();
          updateNodeLayouts(event, {
            level,
          });
          removeContextMenu(event);
        },
        uuid: `Blocks grouped at level ${level}`,
      };
    });
  }

  function handleDragStart(event: ClientEventType) {
    DEBUG.dragging && console.log('handleDragStart', event);
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
    DEBUG.dragging && console.log('handleDragEnd', event);
    // setZoomPanDisabled(false);
    // setDragEnabled(false);
    // setDropEnabled(false);
    // containerRef?.current?.classList.remove(stylesBuilder.dragging);
  }

  function handleMouseDown(event: ClientEventType) {
    const { handle, operationType } = event;

    if (handle) {
      handle?.(event);
    }
    DEBUG.dragging && console.log('handleMouseDown', operationType);
    if (EventOperationEnum.DRAG_START !== operationType) {
      setZoomPanDisabled(false);
      setDragEnabled(false);
      setDropEnabled(false);
      containerRef?.current?.classList.remove(stylesBuilder.dragging);
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
    //   node.id === itemDraggingRef?.current?.id
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

  function onDropBlock(event: CustomEvent) {
    DEBUG.dropping && console.log('onDropBlock', event);
    const { event: clientEvent, manager, options } = event.detail;
    const { node } = clientEvent.data;
    const { rect } = options?.kwargs ?? {};

    const { left, top } = rect;

    // const portsUpdated = {
    //   ...portsRef.current,
    // };

    // node?.ports?.forEach(({ id: portID }: PortType) => {
    //   const port1 = portsRef.current[portID];
    //   const port2 = update(port1, {
    //     rect: {
    //       $merge: {
    //         left: left + (port1?.rect?.offset?.left ?? 0),
    //         top: top + (port1?.rect?.offset?.top ?? 0),
    //       },
    //     },
    //   });

    //   portsUpdated[port2.id] = port2;
    // });

    // const payload = {
    //   itemMapping: {
    //     ...itemsRef.current,
    //     [node.id]: node,
    //   },
    //   portMapping: portsUpdated,
    // };

    // DEBUG.dragging && console.log('onDropBlock', payload);

    // DON’T call renderLayout changes or else the item’s rect is changed.
    // mutateModels(payload);
    // renderConnectionLines();

    if (ItemTypeEnum.OUTPUT === node?.type) {
      node.rect = {
        ...node.rect,
        left: left + (node?.rect?.offset?.left ?? 0),
        top: top + (node?.rect?.offset?.top ?? 0),
      };

      dispatchAppEvent(CustomAppEventEnum.OUTPUT_UPDATED, {
        event: convertEvent(event),
        node: node.node,
        output: node,
      });
    }
  }

  function onDropPort(dragTarget: NodeItemType, dropTarget: NodeItemType) {
    if (ItemTypeEnum.PORT === dragTarget.type && ItemTypeEnum.PORT === dropTarget.type) {
      const node = itemDraggingRef.current;
      console.log('Create a new connection for:', node);
    }

    resetAfterDrop();
  }

  return {
    gridDimensions,
    handleContextMenu,
    handleDoubleClick,
    handleDragEnd,
    handleDragStart,
    handleMouseDown,
    onDragInit,
    onDragging,
    onDropPort,
    resetAfterDrop,
    setSnapToGridOnDrag,
    setSnapToGridOnDrop,
    snapToGridOnDrag,
    snapToGridOnDrop,
    submitEventOperation,
  };
}
