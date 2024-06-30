import PipelineExecutionFrameworkType, { ConfigurationType, FrameworkType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { AppHandlerType, AppHandlersRefType } from './interfaces';
import { BlockGroupType, BlockMappingType, GroupLevelType, ItemMappingType, ModelMappingType, NodeItemType, NodeType, PortMappingType, PortType } from '../../Canvas/interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { buildDependencies } from './utils/pipelines';
import { createItemsFromBlockGroups } from './utils/items';
import { createPortsByItem } from './utils/ports';
import { useEffect, useRef, useState } from 'react';
import { useMutate } from '@context/APIMutation';
import { setPipelineBlock } from './ModelManager/utils';
import BlockType from '@interfaces/BlockType';
import { MutatationType, MutateFunctionArgsType } from '@api/interfaces';
import useDebounce from '@utils/hooks/useDebounce';
import { ClientEventType } from '@mana/shared/interfaces';
import PipelineType from '@interfaces/PipelineType';

export type ModelManagerType = {
  appHandlersRef: AppHandlersRefType;
  executionFramework: PipelineExecutionFrameworkType;
  itemsRef: React.MutableRefObject<ItemMappingType>;
  mutateModels: (payload?: ModelMappingType) => ModelMappingType;
  onItemChangeRef: React.MutableRefObject<(payload: NodeItemType) => void>;
  onModelChangeRef: React.MutableRefObject<(payload: PipelineExecutionFrameworkType) => void>;
  pipeline: PipelineExecutionFrameworkType;
  portsRef: React.MutableRefObject<PortMappingType>;
  updateNodeItems: (items: ItemMappingType) => void;
  updatePorts: (ports: PortMappingType) => void;
};

type ModelManagerProps = {
  itemIDsByLevelRef: React.MutableRefObject<string[][]>;
  pipelineUUID: string;
  executionFrameworkUUID: string;
  setItemRects: React.Dispatch<React.SetStateAction<NodeItemType[]>>;
};

export default function useModelManager({
  itemIDsByLevelRef,
  pipelineUUID,
  executionFrameworkUUID,
  setItemRects,
}: ModelManagerProps): ModelManagerType {
  const appHandlersRef = useRef<AppHandlerType>({} as AppHandlerType);
  const itemsRef = useRef<ItemMappingType>({});
  const portsRef = useRef<PortMappingType>({});
  const phaseRef = useRef<number>(0);

  const onItemChangeRef = useRef<(payload: NodeItemType) => void>(null);
  const onModelChangeRef = useRef<(payload: PipelineExecutionFrameworkType) => void>(null);

  const [debounce, cancel] = useDebounce();

  const [pipeline, setPipeline] = useState<PipelineExecutionFrameworkType>(null);
  const [executionFramework, setExecutionFramework] = useState<PipelineExecutionFrameworkType>(null);

  const pready = useRef<boolean>(false);
  const fready = useRef<boolean>(false);

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
          pready.current = true;
        },
      },
      update: {
        onSuccess: (pipeline2, pipeline2Prev) => {
          if (pipeline2?.blocks?.length > (pipeline2Prev?.blocks?.length ?? 0)) {
            initializeModels(executionFramework, pipeline2)
              .then(() => {
                setPipeline(pipeline2);
              });
          }
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
          fready.current = true;
        },
      },
    },
  });

  appHandlersRef.current = {
    blocks: {
      update: {
        mutate: ({ event, payload: block }: MutateFunctionArgsType) => {
          const model =
            pipelineMutants.setModel(
              prev => setPipelineBlock(prev as PipelineType, block as BlockType));

          cancel();

          return new Promise((resolve) => {
            debounce(() => {
              pipelineMutants.update.mutate({
                event,
                payload: model,
              });

              resolve(pipelineMutants.modelsRef.current.pipeline);
            }, 1000);
          });
        },
      } as MutatationType,
    },
    executionFrameworks: executionFrameworkMutants,
    pipelines: pipelineMutants,
  };

  function initializeModels(
    executionFramework2: PipelineExecutionFrameworkType,
    pipeline2: PipelineExecutionFrameworkType
  ): Promise<NodeItemType[]> {
    return new Promise((resolve, reject) => {
      // console.log('itemsRef.current.start', itemsRef.current)

      try {
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

              // const itemItemsCurr = ((item as NodeType)?.items ?? []) as string[];
              // const itemItemsPrev = ((itemPrev as NodeType)?.items ?? []) as NodeItemType[];

              // console.log(item.id, item, itemPrev)

              // // Check which items from the previous node is no longer present.
              // if (itemItemsPrev?.length >= 1) {
              //   let widthDiff = 0;

              //   itemItemsPrev?.forEach((item1: NodeItemType) => {
              //     // If no item or if the item exists in the new node, skip.s
              //     if (!item1 || itemItemsCurr?.includes(String(item1?.id))) return;

              //     const itemDiff = itemsRef?.current?.[item1.id];
              //     if (itemDiff) {
              //       widthDiff += itemDiff?.rect?.diff?.width ?? 0;
              //     }
              //   });

              //   console.log(item.id, item.rect.width, widthDiff)
              //   // Reduce the width of the node by the width of the missing items.
              //   item.rect.width -= widthDiff;
              // }
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
        });

        itemsRef.current = itemMapping;
        portsRef.current = portMapping;


        // Models
        itemIDsByLevelRef.current = itemIDsByLevel;

        // WARNING: Do this so it mounts and then the on mount can start the chain.
        const items = Object.values(itemsRef.current);
        setItemRects(items);


        resolve(items); // Resolve the promise when the function completes
      } catch (error) {
        reject(error); // Reject the promise if there is an error
      }
    });
  }

  // function updateNodeItems(items: ItemMappingType) {
  //   // This should be the only setter for itemsRef.
  //   itemsRef.current = {
  //     ...itemsRef.current,
  //     ...Object.entries(items).reduce(
  //       (acc: ItemMappingType, [id, item]: [string, NodeItemType]) => ({
  //         ...acc,
  //         [id]: {
  //           ...item,
  //           version: String(Number(item?.version ?? -1) + 1),
  //         },
  //       }),
  //       {} as ItemMappingType,
  //     ),
  //   };
  // }

  // function updatePorts(ports: PortMappingType) {
  //   // This should be the only setter for portsRef.
  //   portsRef.current = {
  //     ...portsRef.current,
  //     ...Object.entries(ports).reduce(
  //       (acc: PortMappingType, [id, item]: [string, PortType]) => ({
  //         ...acc,
  //         [id]: {
  //           ...item,
  //           version: String(Number(item?.version ?? -1) + 1),
  //         },
  //       }),
  //       {} as PortMappingType,
  //     ),
  //   };
  // }

  // function mutateModels(payload?: ModelMappingType): ModelMappingType {
  //   const { items, ports } = updateModelsAndRelationships(
  //     {
  //       itemsRef,
  //       portsRef,
  //     },
  //     payload,
  //   );
  //   // updateNodeItems(items);
  //   // updatePorts(ports);

  //   return {
  //     itemMapping: itemsRef.current,
  //     portMapping: portsRef.current,
  //   };
  // }

  useEffect(() => {
    if (phaseRef.current === 0 && pready.current && fready.current) {
      // console.log('initializeModels', phaseRef.current);
      initializeModels(executionFramework, pipeline);
      phaseRef.current += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionFramework, pipeline]);

  return {
    appHandlersRef,
    itemsRef,
    onItemChangeRef,
    onModelChangeRef,
    portsRef,
    // mutateModels,
    // updateNodeItems,
    // updatePorts,
  };
}
