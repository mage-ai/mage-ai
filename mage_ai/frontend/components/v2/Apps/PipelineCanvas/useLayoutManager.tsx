import { DragItem, LayoutConfigType, NodeType } from '../../Canvas/interfaces';
import { ItemMappingType, ModelMappingType, NodeItemType, RectType } from '../../Canvas/interfaces';
import { ModelManagerType } from './useModelManager';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { layoutItemsInGroups, transformRects } from '../../Canvas/utils/rect';
import { useRef } from 'react';
import { ActiveLevelRefType, ItemIDsByLevelRef } from './interfaces';
import { RectTransformationScopeEnum, ItemTypeEnum, LayoutConfigDirectionOriginEnum, LayoutConfigDirectionEnum, TransformRectTypeEnum } from '../../Canvas/types';
import { calculateBoundingBox, getMaxOffset } from '../../Canvas/utils/rect';
import { flattenArray } from '@utils/array';

type LayoutManagerProps = {
  activeLevel: ActiveLevelRefType;
  canvasRef: React.MutableRefObject<HTMLDivElement>;
  containerRef: React.MutableRefObject<HTMLDivElement>;
  itemIDsByLevelRef: ItemIDsByLevelRef;
  itemsRef: React.MutableRefObject<ItemMappingType>;
  layoutConfig: React.MutableRefObject<LayoutConfigType>;
  setItemsState: React.Dispatch<React.SetStateAction<ItemMappingType>>;
  transformState: React.MutableRefObject<ZoomPanStateType>;
  updateNodeItems: ModelManagerType['updateNodeItems'];
};

export type LayoutManagerType = {
  renderLayoutChanges: (opts?: { level?: number; items?: ItemMappingType }) => void;
  updateLayoutOfItems: () => ItemMappingType;
};

export default function useLayoutManager({
  activeLevel,
  canvasRef,
  containerRef,
  itemIDsByLevelRef,
  itemsRef,
  layoutConfig,
  setItemsState,
  transformState,
  updateNodeItems,
}: LayoutManagerProps): LayoutManagerType {
  function renderLayoutChanges(opts?: { level?: number; items?: ItemMappingType }) {
    let itemMapping = opts?.items;
    if (!(itemMapping ?? false)) {
      const ids = itemIDsByLevelRef?.current[opts.level] ?? [];
      itemMapping = ids?.reduce((acc, id) => {
        acc[id] = itemsRef.current[id];
        return acc;
      }, {} as ItemMappingType);
    }

    setItemsState(prev => ({
      ...prev,
      ...itemMapping,
    }));
  }

  function rectTransformations() {
    const level = activeLevel?.current ?? 0;
    const directions = [
      level === 1
        ? LayoutConfigDirectionEnum.HORIZONTAL
        : level === 2
        ? LayoutConfigDirectionEnum.HORIZONTAL
          : LayoutConfigDirectionEnum.VERTICAL,
      level === 1
        ? LayoutConfigDirectionEnum.HORIZONTAL
        : level === 2
        ? LayoutConfigDirectionEnum.VERTICAL
          : LayoutConfigDirectionEnum.HORIZONTAL,
    ];

    return [
      {
        options: () => ({ layout: { direction: directions[0] } }),
        scope: RectTransformationScopeEnum.CHILDREN,
        type: TransformRectTypeEnum.TREE,
      },
      {
        options: (rects: RectType[]) => ({
          offset: {
            left: 0,
            top: Math.max(
              ...flattenArray(rects?.map(rect => rect.children)).map(
                (rect) =>
                  (rect?.inner?.badge?.height ?? 0) +
                  (rect?.inner?.badge?.offset?.top ?? 0) +
                  (rect?.inner?.title?.height ?? 0) +
                  (rect?.inner?.title?.offset?.top ?? 0),
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
        options: () => ({ layout: { direction: directions[1] } }),
        type: TransformRectTypeEnum.TREE,
      },
      {
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return box?.width > containerRef?.current?.getBoundingClientRect()?.width;
        },
        options: () => ({ layout: { direction: LayoutConfigDirectionEnum.HORIZONTAL } }),
        type: TransformRectTypeEnum.TREE,
      },
      {
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return box?.height > containerRef?.current?.getBoundingClientRect()?.height;
        },
        options: () => ({ layout: { direction: LayoutConfigDirectionEnum.VERTICAL } }),
        type: TransformRectTypeEnum.TREE,
      },
      {
        options: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);

          return {
            offset: {
              left: Math.max(
                40,
                typeof window !== 'undefined' ? (window.innerWidth - box.width) / 2 : 0,
              ),
              top: Math.max(
                40,
                typeof window !== 'undefined' ? (window.innerHeight - box.height) / 2 : 0,
              ),
            },
          };
        },
        type: TransformRectTypeEnum.SHIFT,
      },
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

      nodesTransformed = transformRects(
        rects,
        rectTransformations(),
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

    updateNodeItems(itemsUpdated);

    return itemsUpdated;
  }

  return {
    renderLayoutChanges,
    updateLayoutOfItems,
  };
}
