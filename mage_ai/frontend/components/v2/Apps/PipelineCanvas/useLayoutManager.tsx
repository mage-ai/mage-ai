import { DragItem, LayoutConfigType, NodeType } from '../../Canvas/interfaces';
import { ItemMappingType, ModelMappingType, NodeItemType } from '../../Canvas/interfaces';
import { ItemTypeEnum, LayoutConfigDirectionOriginEnum, LayoutConfigDirectionEnum } from '../../Canvas/types';
import { ModelManagerType } from './useModelManager';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { layoutItemsInGroups } from '../../Canvas/utils/rect';
import { updateNodeGroupsWithItems } from './utils/nodes';
import { useRef } from 'react';

type LayoutManagerProps = {
  canvasRef: React.MutableRefObject<HTMLDivElement>;
  containerRef: React.MutableRefObject<HTMLDivElement>;
  itemsRef: React.MutableRefObject<ItemMappingType>;
  layoutConfig: React.MutableRefObject<LayoutConfigType>;
  setItemsState: React.Dispatch<React.SetStateAction<ItemMappingType>>;
  transformState: React.MutableRefObject<ZoomPanStateType>;
  updateNodeItems: ModelManagerType['updateNodeItems'];
};

export type LayoutManagerType = {
  modelLevelsMapping: React.MutableRefObject<ModelMappingType[]>;
  renderLayoutChanges: (opts?: { level?: number; items?: ItemMappingType }) => void;
  updateLayoutOfItems: () => ItemMappingType;
};

export default function useLayoutManager({
  canvasRef,
  containerRef,
  itemsRef,
  layoutConfig,
  setItemsState,
  transformState,
  updateNodeItems,
}: LayoutManagerProps): LayoutManagerType {
  const modelLevelsMapping = useRef<ModelMappingType[]>([]);

  function renderLayoutChanges(opts?: { level?: number; items?: ItemMappingType }) {
    const itemMapping = opts?.items ?? modelLevelsMapping.current[opts.level]?.itemMapping ?? {};

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
    layoutConfig,
    modelLevelsMapping,
    renderLayoutChanges,
    updateLayoutOfItems,
  };
}
