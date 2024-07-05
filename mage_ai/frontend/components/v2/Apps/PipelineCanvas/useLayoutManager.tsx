import { LayoutConfigType, NodeType, RectTransformationType } from '../../Canvas/interfaces';
import { LayoutDisplayEnum } from '../../Canvas/types';
import update from 'immutability-helper';
import { ItemMappingType, ModelMappingType, NodeItemType, RectType } from '../../Canvas/interfaces';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { layoutItemsInGroups, transformRects } from '../../Canvas/utils/rect';
import { startTransition, useEffect, useRef } from 'react';
import { ActiveLevelRefType, ItemIDsByLevelRef, LayoutManagerType, ModelManagerType } from './interfaces';
import { ItemStatusEnum, RectTransformationScopeEnum, ItemTypeEnum, LayoutConfigDirectionOriginEnum, LayoutConfigDirectionEnum, TransformRectTypeEnum } from '../../Canvas/types';
import { calculateBoundingBox } from '../../Canvas/utils/rect';
import { flattenArray, indexBy, sum } from '@utils/array';
import { validateFiniteNumber } from '@utils/number';
import { get, set } from '@storage/localStorage';
import { selectKeys } from '@utils/hash';
import styles from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import PipelineType from '@interfaces/PipelineType';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { DEBUG } from '@components/v2/utils/debug';

function builderLocalStorageKey(uuid: string) {
  return `pipeline_builder_canvas_local_settings_${uuid}`;
}

type LayoutConfigRef = React.MutableRefObject<LayoutConfigType>;

type LayoutManagerProps = {
  activeLevel: ActiveLevelRefType;
  canvasRef: React.MutableRefObject<HTMLDivElement>;
  containerRef: React.MutableRefObject<HTMLDivElement>;
  itemIDsByLevelRef: ItemIDsByLevelRef;
  itemsRef: React.MutableRefObject<ItemMappingType>;
  transformState: React.MutableRefObject<ZoomPanStateType>;
  pipelineUUID: string;
  updateNodeItems: ModelManagerType['updateNodeItems'];
};

