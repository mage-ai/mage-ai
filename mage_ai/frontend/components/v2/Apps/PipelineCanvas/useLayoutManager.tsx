import { DragItem, LayoutConfigType, NodeType } from '../../Canvas/interfaces';
import update from 'immutability-helper';
import { ItemMappingType, ModelMappingType, NodeItemType, RectType } from '../../Canvas/interfaces';
import { ModelManagerType } from './useModelManager';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { layoutItemsInGroups, transformRects } from '../../Canvas/utils/rect';
import { useEffect, useRef } from 'react';
import { ActiveLevelRefType, ItemIDsByLevelRef } from './interfaces';
import { RectTransformationScopeEnum, ItemTypeEnum, LayoutConfigDirectionOriginEnum, LayoutConfigDirectionEnum, TransformRectTypeEnum } from '../../Canvas/types';
import { calculateBoundingBox } from '../../Canvas/utils/rect';
import { flattenArray } from '@utils/array';
import { validateFiniteNumber } from '@utils/number';
import { get, set } from '@storage/localStorage';
import { selectKeys } from '@utils/hash';
import styles from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import PipelineType from '@interfaces/PipelineType';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';

function builderLocalStorageKey(uuid: string) {
  return `pipeline_builder_canvas_local_settings_${uuid}`;
}

type LayoutManagerProps = {
  activeLevel: ActiveLevelRefType;
  canvasRef: React.MutableRefObject<HTMLDivElement>;
  containerRef: React.MutableRefObject<HTMLDivElement>;
  itemIDsByLevelRef: ItemIDsByLevelRef;
  itemsRef: React.MutableRefObject<ItemMappingType>;
  setItemsState: React.Dispatch<React.SetStateAction<ItemMappingType>>;
  transformState: React.MutableRefObject<ZoomPanStateType>;
  pipeline: PipelineExecutionFrameworkType
  updateNodeItems: ModelManagerType['updateNodeItems'];
};

export type LayoutManagerType = {
  updateLayoutOfItems: () => ItemMappingType;
  updateLayoutConfig: (config: LayoutConfigType) => void;
  layoutConfig: React.MutableRefObject<LayoutConfigType>;
  activeLevel: React.MutableRefObject<number>;
  localSettings: React.MutableRefObject<{
    activeLevel: number;
    layoutConfig: LayoutConfigType;
    optionalGroupsVisible: boolean;
  }>;
  setActiveLevel: (level?: number) => void;
  setArray: React.Dispatch<React.SetStateAction<NodeItemType[]>>;
};

