import { LayoutConfigType, NodeType, RectTransformationType } from '../../Canvas/interfaces';
import { LayoutDisplayEnum, LayoutStyleEnum } from '../../Canvas/types';
import update from 'immutability-helper';
import { ItemMappingType, ModelMappingType, NodeItemType, RectType } from '../../Canvas/interfaces';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { layoutItemsInGroups, transformRects } from '../../Canvas/utils/rect';
import { startTransition, useEffect, useRef } from 'react';
import {
  ItemElementsType,
  ItemIDsByLevelRef,
  LayoutManagerType,
  ModelManagerType,
  SettingsManagerType,
} from './interfaces';
import {
  ItemStatusEnum,
  RectTransformationScopeEnum,
  ItemTypeEnum,
  LayoutConfigDirectionOriginEnum,
  LayoutConfigDirectionEnum,
  TransformRectTypeEnum,
} from '../../Canvas/types';
import { calculateBoundingBox } from '../../Canvas/utils/rect';
import { flattenArray, indexBy, sortByKey, sum } from '@utils/array';
import { validateFiniteNumber } from '@utils/number';
import { get, set } from '@storage/localStorage';
import { displayable } from './utils/display';
import styles from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import PipelineType from '@interfaces/PipelineType';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { DEBUG } from '@components/v2/utils/debug';
import { ElementRoleEnum } from '@mana/shared/types';
import { getClosestChildRole } from '@utils/elements';

type LayoutManagerProps = {
  canvasRef: React.MutableRefObject<HTMLDivElement>;
  containerRef: React.MutableRefObject<HTMLDivElement>;
  itemElementsRef: LayoutManagerType['itemElementsRef'];
  itemIDsByLevelRef: ItemIDsByLevelRef;
  itemsRef: React.MutableRefObject<ItemMappingType>;
};

