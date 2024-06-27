import { DragItem, LayoutConfigType, NodeType } from '../../Canvas/interfaces';
import { ItemMappingType, ModelMappingType, NodeItemType } from '../../Canvas/interfaces';
import { ItemTypeEnum, LayoutConfigDirectionOriginEnum, LayoutConfigDirectionEnum } from '../../Canvas/types';
import { ModelManagerType } from './useModelManager';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { layoutItemsInGroups } from '../../Canvas/utils/rect';
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
    const layout = {
      // boundingRect: canvasRef?.current?.getBoundingClientRect(),
      // containerRect: containerRef?.current?.getBoundingClientRect(),
      // defaultRect: {
      //   item: ({ rect }) => ({
      //     left: 0,
      //     padding: {
      //       bottom: 12,
      //       left: 12,
      //       right: 12,
      //       top: 12,
      //     },
      //     top: 0,
      //     ...rect,
      //   }),
      // },
      // direction: LayoutConfigDirectionEnum.HORIZONTAL === layoutConfig.current.direction
      //   ? LayoutConfigDirectionEnum.VERTICAL
      //   : LayoutConfigDirectionEnum.HORIZONTAL,
      // gap: {
      //   column: 40,
      //   row: 40,
      // },
      // Doesn’t do anything
      // transformRect: {
      //   node: (rect) => ({
      //     ...rect,
      //     left: rect.left + 40,
      //     top: rect.top + 40,
      //   }),
      // },
      ...layoutConfig.current,
    };

    const itemsUpdated = {} as ItemMappingType;

    // Update the layout of items across every level.
    itemIDsByLevelRef?.current?.forEach((ids: string[]) => {
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

      const groups = layoutItemsInGroups(nodes, layout);
      groups?.forEach((node: NodeType) => {
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
