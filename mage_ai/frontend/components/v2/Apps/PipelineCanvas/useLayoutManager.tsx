import styles from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { DragItem, LayoutConfigType, NodeType } from '../../Canvas/interfaces';
import { ItemMappingType, ModelMappingType, NodeItemType } from '../../Canvas/interfaces';
import { ItemTypeEnum, LayoutConfigDirectionOriginEnum, LayoutConfigDirectionEnum } from '../../Canvas/types';
import { ModelManagerType } from './useModelManager';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { layoutItemsInGroups } from '../../Canvas/utils/rect';
import { updateNodeGroupsWithItems } from './utils/nodes';
import { useRef, useState } from 'react';

type LayoutManagerProps = {
  canvasRef: React.MutableRefObject<HTMLDivElement>;
  containerRef: React.MutableRefObject<HTMLDivElement>;
  itemsRef: React.MutableRefObject<ItemMappingType>;
  transformState: React.MutableRefObject<ZoomPanStateType>;
  updateNodeItems: ModelManagerType['updateNodeItems'];
};

export type LayoutManagerType = {
  activeLevel: React.MutableRefObject<number>;
  items: Record<string, NodeItemType>;
  layoutConfig: React.MutableRefObject<LayoutConfigType>;
  modelLevelsMapping: React.MutableRefObject<ModelMappingType[]>;
  renderLayoutChanges: (opts?: { level?: number; items?: ItemMappingType }) => void;
  setActiveLevel: (levelArg?: number) => void;
  updateLayoutOfItems: () => ItemMappingType;
};

export default function useLayoutManager({
  canvasRef,
  containerRef,
  itemsRef,
  transformState,
  updateNodeItems,
}: LayoutManagerProps): LayoutManagerType {
  const layoutConfig = useRef<LayoutConfigType>({
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
  });

  const activeLevel = useRef<number>(null);
  const modelLevelsMapping = useRef<ModelMappingType[]>([]);

  const [items, setItemsState] = useState<Record<string, NodeItemType>>(null);
  // const [activeItems, setActiveItemsState] = useState<Record<string, ModelMappingType>>(null);

  // function setActiveItems(modelMapping: ModelMappingType) {
  //   setActiveItemsState(modelMapping);
  // }

  function renderLayoutChanges(opts?: { level?: number; items?: ItemMappingType }) {
    const itemMapping = opts?.items ?? modelLevelsMapping.current[opts.level]?.itemMapping ?? {};

    setItemsState(prev => ({
      ...prev,
      ...itemMapping,
    }));
  }

  function setActiveLevel(levelArg?: number) {
    const levelPrevious: number = activeLevel.current;
    levelPrevious !== null &&
      containerRef?.current?.classList.remove(styles[`level-${levelPrevious}-active`]);

    let level: number = levelArg ?? (activeLevel?.current ?? 0) + 1;
    if (level >= modelLevelsMapping?.current?.length) {
      level = 0;
    }

    activeLevel.current = level;
    containerRef?.current?.classList.add(styles[`level-${level}-active`]);
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

  return {
    activeLevel,
    items,
    layoutConfig,
    modelLevelsMapping,
    renderLayoutChanges,
    setActiveLevel,
    updateLayoutOfItems,
  };
}