export default function useLayoutManager({
  activeLevel,
  canvasRef,
  containerRef,
  itemIDsByLevelRef,
  itemsRef,
  pipelineUUID,
  transformState,
}: LayoutManagerProps): LayoutManagerType {
  // const phaseRef = useRef<number>(0);
  const validLevels = useRef<number[]>(null);
  const layoutConfigs = useRef<LayoutConfigRef[]>([
    useRef<LayoutConfigType>({
      containerRef,
      direction: LayoutConfigDirectionEnum.VERTICAL,
      display: LayoutDisplayEnum.SIMPLE,
      gap: { column: 40, row: 40 },
      origin: LayoutConfigDirectionOriginEnum.LEFT,
      rectTransformations: null,
      transformStateRef: transformState,
      viewportRef: canvasRef,
    }),
    useRef<LayoutConfigType>(null),
    useRef<LayoutConfigType>(null),
  ]);
  const layoutConfig = layoutConfigs.current[activeLevel.current];
  const optionalGroupsVisible = useRef<boolean>(null);

  const { dispatchAppEvent } = useAppEventsHandler({
    layoutConfig,
    layoutConfigs,
  } as LayoutManagerType, {
    [CustomAppEventEnum.NODE_RECT_UPDATED]: updateLayoutOfItems,
    [CustomAppEventEnum.UPDATE_NODE_LAYOUTS]: updateLayoutOfItems,
  });

  // TODO: fix local settings
  // const settings = get(builderLocalStorageKey(pipelineUUID));

  // if (settings?.activeLevel !== null) {
  //   activeLevel.current = settings?.activeLevel;
  // }
  // if (settings?.optionalGroupsVisible !== null) {
  //   optionalGroupsVisible.current = settings?.optionalGroupsVisible;
  // }
  // layoutConfig.current ||= {};

  // layoutConfig.current.containerRef = containerRef;
  // layoutConfig.current.display = LayoutDisplayEnum.SIMPLE;
  // layoutConfig.current.direction = settings?.layoutConfig?.direction ?? LayoutConfigDirectionEnum.HORIZONTAL;
  // layoutConfig.current.gap = { column: 40, row: 40 };
  // layoutConfig.current.origin = LayoutConfigDirectionOriginEnum.LEFT;
  // layoutConfig.current.rectTransformations = settings?.layoutConfig?.rectTransformations ?? null;
  // layoutConfig.current.transformStateRef = transformState;
  // layoutConfig.current.viewportRef = canvasRef;

  function updateLocalSettings(value?: any) {
    if ('optionalGroupVisibility' in (value ?? {})) {
      optionalGroupsVisible.current = value ?? false;
    }

    const save = {
      activeLevel: activeLevel?.current ?? 0,
      layoutConfig: {
        direction: layoutConfig?.current?.direction ?? null,
        rectTransformations: layoutConfig?.current?.rectTransformations?.reduce((acc, { type }) =>
          [
            TransformRectTypeEnum.LAYOUT_TREE,
            TransformRectTypeEnum.LAYOUT_WAVE,
            TransformRectTypeEnum.LAYOUT_RECTANGLE,
            TransformRectTypeEnum.LAYOUT_GRID,
            TransformRectTypeEnum.LAYOUT_SPIRAL,
          ].includes(type) ? acc.concat({ type } as any) : acc,
          []),
      },
      optionalGroupsVisible: optionalGroupsVisible?.current ?? false,
    };

    set(builderLocalStorageKey(pipelineUUID), save);

    const val = optionalGroupsVisible?.current ?? false;
    if (val) {
      containerRef?.current?.classList.remove(styles['optional-hidden']);
    } else {
      containerRef?.current?.classList.add(styles['optional-hidden']);
    }
  }

  function setActiveLevel(levelArg?: number) {
    const levelPrevious: number = activeLevel?.current ?? null;
    levelPrevious !== null &&
      containerRef?.current?.classList.remove(styles[`level-${levelPrevious}-active`]);

    let level: number = levelArg ?? (activeLevel?.current ?? 0);
    if (validLevels?.current?.length >= 1) {
      const idx = validLevels.current.findIndex(i => i === level);
      level = validLevels.current[idx + 1] ?? validLevels.current[0];
    } else {
      level += (levelArg === null ? 1 : 0);
      if (level >= itemIDsByLevelRef?.current?.length) {
        level = 0;
      }
    }

    activeLevel.current = level;
    containerRef?.current?.classList.add(styles[`level-${level}-active`]);
    containerRef?.current?.classList.add(
      styles[`display-${layoutConfig.current.display ?? LayoutDisplayEnum.SIMPLE}`]);
    updateLocalSettings()
  }

  function updateLayoutConfig(config: LayoutConfigType) {
    layoutConfig.current = {
      ...layoutConfig.current,
      ...config,
    };
    updateLocalSettings();
  }

  function rectTransformations() {
    const level = activeLevel?.current ?? 0;
    const direction = layoutConfig?.current?.direction || LayoutConfigDirectionEnum.HORIZONTAL;
    const directionOp = LayoutConfigDirectionEnum.HORIZONTAL === direction
      ? LayoutConfigDirectionEnum.VERTICAL
      : LayoutConfigDirectionEnum.HORIZONTAL;

    const layoutStyleTransformations = [];

    const shift = {
      options: (rects: RectType[]) => {
        const box = calculateBoundingBox(rects);

        return {
          offset: {
            left: Math.max(
              40,
              validateFiniteNumber(typeof window !== 'undefined' ? (window.innerWidth - box.width) / 2 : 0),
            ),
            top: Math.max(
              40,
              validateFiniteNumber(typeof window !== 'undefined' ? (window.innerHeight - box.height) / 2 : 0),
            ),
          },
        };
      },
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
        layout: update(layoutConfig?.current ?? {}, {
          gap: {
            $set: {
              column: 40,
              row: 40,
            },
          },
        }),
        layoutOptions: { amplitude: 200, wavelength: 300 }
      }),
      type: TransformRectTypeEnum.LAYOUT_WAVE,
    };

    if (layoutConfig?.current?.rectTransformations) {
      layoutConfig?.current?.rectTransformations?.forEach(({
        type,
      }) => {
        if (TransformRectTypeEnum.LAYOUT_TREE === type) {
          layoutStyleTransformations.push(tree);
        } else if (TransformRectTypeEnum.LAYOUT_WAVE === type) {
          layoutStyleTransformations.push(wave);
        } else if (TransformRectTypeEnum.LAYOUT_RECTANGLE === type) {
          layoutStyleTransformations.push({
            options: () => ({
              layout: update(layoutConfig?.current, {
                gap: {
                  $set: {
                    column: 80,
                    row: 80,
                  },
                },
              }),
            }),
            type: TransformRectTypeEnum.LAYOUT_RECTANGLE,
          });
        } else if (TransformRectTypeEnum.LAYOUT_GRID === type) {
          layoutStyleTransformations.push({
            options: () => ({
              layout: update(layoutConfig?.current, {
                gap: {
                  $set: {
                    column: 40,
                    row: 40,
                  },
                },
              }),
            }),
            type: TransformRectTypeEnum.LAYOUT_GRID,
          });
        } else if (TransformRectTypeEnum.LAYOUT_SPIRAL === type) {
          layoutStyleTransformations.push({
            options: () => ({
              layout: update(layoutConfig?.current, {
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
          });
        }
      });
    }

    let defaultTrans = false;
    if (!layoutStyleTransformations?.length) {
      defaultTrans = true;
      layoutStyleTransformations.push(...[
        tree,
        ...treecon,
      ]);
    }

    const mindims = {
      options: () => ({ rect: { height: 300, width: 300 } }),
      type: TransformRectTypeEnum.MIN_DIMENSIONS,
    };

    const transformers: RectTransformationType[] = [
      {
        type: TransformRectTypeEnum.RESET,
      },
    ];

    if (LayoutDisplayEnum.DETAILED === layoutConfig?.current?.display) {
      transformers.push(...[
        {
          options: () => ({ layout: { direction: directionOp } }),
          scope: RectTransformationScopeEnum.CHILDREN,
          type: TransformRectTypeEnum.LAYOUT_TREE,
        },
        {
          options: (rects: RectType[]) => ({
            offset: {
              left: 0,
              top: Math.max(
                ...flattenArray(rects?.map(rect => rect.children)).map(
                  (rect) => {
                    const val = (rect?.inner?.badge?.height ?? 0) +
                      (rect?.inner?.badge?.offset?.top ?? 0) +
                      (rect?.inner?.title?.height ?? 0) +
                      (rect?.inner?.title?.offset?.top ?? 0);

                    return validateFiniteNumber(val) ?? 0;
                  }
                ),
              ),
            },
            padding: {
              bottom: 12,
              left: 12,
              right: 12,
              top: 100,
            },
          }),
          scope: RectTransformationScopeEnum.SELF,
          type: TransformRectTypeEnum.FIT_TO_CHILDREN,
        },
        mindims,
        ...layoutStyleTransformations,
        ...(defaultTrans ? [{

          ...wave,
          ...wavecon,
        }] : []),
        shift,
        {
          scope: RectTransformationScopeEnum.CHILDREN,
          type: TransformRectTypeEnum.SHIFT_INTO_PARENT,
        },
        {
          scope: RectTransformationScopeEnum.CHILDREN,
          type: TransformRectTypeEnum.ALIGN_CHILDREN,
        },
      ] as RectTransformationType[]);
    } else if (LayoutDisplayEnum.SIMPLE === layoutConfig?.current?.display) {
      transformers.push(...[
        mindims,
        ...layoutStyleTransformations,
        shift,
      ] as RectTransformationType[]);
    }

    return transformers;
  }

  function updateLayoutOfItems(event: CustomAppEvent) {
    const { options } = event?.detail ?? {};
    const { layoutConfig, level } = options?.kwargs ?? {};

    if (layoutConfig) {
      updateLayoutConfig(layoutConfig)
    }

    const itemsUpdated = {} as ItemMappingType;

    // Update the layout of items across every level.
    itemIDsByLevelRef?.current?.forEach((ids: string[], level: number) => {
      const nodes = [] as NodeType[];

      ids.forEach((nodeID: string) => {
        const node = itemsRef?.current?.[nodeID] as NodeType;
        if (!node) return;

        if (ItemTypeEnum.NODE === node?.type) {
          node.items = node.items?.reduce((acc, i1) => {
            if (!i1) return acc;
            const item = itemsRef?.current?.[typeof i1 === 'string' ? i1 : i1.id] as NodeItemType;
            if (!item) return acc;

            return acc.concat(item);
          }, []);

          nodes.push(node);
        }
      }, []);

      const rects: RectType[] = [];
      nodes?.forEach((node) => {
        const nodeRect = {
          ...node?.rect,
          children: node?.items?.reduce((acc, item2: NodeType) => {
            if (!item2) return acc;

            const item2a = itemsRef?.current?.[item2?.id] ?? {} as NodeType;
            if (!item2a) return acc;

            return acc.concat({
              ...item2a.rect,
              id: item2a.id,
              left: null,
              top: null,
              upstream: (item2a as NodeType)?.upstream?.reduce((acc3: RectType[], id3: string) => {
                const item3 = itemsRef?.current?.[id3];
                if (!item3) return acc3;

                return acc3.concat({ ...item3.rect, id: id3, left: null, top: null });
              }, []) ?? [],
            });
          }, []) ?? [],
          id: node.id,
          upstream: (node?.upstream ?? [])?.map((id: string) => ({
            ...itemsRef?.current?.[id]?.rect,
            id,
            left: null,
            top: null,
          })),
        };

        if (node?.items?.length !== nodeRect?.children?.length) {
          console.error(
            `[Attempting to build rect children] Node ${node.id} in level ${level} ` +
            `has ${node?.items?.length} items, ` +
            `but rect has ${nodeRect?.children?.length}`,
            node,
            nodeRect,
          );
          return;
        }

        rects.push(nodeRect);
      });

      const trans = rectTransformations();

      const nodesMapping = indexBy(nodes, (node: NodeItemType) => node.id);
      const nodesTransformed = [] as NodeType[];

      // This can reshuffle the rects, so the order is not guaranteed.
      const rectsTransformed = transformRects(rects, trans);
      rectsTransformed.forEach((rect: RectType) => {
        let node = nodesMapping[rect.id];
        const itemsT = [];

        if (node?.items?.length !== rect?.children?.length) {
          console.error(
            `[Post transformations] Node ${node.id} in level ${level} has ${node?.items?.length} items, ` +
            `but rect has ${rect?.children?.length}`,
            node,
            rect,
          );
          return;
        }

        node?.items?.forEach((i2: any, idx: number) => {
          const rect2 = rect?.children?.[idx] as RectType;
          const item2 = itemsRef?.current?.[typeof i2 === 'string' ? i2 : i2.id] as NodeType;

          item2.rect.height = rect2.height;
          item2.rect.left = rect2.left;
          item2.rect.top = rect2.top;
          item2.rect.width = rect2.width;

          itemsT.push(item2);
        });

        node = update(node, {
          items: { $set: itemsT },
        });
        node.rect.height = rect.height;
        node.rect.left = rect.left;
        node.rect.top = rect.top;
        node.rect.width = rect.width;

        nodesTransformed.push(node);
      });

      nodesTransformed?.forEach((node: NodeType) => {
        itemsUpdated[node.id] = node;

        node?.items?.forEach((itemNode: any) => {
          itemsUpdated[typeof itemNode === 'string' ? itemNode : itemNode.id] = itemNode;
        });
      });

      (DEBUG.layout || DEBUG.layoutManager) && console.log('[LayoutManager] updateLayoutItems:', nodesTransformed);
    });

    const items = [];
    Object.values(itemsUpdated).forEach((item) => {
      const itemPrev = itemsRef?.current?.[item.id];
      item.version = (itemPrev?.version ?? -1) + 1;
      if (ItemStatusEnum.PENDING_LAYOUT === item?.status) {
        item.status = ItemStatusEnum.READY;
      }

      itemsRef.current[item.id] = item;
      items.push(item);
    });

    dispatchAppEvent(CustomAppEventEnum.NODE_LAYOUTS_CHANGED, {
      nodes: items,
    });

    setActiveLevel(level ?? activeLevel?.current ?? 0);
  }

  return {
    layoutConfig,
    setActiveLevel,
    updateLayoutConfig,
  };
}