export default function useLayoutManager({
  pipeline,
  canvasRef,
  containerRef,
  itemIDsByLevelRef,
  setItemRects,
  itemsRef,
  transformState,
}: LayoutManagerProps): LayoutManagerType {
  const validLevels = useRef<number[]>(null);
  const phaseRef = useRef<number>(0);
  const activeLevel = useRef<number>(null);
  const layoutConfig = useRef<LayoutConfigType>(null);
  const optionalGroupsVisible = useRef<boolean>(null);

  useEffect(() => {
    if (phaseRef.current === 0 && pipeline?.uuid) {
      const settings = get(builderLocalStorageKey(pipeline?.uuid));
      console.log('settings', settings, pipeline?.uuid)

      if (settings) {

        if (settings?.activeLevel !== null) {
          activeLevel.current = settings?.activeLevel;
        }
        if (settings?.optionalGroupsVisible !== null) {
          optionalGroupsVisible.current = settings?.optionalGroupsVisible;
        }
        layoutConfig.current ||= {};

        layoutConfig.current.containerRef = containerRef;
        layoutConfig.current.direction = settings?.layoutConfig?.direction ?? LayoutConfigDirectionEnum.HORIZONTAL;
        layoutConfig.current.gap = { column: 40, row: 40 };
        layoutConfig.current.origin = LayoutConfigDirectionOriginEnum.LEFT;
        layoutConfig.current.rectTransformations = settings?.layoutConfig?.rectTransformations ?? null;
        layoutConfig.current.transformStateRef = transformState;
        layoutConfig.current.viewportRef = canvasRef;

        phaseRef.current += 1;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline]);

  // console.log('layoutConfig', layoutConfig.current)

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

    set(builderLocalStorageKey(pipeline?.uuid), save);

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
    const directions = [
      level === 1
        ? layoutConfig?.current?.direction
        : level === 2
          ? layoutConfig?.current?.direction
          : LayoutConfigDirectionEnum.VERTICAL === layoutConfig?.current?.direction
            ? LayoutConfigDirectionEnum.HORIZONTAL
            : LayoutConfigDirectionEnum.VERTICAL,
      level === 1
        ? layoutConfig?.current?.direction
        : level === 2
          ? LayoutConfigDirectionEnum.VERTICAL === layoutConfig?.current?.direction
            ? LayoutConfigDirectionEnum.HORIZONTAL
            : LayoutConfigDirectionEnum.VERTICAL
          : layoutConfig?.current?.direction,
    ];

    const layoutStyleTransformations = [];

    const shift =
    {
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
      options: () => ({ layout: { direction: directions[1] } }),
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

    return [
      // Give min height of 300px
      {
        options: () => ({ layout: { direction: directions[0] } }),
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
            top: 12,
          },
        }),
        scope: RectTransformationScopeEnum.SELF,
        type: TransformRectTypeEnum.FIT_TO_CHILDREN,
      },
      {
        options: () => ({ rect: { height: 300 } }),
        type: TransformRectTypeEnum.MIN_DIMENSIONS,
      },
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
    ];
  }

  function updateLayoutOfItems(): ItemMappingType {
    const itemsUpdated = {} as ItemMappingType;

    // Update the layout of items across every level.
    itemIDsByLevelRef?.current?.forEach((ids: string[], level: number) => {
      const nodes = [] as NodeType[];

      ids.forEach((nodeID: string) => {
        const node = itemsRef?.current?.[nodeID] as NodeType;

        if (ItemTypeEnum.NODE === node?.type) {
          node.items = node.items?.map(({ id: itemID }) => {
            const item = itemsRef?.current?.[itemID] as NodeItemType;
            return item;
          });

          nodes.push(node);
        }
      });

      let nodesTransformed = [] as NodeType[];

      const rects = nodes?.map((node) => ({
        ...node?.rect,
        id: node.id,
        children: node?.items?.map(({ id }) => {
          const item = itemsRef?.current?.[id] ?? {} as NodeType;

          return {
            ...item.rect,
            id,
            left: null,
            top: null,
            upstream: item?.upstream?.map((id: string) => ({
              ...itemsRef?.current?.[id]?.rect,
              id,
              left: null,
              top: null,
            })),
          };
        }),
        upstream: node?.upstream?.map((id: string) => ({
          ...itemsRef?.current?.[id]?.rect,
          id,
          left: null,
          top: null,
        })),
      }));

      const trans = rectTransformations();

      nodesTransformed = transformRects(
        rects,
        trans,
      ).map((rect: RectType, idx: number) => {
        const node = nodes[idx];

        return {
          ...node,
          items: node?.items?.map((item: NodeItemType, idx: number) => ({
            ...item,
            rect: {
              ...item?.rect,
              ...rect?.children?.[idx],
            },
          })),
          rect: {
            ...node?.rect,
            ...rect,
          },
        };
      });

      nodesTransformed?.forEach((node: NodeType) => {
        itemsUpdated[node.id] = node;

        node?.items?.forEach((itemNode: DragItem) => {
          itemsUpdated[itemNode.id] = itemNode;
        });
      });

    });

    Object.values(itemsUpdated).forEach((item) => {
      itemsRef.current[item.id] = item;
    });

    setItemRects(Object.values(itemsRef.current ?? {}).map(i => i));

    setActiveLevel(activeLevel?.current ?? 0);
  }

  return {
    activeLevel,
    layoutConfig,
    setActiveLevel,
    updateLayoutConfig,
    updateLayoutOfItems,
  };
}
