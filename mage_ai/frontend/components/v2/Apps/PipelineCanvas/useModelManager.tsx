import PipelineExecutionFrameworkType, { ConfigurationType, FrameworkType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { BlockGroupType, BlockMappingType, GroupLevelType, ItemMappingType, ModelMappingType, NodeItemType, PortMappingType, PortType } from '../../Canvas/interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { buildDependencies } from './utils/pipelines';
import { createItemsFromBlockGroups } from './utils/items';
import { createPortsByItem } from './utils/ports';
import { updateModelsAndRelationships } from './utils/nodes';
import { useEffect, useRef, useState } from 'react';
import { ClientEventType } from '@mana/hooks/useContextMenu';
import { AppHandlerType, AppHandlersRefType } from './interfaces';
import { useMutate } from '@context/APIMutation';

export type ModelManagerType = {
  executionFramework: PipelineExecutionFrameworkType;
  pipeline: PipelineExecutionFrameworkType;
  appHandlersRef: AppHandlersRefType;
  initializeModels: (
    executionFramework: PipelineExecutionFrameworkType,
    pipeline: PipelineExecutionFrameworkType,
  ) => void;
  itemsRef: React.MutableRefObject<ItemMappingType>;
  mutateModels: (payload?: ModelMappingType) => ModelMappingType;
  portsRef: React.MutableRefObject<PortMappingType>;
  updateNodeItems: (items: ItemMappingType) => void;
  updatePorts: (ports: PortMappingType) => void;
};

type ModelManagerProps = {
  itemIDsByLevelRef: React.MutableRefObject<string[][]>;
  pipelineUUID: string;
  executionFrameworkUUID: string;
};

export default function useModelManager({
  itemIDsByLevelRef,
  setItemsState,
  pipelineUUID,
  executionFrameworkUUID,
  setPipeline,
  setExecutionFramework,
}: ModelManagerProps): ModelManagerType {
  const appHandlersRef = useRef<AppHandlerType>({} as AppHandlerType);
  const itemsRef = useRef<ItemMappingType>(null);
  const portsRef = useRef<PortMappingType>(null);

  const pipelineMutants = useMutate({
    id: pipelineUUID,
    idParent: executionFrameworkUUID,
    resource: 'pipelines',
    resourceParent: 'execution_frameworks',
  }, {
    handlers: {
      detail: {
        onSuccess: (data) => {
          setPipeline(data);
        },
      },
      update: {
        onSuccess: (data) => {
          setPipeline(data);
        },
      },
    },
  });
  const executionFrameworkMutants = useMutate({
    id: executionFrameworkUUID,
    resource: 'execution_frameworks',
  }, {
    handlers: {
      detail: {
        onSuccess: (data) => {
          setExecutionFramework(data);
        },
      },
    },
  });

  appHandlersRef.current = {
    executionFrameworks: executionFrameworkMutants,
    pipelines: pipelineMutants,
  };

  function initializeModels(
    executionFramework2: PipelineExecutionFrameworkType,
    pipeline2: PipelineExecutionFrameworkType,
  ) {
    const { blocksByGroup, groupMapping, groupsByLevel } = buildDependencies(
      executionFramework2,
      pipeline2,
    );

    // console.log(blocksByGroup, groupMapping, groupsByLevel)

    // Hydrate each group’s blocks for every level using the blocks from the user’s pipeline.
    const blockGroupsByLevel: BlockGroupType[][] = [];
    [...(groupsByLevel ?? [])]?.reverse().forEach((groups: FrameworkType[], idx: number) => {
      const blockGroupsInLevel = [];

      const blocksByGrandparent = {};
      if (idx >= 1 && blockGroupsByLevel.length >= 1) {
        (blockGroupsByLevel[0] ?? [])?.forEach((groupBlock: BlockGroupType) => {
          const { blocks, group } = groupBlock;
          group?.groups?.forEach((groupID: GroupUUIDEnum) => {
            blocksByGrandparent[groupID] ||= [];
            blocksByGrandparent[groupID].push(...blocks);
          });
        });
      }

      groups?.forEach((group: FrameworkType) => {
        const blocks = [];
        if (idx === 0) {
          const gblocks = Object.values(blocksByGroup?.[group.uuid] ?? {});
          blocks.push(...(gblocks ?? []));
        } else if (blockGroupsByLevel.length >= 1) {
          blocks.push(...(blocksByGrandparent?.[group.uuid] ?? []));
        }
        blockGroupsInLevel.push({
          blocks,
          group,
        });
      });

      blockGroupsByLevel.unshift(blockGroupsInLevel);
    });

    const itemMapping = {};
    const portMapping = {};

    // Each group at a specific level has a different set of ports.
    // Every level has the same blocks, just different grouping.
    // Every block at every level has the same ports.
    // Create an item for every group at every level.
    // Create a port for every group at every level.
    // Create an item for every block at every level because they’ll have different groupings.
    const itemIDsByLevel = [];
    const maxLevel = null;
    blockGroupsByLevel?.forEach((blockGroups: BlockGroupType[], level: number) => {
      if (level !== null && maxLevel !== null && level > maxLevel) return;

      const {
        items,
        nodes,
      } = createItemsFromBlockGroups(blockGroups, {
        level,
      });

      const itemsIDs = [];
      items.concat(nodes)?.forEach((item: NodeItemType) => {
        if (item?.block?.groups) {
          item.block.frameworks = item.block.groups.map((id: GroupUUIDEnum) => groupMapping[id]);
        }
        // item.version = itemVersionRef.current;

        const itemPrev = itemsRef?.current?.[item.id];
        if (itemPrev?.rect) {
          item.rect = itemPrev?.rect;
          item.version = itemPrev?.version + 1;
        } else {
          item.version = 0;
        }

        itemsIDs.push(item.id);
        itemMapping[item.id] = item;
      });
      itemIDsByLevel.push(itemsIDs);

      const ports = [];
      createPortsByItem(nodes.concat(items), {
        level,
      });

      Object.entries(ports ?? {})?.forEach(([id, { ports }]: [string, {
        ports: PortType[];
      }]) => {
        itemMapping[id] = {
          ...itemMapping[id],
          ports,
        };

        ports?.forEach(port => {
          portMapping[port.id] = port;
        });
      });

      // console.log('items', items);
      // console.log('nodes', nodes);
      // console.log('ports', ports);
    });

    // console.log('itemMapping', itemMapping);
    // console.log('portMapping', portMapping);

    // Models
    itemIDsByLevelRef.current = itemIDsByLevel;

    mutateModels({
      itemMapping,
      portMapping,
    });
    setItemsState(itemMapping);
  }

  function updateNodeItems(items: ItemMappingType) {
    // This should be the only setter for itemsRef.
    itemsRef.current = {
      ...itemsRef.current,
      ...Object.entries(items).reduce(
        (acc: ItemMappingType, [id, item]: [string, NodeItemType]) => ({
          ...acc,
          [id]: {
            ...item,
            version: String(Number(item?.version ?? -1) + 1),
          },
        }),
        {} as ItemMappingType,
      ),
    };
  }

  function updatePorts(ports: PortMappingType) {
    // This should be the only setter for portsRef.
    portsRef.current = {
      ...portsRef.current,
      ...Object.entries(ports).reduce(
        (acc: PortMappingType, [id, item]: [string, PortType]) => ({
          ...acc,
          [id]: {
            ...item,
            version: String(Number(item?.version ?? -1) + 1),
          },
        }),
        {} as PortMappingType,
      ),
    };
  }

  function mutateModels(payload?: ModelMappingType): ModelMappingType {
    const { items, ports } = updateModelsAndRelationships(
      {
        itemsRef,
        portsRef,
      },
      payload,
    );
    updateNodeItems(items);
    updatePorts(ports);

    return {
      itemMapping: itemsRef.current,
      portMapping: portsRef.current,
    };
  }

  // useEffect(() => {
  //   console.log(itemsRef.current, executionFramework, pipeline)
  //   if (itemsRef.current === null && executionFramework && pipeline) {
  //     initializeModels(executionFramework, pipeline);
  //   }
  // }, [executionFramework, pipeline]);

  return {
    appHandlersRef,
    initializeModels,
    itemsRef,
    mutateModels,
    portsRef,
    updateNodeItems,
    updatePorts,
  };
}
