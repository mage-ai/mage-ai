import { DragItem, LayoutConfigType, NodeType } from '../../Canvas/interfaces';
import { ItemMappingType, ModelMappingType, NodeItemType, RectType } from '../../Canvas/interfaces';
import { ItemTypeEnum, LayoutConfigDirectionOriginEnum, LayoutConfigDirectionEnum } from '../../Canvas/types';
import { ModelManagerType } from './useModelManager';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { layoutItemsInGroups, transformRects } from '../../Canvas/utils/rect';
import { useRef } from 'react';
import { ItemIDsByLevelRef } from './interfaces';

type LayoutManagerProps = {
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
      if (layoutConfig?.current?.rectTransformations) {
        console.log(`[${level}] Transforming rects for ${nodes.length} nodes`);
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
          layoutConfig?.current?.rectTransformations,
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
      } else {
        nodesTransformed = layoutItemsInGroups(nodes, layoutConfig.current);
      }

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