export default function useLayoutManager({
  canvasRef,
  containerRef,
  itemElementsRef,
  itemIDsByLevelRef,
  itemsRef,
}: LayoutManagerProps) {
  // The only client publishing this message is the SettingsManager.
  const { dispatchAppEvent } = useAppEventsHandler(
    {
      itemElementsRef,
      uuid: 'LayoutManager',
    } as any,
    {
      [CustomAppEventEnum.UPDATE_NODE_LAYOUTS]: updateLayoutOfItems,
    },
  );

  function rectTransformations({ activeLevel, layoutConfigs, selectedGroupsRef }) {
    const layoutConfig = layoutConfigs?.current?.[activeLevel?.current]?.current ?? {};

    const layoutStyle = layoutConfig?.layoutStyle ?? LayoutStyleEnum.WAVE;
    const direction = layoutConfig?.direction || LayoutConfigDirectionEnum.HORIZONTAL;
    const directionOp =
      LayoutConfigDirectionEnum.HORIZONTAL === direction
        ? LayoutConfigDirectionEnum.VERTICAL
        : LayoutConfigDirectionEnum.HORIZONTAL;

    const layoutStyleTransformations = [];

    const shiftRight =
      (factor: number = 2) =>
      (rects: RectType[]) =>
        Math.max(
          40,
          validateFiniteNumber(
            typeof window !== 'undefined'
              ? (window.innerWidth - calculateBoundingBox(rects).width) / factor
              : 0,
          ),
        );
    const shiftDown =
      (factor: number = 2) =>
      (rects: RectType[]) =>
        Math.max(
          40,
          validateFiniteNumber(
            typeof window !== 'undefined'
              ? (window.innerHeight - calculateBoundingBox(rects).height) / factor
              : 0,
          ),
        );

    const shift = {
      options: (rects: RectType[]) => ({
        offset: {
          left: shiftRight()(rects),
          top: shiftDown()(rects),
        },
      }),
      type: TransformRectTypeEnum.SHIFT,
    };

    const tree = {
      options: () => ({ layout: { direction: direction } }),
      type: TransformRectTypeEnum.LAYOUT_TREE,
    };
    const treecon = [
      {
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return box?.width > containerRef?.current?.getBoundingClientRect()?.width;
        },
        options: () => ({ layout: { direction: LayoutConfigDirectionEnum.HORIZONTAL } }),
        type: TransformRectTypeEnum.LAYOUT_TREE,
      },
      {
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return box?.height > containerRef?.current?.getBoundingClientRect()?.height;
        },
        options: () => ({ layout: { direction: LayoutConfigDirectionEnum.VERTICAL } }),
        type: TransformRectTypeEnum.LAYOUT_TREE,
      },
    ];

    const wavecon = {
      condition: (rects: RectType[]) => {
        const count = rects?.filter?.(rect => (rect?.children?.length ?? 0) >= 1)?.length ?? 0;
        return count / Math.max(rects?.length ?? 1) < 1;
      },
    };
    const wave = {
      options: () => ({
        layout: update(layoutConfig ?? {}, {
          gap: {
            $set: {
              column: 40,
              row: 40,
            },
          },
        }),
        layoutOptions: { amplitude: 200, wavelength: 100 },
      }),
      type: TransformRectTypeEnum.LAYOUT_WAVE,
    };
    const grid = {
      options: () => ({
        layout: update(layoutConfig, {
          gap: {
            $set: {
              column: 40,
              row: 40,
            },
          },
        }),
      }),
      type: TransformRectTypeEnum.LAYOUT_GRID,
    };
    const spiral = {
      options: () => ({
        layout: update(layoutConfig, {
          containerRef: {
            $set: canvasRef,
          },
          gap: {
            $set: {
              column: 160,
              row: 160,
            },
          },
        }),
        layoutOptions: {
          angleStep: Math.PI / 12,
          initialAngle: Math.PI / 6,
        },
      }),
      type: TransformRectTypeEnum.LAYOUT_SPIRAL,
    };

    if (layoutConfig?.rectTransformations) {
      layoutConfig?.rectTransformations?.forEach(({ type }) => {
        if (TransformRectTypeEnum.LAYOUT_TREE === type) {
          layoutStyleTransformations.push(tree);
        } else if (TransformRectTypeEnum.LAYOUT_WAVE === type) {
          layoutStyleTransformations.push(wave);
        } else if (TransformRectTypeEnum.LAYOUT_GRID === type) {
          layoutStyleTransformations.push(grid);
        } else if (TransformRectTypeEnum.LAYOUT_SPIRAL === type) {
          layoutStyleTransformations.push(spiral);
        }
      });
    }

    let defaultTrans = false;
    if (!layoutStyleTransformations?.length) {
      defaultTrans = true;
      layoutStyleTransformations.push(
        ...[
          tree,
          // ...treecon,
        ],
      );
    }

    const mindims = {
      options: () => ({ rect: { height: 300, width: 300 } }),
      type: TransformRectTypeEnum.MIN_DIMENSIONS,
    };
    const reset = { type: TransformRectTypeEnum.RESET };

    const LAYOUT_STYLE_MAPPING = {
      [LayoutStyleEnum.GRID]: [grid],
      [LayoutStyleEnum.SPIRAL]: [spiral],
      [LayoutStyleEnum.TREE]: [tree],
      [LayoutStyleEnum.WAVE]: [wave],
    };
    const transformers: RectTransformationType[] = [];

    if (LayoutDisplayEnum.DETAILED === layoutConfig?.display) {
      const activeGroupConditionSelf = (rect: RectType) => {
        const group = selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1];
        return !group?.uuid || (rect?.block?.uuid === group?.uuid && rect?.children?.length > 0);
      };
      const activeGroupConditionChild = (rect: RectType) => {
        const group = selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1];
        return !group?.uuid || rect?.parent?.block?.uuid === group?.uuid;
      };

      transformers.push(
        ...([
          // reset,
          {
            conditionSelf: (rect: RectType) =>
              !activeGroupConditionSelf(rect) || rect?.children?.length === 0,
            options: () => ({
              defaultRect: (rect: RectType) => {
                const element = itemElementsRef?.current?.[rect?.type]?.[rect?.id]?.current;
                const content = element && getClosestChildRole(element, ElementRoleEnum.CONTENT);
                if (content) {
                  // const contentRect = content?.getBoundingClientRect();
                  const ogstyles = {};
                  ['height', 'width', 'min-height', 'min-width'].forEach(stylename => {
                    ogstyles[stylename] = element?.style?.[stylename];
                    element.style[stylename] = '';
                  });
                  const contentRectWOS = content?.getBoundingClientRect();
                  ['height', 'width', 'min-height', 'min-width'].forEach(stylename => {
                    element.style[stylename] = ogstyles[stylename];
                  });

                  return {
                    height: contentRectWOS?.height,
                    width: contentRectWOS?.width,
                  };
                }

                return {};
              },
            }),
            scope: RectTransformationScopeEnum.SELF,
            type: TransformRectTypeEnum.FIT_TO_SELF,
          },
          {
            conditionSelf: activeGroupConditionChild,
            options: () => ({ layout: { direction: directionOp } }),
            scope: RectTransformationScopeEnum.CHILDREN,
            type: TransformRectTypeEnum.LAYOUT_GRID,
          },
          // {
          //   options: () => ({
          //     layout: update(layoutConfig, {
          //       gap: {
          //         $set: {
          //           column: 40,
          //           row: 40,
          //         },
          //       },
          //     }),
          //   }),
          //   scope: RectTransformationScopeEnum.CHILDREN,
          //   type: TransformRectTypeEnum.LAYOUT_RECTANGLE,
          // },
          {
            conditionSelf: activeGroupConditionSelf,
            options: (rects: RectType[]) => ({
              offset: {
                left: 0,
                top: Math.max(
                  ...flattenArray(rects?.map(rect => rect.children)).map(rect => {
                    const val =
                      (rect?.inner?.badge?.height ?? 0) +
                      (rect?.inner?.badge?.offset?.top ?? 0) +
                      (rect?.inner?.title?.height ?? 0) +
                      (rect?.inner?.title?.offset?.top ?? 0);

                    return validateFiniteNumber(val) ?? 0;
                  }),
                ),
              },
              padding: {
                bottom: 12,
                left: 12,
                right: 12,
                top: 24,
              },
            }),
            scope: RectTransformationScopeEnum.SELF,
            type: TransformRectTypeEnum.FIT_TO_CHILDREN,
          },
          // mindims,
          // ...layoutStyleTransformations,
          // ...(defaultTrans ? [{
          //   ...wave,
          //   ...wavecon,
          // }] : []),
          // {
          //   options: () => ({
          //     layout: update(layoutConfig, {
          //       gap: {
          //         $set: {
          //           column: 120,
          //           row: 120,
          //         },
          //       },
          //     }),
          //   }),
          //   type: TransformRectTypeEnum.LAYOUT_RECTANGLE,
          // },

          ...(LAYOUT_STYLE_MAPPING[layoutStyle] ?? [wave]),
          {
            ...(LAYOUT_STYLE_MAPPING[layoutStyle] ?? [wave]),
            condition: (rects: RectType[]) => {
              const box = calculateBoundingBox(rects);
              return box?.width > canvasRef?.current?.getBoundingClientRect()?.width;
            },
            options: () => ({ layout: { direction: LayoutConfigDirectionEnum.VERTICAL } }),
          },
          {
            // conditionSelf: (rect: RectType) => rect?.children?.length === 0,
            options: (rects: RectType[]) => ({
              offset: {
                left: shiftRight()(rects),
                top: shiftDown()(rects),
              },
            }),
            type: TransformRectTypeEnum.SHIFT,
          },
          {
            options: () => ({
              boundingBox: canvasRef?.current?.getBoundingClientRect(),
              layout: {
                direction: LayoutConfigDirectionEnum.VERTICAL,
              },
            }),
            type: TransformRectTypeEnum.ALIGN_WITHIN_VIEWPORT,
          },
          // {
          //   conditionSelf: (rect: RectType) => rect?.children?.length <= 4,
          //   options: (rects: RectType[]) => ({
          //     offset: {
          //       ...(LayoutConfigDirectionEnum.VERTICAL === direction ? { left: shiftRight(1.85)(rects) } : {}),
          //       ...(LayoutConfigDirectionEnum.HORIZONTAL === direction ? { top: shiftDown(1.85)(rects) } : {}),
          //     },
          //   }),
          //   type: TransformRectTypeEnum.SHIFT,
          // },
          {
            conditionSelf: activeGroupConditionChild,
            scope: RectTransformationScopeEnum.CHILDREN,
            type: TransformRectTypeEnum.SHIFT_INTO_PARENT,
          },
          {
            conditionSelf: activeGroupConditionChild,
            scope: RectTransformationScopeEnum.CHILDREN,
            type: TransformRectTypeEnum.ALIGN_CHILDREN,
          },
        ] as RectTransformationType[]),
      );
    } else if (LayoutDisplayEnum.SIMPLE === layoutConfig?.display) {
      transformers.push(
        ...([
          // {
          //   ...tree,
          //   condition: (rects: RectType[]) => {
          //     const box = calculateBoundingBox(rects);
          //     return box?.width > canvasRef?.current?.getBoundingClientRect()?.width;
          //   },
          //   options: () => ({ layout: { direction: LayoutConfigDirectionEnum.HORIZONTAL } }),
          // },
          // {
          //   ...wave,
          //   condition: (rects: RectType[]) => {
          //     const box = calculateBoundingBox(rects);
          //     return box?.height > canvasRef?.current?.getBoundingClientRect()?.height;
          //   },
          //   options: () => ({ layout: { direction: LayoutConfigDirectionEnum.VERTICAL } }),
          // },
          {
            ...wave,
            condition: (rects: RectType[]) => {
              const box = calculateBoundingBox(rects);
              return 0.75 > box?.height / canvasRef?.current?.getBoundingClientRect()?.height;
            },
            options: () => ({
              layout: update(layoutConfig ?? {}, {
                gap: {
                  $set: {
                    column: 40,
                    row: 40,
                  },
                },
              } as any),
              layoutOptions: { amplitude: 400, wavelength: 100 },
            }),
          },
          {
            ...tree,
            condition: (rects: RectType[]) => {
              const box = calculateBoundingBox(rects);
              return 0.75 < box?.height / canvasRef?.current?.getBoundingClientRect()?.height;
            },
            options: () => ({
              layout: update(layoutConfig ?? {}, {
                gap: {
                  $set: {
                    column: 40,
                    row: 40,
                  },
                },
              } as any),
            }),
          },
          {
            condition: (rects: RectType[]) => {
              const box = calculateBoundingBox(rects);
              return box?.width < canvasRef?.current?.getBoundingClientRect()?.width;
            },
            options: () => ({
              boundingBox: canvasRef?.current?.getBoundingClientRect(),
              layout: {
                direction: LayoutConfigDirectionEnum.HORIZONTAL,
              },
            }),
            type: TransformRectTypeEnum.ALIGN_WITHIN_VIEWPORT,
          },
          {
            condition: (rects: RectType[]) => {
              const box = calculateBoundingBox(rects);
              return box?.height < canvasRef?.current?.getBoundingClientRect()?.height;
            },
            options: () => ({
              boundingBox: canvasRef?.current?.getBoundingClientRect(),
              layout: {
                direction: LayoutConfigDirectionEnum.VERTICAL,
              },
            }),
            type: TransformRectTypeEnum.ALIGN_WITHIN_VIEWPORT,
          },
          {
            condition: (rects: RectType[]) => {
              const box = calculateBoundingBox(rects);
              return box?.height > canvasRef?.current?.getBoundingClientRect()?.height;
            },
            options: (rects: RectType[]) => ({
              offset: {
                top: shiftDown(0.5)(rects),
              },
            }),
            type: TransformRectTypeEnum.SHIFT,
          },
          {
            condition: (rects: RectType[]) => {
              const box = calculateBoundingBox(rects);
              return box?.width > canvasRef?.current?.getBoundingClientRect()?.width;
            },
            options: (rects: RectType[]) => ({
              offset: {
                top: shiftRight(0.5)(rects),
              },
            }),
            type: TransformRectTypeEnum.SHIFT,
          },
        ] as RectTransformationType[]),
      );
    }

    DEBUG.layoutManager && console.log('transformers', transformers);

    return transformers;
  }

  function updateLayoutOfItems(event: CustomAppEvent) {
    const { manager, nodes: nodesFiltered, options } = event?.detail ?? {};

    const { activeLevel, layoutConfigs, selectedGroupsRef } = manager as SettingsManagerType;
    const { classNames, conditions, styles, updateRectOnly } = options?.kwargs ?? {};

    const layoutConfig = layoutConfigs?.current?.[activeLevel?.current]?.current ?? {};

    const rectTransformationsByLevel = {} as Record<number, RectTransformationType[]>;
    const itemsUpdated = {} as ItemMappingType;

    // Don’t do any level filtering here, it’ll be done at the Canvas level.
    // Update the layout of items across every level.
    const arrs =
      nodesFiltered?.length > 0 ? [nodesFiltered.map(item => item.id)] : itemIDsByLevelRef?.current;

    const itemsByNodeID = {};
    const rectsInitial = {};

    arrs?.forEach((ids: string[], level: number) => {
      const nodes = [] as NodeType[];

      ids.forEach((nodeID: string) => {
        const node = { ...(itemsRef?.current?.[nodeID] as NodeType) };
        if (!node) return;

        rectsInitial[node.id] = {
          left: node?.rect?.left ?? 0,
          top: node?.rect?.top ?? 0,
          width: node?.rect?.width ?? 0,
          height: node?.rect?.height ?? 0,
        };

        if (ItemTypeEnum.NODE === node?.type) {
          itemsByNodeID[node.id] = [[...(node.items ?? [])]];
          const arr = node.items?.reduce((acc, i1) => {
            if (!i1) return acc;
            const item = itemsRef?.current?.[typeof i1 === 'string' ? i1 : i1.id] as NodeItemType;
            if (!item) return acc;

            return acc.concat(item);
          }, []);

          if (itemsByNodeID[node.id] === arr?.length) {
            itemsByNodeID[node.id].push(arr);
          }

          node.items = arr;

          if ((conditions ?? []).length === 0 || displayable(node, conditions)) {
            nodes.push(node);
          }
        }
      }, []);

      const rects: RectType[] = [];
      const rectsPrev = {};
      nodes?.forEach(node => {
        rectsPrev[node.id] = { ...node.rect };

        const itemsDisplayable = [...(node?.items ?? [])].filter(
          item => !conditions || displayable(item, conditions),
        );

        const nodeRect = {
          ...node?.rect,
          block: node.block,
          children:
            itemsDisplayable?.reduce((acc, item2: NodeType) => {
              if (!item2) return acc;

              const item2a = { ...(itemsRef?.current?.[item2?.id] ?? ({} as NodeType)) };
              if (!item2a) return acc;

              rectsPrev[item2a.id] = { ...item2a.rect };

              return acc.concat({
                ...item2a.rect,
                id: item2a.id,
                left: null,
                top: null,
                upstream:
                  (item2a as NodeType)?.upstream?.reduce((acc3: RectType[], id3: string) => {
                    const item3 = { ...itemsRef?.current?.[id3] };
                    if (!item3) return acc3;

                    return acc3.concat({ ...item3.rect, id: id3, left: null, top: null });
                  }, []) ?? [],
              });
            }, []) ?? [],
          diff: node?.rect,
          id: node.id,
          type: node.type,
          upstream: (node?.upstream ?? [])?.map((id: string) => ({
            ...itemsRef?.current?.[id]?.rect,
            id,
            left: null,
            top: null,
          })),
        };

        // if (node?.items?.length !== nodeRect?.children?.length) {
        //   console.error(
        //     `[Attempting to build rect children] Node ${node.id} in level ${level} ` +
        //     `has ${node?.items?.length} items, ` +
        //     `but rect has ${nodeRect?.children?.length}`,
        //     node,
        //     nodeRect,
        //   );
        //   return;
        // }
        const el = itemElementsRef?.current?.[node.id];
        if (el) {
          el.style.width = '';
          el.style.height = '';
          el.style.minWidth = '';
          el.style.minHeight = '';
        }

        rects.push(nodeRect);
      });

      const trans = rectTransformations({ activeLevel, layoutConfigs, selectedGroupsRef });
      rectTransformationsByLevel[level] = trans;

      const nodesMapping = indexBy(nodes, (node: NodeItemType) => node.id);
      const nodesTransformed = [] as NodeType[];

      // This can reshuffle the rects, so the order is not guaranteed.
      const rectsTransformed = rects?.length >= 1 ? transformRects(rects, trans) : [];
      sortByKey(rectsTransformed, ({ left, top }) =>
        LayoutConfigDirectionEnum.HORIZONTAL === layoutConfig?.direction ? left : top,
      ).forEach((rect: RectType, index: number) => {
        let node = nodesMapping[rect.id];
        const itemsT = [];

        // if (node?.items?.length !== rect?.children?.length) {
        //   console.error(
        //     `[Post transformations] Node ${node.id} in level ${level} has ${node?.items?.length} items, ` +
        //     `but rect has ${rect?.children?.length}`,
        //     node,
        //     rect,
        //   );
        //   return;
        // }

        node?.items?.forEach((i2: any, idx: number) => {
          const rect2 = { ...(rect?.children?.[idx] as RectType) };
          const item2 = {
            ...(itemsRef?.current?.[typeof i2 === 'string' ? i2 : i2.id] as NodeType),
          };

          // if (conditions && !displayable(item2, conditions)) return;
          // console.log(item2, conditions)
          item2.rect = (item2?.rect ?? {}) as RectType;

          item2.rect.height = rect2.height;
          item2.rect.left = rect2.left;
          item2.rect.top = rect2.top;
          item2.rect.width = rect2.width;
          // item2.rect.diff = rectsPrev[item2.id];

          itemsT.push(item2);
        });

        const itemsToAdd = [];
        if (itemsByNodeID[node.id]?.length === itemsT?.length) {
          itemsByNodeID[node.id].push(itemsT);
          itemsToAdd.push(...itemsT);
        } else {
          itemsToAdd.push(...itemsByNodeID[node.id]?.[itemsByNodeID[node.id].length - 1]);
        }

        node = update(node, {
          // Index is used to delay the animation when displaying the node.
          index: { $set: index },
          items: { $set: itemsT },
        });

        node.rect.height = rect.height;
        node.rect.left = rect.left;
        node.rect.top = rect.top;
        node.rect.width = rect.width;
        // node.rect.diff = rectsPrev[node.id];

        nodesTransformed.push(node);
      });

      nodesTransformed?.forEach((node: NodeType) => {
        itemsUpdated[node.id] = node;

        node?.items?.forEach((itemNode: any) => {
          itemsUpdated[typeof itemNode === 'string' ? itemNode : itemNode.id] = itemNode;
        });
      });

      (DEBUG.layout || DEBUG.layoutManager) &&
        console.log('[LayoutManager] updateLayoutItems:', nodesTransformed);
    });

    const items = [];
    Object.values(itemsUpdated).forEach(item => {
      const itemPrev = itemsRef?.current?.[item.id];
      const rectPrev = rectsInitial[item?.id] ?? { ...itemPrev?.rect };

      item.rect.diff = {
        height: rectPrev?.height ?? 0,
        left: rectPrev?.left ?? 0,
        top: rectPrev?.top ?? 0,
        width: rectPrev?.width ?? 0,
      };
      item.version = (itemPrev?.version ?? -1) + 1;
      if (ItemStatusEnum.PENDING_LAYOUT === item?.status) {
        item.status = ItemStatusEnum.READY;
      }

      itemsRef.current[item.id] = { ...item };
      items.push({ ...item });
    });

    dispatchAppEvent(CustomAppEventEnum.UPDATE_CACHE_ITEMS, {
      nodes: items,
    });

    dispatchAppEvent(CustomAppEventEnum.NODE_RECT_UPDATED, {
      nodes: items,
    });

    // Don’t do any level filtering here, it’ll be done at the Canvas level.
    // dispatchAppEvent(CustomAppEventEnum.NODE_LAYOUTS_CHANGED, {
    //   nodes: items,
    //   options: {
    //     kwargs: {
    //       classNames,
    //       conditions,
    //       styles,
    //     },
    //   },
    // });
  }
}
