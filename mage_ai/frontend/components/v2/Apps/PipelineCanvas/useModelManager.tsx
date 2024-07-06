import PipelineExecutionFrameworkType, { ConfigurationType, FrameworkType } from '@interfaces/PipelineExecutionFramework/interfaces';
import update from 'immutability-helper';
import { ItemStatusEnum } from '../../Canvas/types';
import { AppHandlerType, AppHandlersRefType } from './interfaces';
import {
  AppNodeType, BlockGroupType, BlockMappingType, BlocksByGroupType, GroupLevelType, GroupMappingType, ItemMappingType,
  ModelMappingType, NodeItemType, NodeType, OutputNodeType,
  PortMappingType, PortType
} from '../../Canvas/interfaces';
import { ItemTypeEnum } from '../../Canvas/types';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { buildDependencies } from './utils/pipelines';
import { createItemsFromBlockGroups, buildOutputNode } from './utils/items';
import { createPortsByItem } from './utils/ports';
import { useEffect, useRef, useState } from 'react';
import { useMutate } from '@context/APIMutation';
import { setPipelineBlock } from './ModelManager/utils';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { MutatationType, MutateFunctionArgsType } from '@api/interfaces';
import useDebounce from '@utils/hooks/useDebounce';
import { ClientEventType } from '@mana/shared/interfaces';
import PipelineType from '@interfaces/PipelineType';
import { AppConfigType } from '../interfaces';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from './useAppEventsHandler';
import { AppManagerType, ModelManagerType } from './interfaces';
import { indexBy, unique } from '@utils/array';
import { useLayout } from '@context/v2/Layout';

type ModelManagerProps = {
  itemIDsByLevelRef: React.MutableRefObject<string[][]>;
  pipelineUUID: string;
  executionFrameworkUUID: string;
  setHeaderData: (data: {
    executionFramework: PipelineExecutionFrameworkType;
    groupsByLevel: GroupLevelType;
    pipeline: PipelineType;
  }) => void;
  setOutputIDs: React.Dispatch<React.SetStateAction<string[]>>;
};

export default function useModelManager({
  itemIDsByLevelRef,
  pipelineUUID,
  executionFrameworkUUID,
  setHeaderData,
  setOutputIDs,
}: ModelManagerProps): ModelManagerType {
  const appHandlersRef = useRef<AppHandlerType>({} as AppHandlerType);
  const blocksByGroupRef = useRef<BlocksByGroupType>({} as BlocksByGroupType);
  const groupsByLevelRef = useRef<GroupLevelType>([]);

  const blockMappingRef = useRef<BlockMappingType>({});
  const groupMappingRef = useRef<GroupMappingType>({});

  const itemsRef = useRef<ItemMappingType>({});
  const outputsRef = useRef<Record<string, Record<string, OutputNodeType>>>({});
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
  const browserItemMutants = useMutate({
    resource: 'browser_items',
  });

  appHandlersRef.current = {
    blocks: {
      update: {
        mutate: ({ event, onError, onStart, onSuccess, payload: block }: MutateFunctionArgsType) => {
          const model =
            pipelineMutants.setModel(
              prev => setPipelineBlock(prev as PipelineType, block as BlockType),
              pipelineUUID,
            );

          cancel();

          return new Promise((resolve, reject) => {
            debounce(() => {
              pipelineMutants.update.mutate({
                event,
                onError,
                onStart,
                onSuccess,
                payload: model,
              });

              resolve(pipelineMutants.getModel(pipelineUUID));
            }, 1000);
          });
        },
      } as MutatationType,
    },
    browserItems: browserItemMutants,
    executionFrameworks: executionFrameworkMutants,
    pipelines: pipelineMutants,
  };

  const { dispatchAppEvent } = useAppEventsHandler({ itemsRef } as ModelManagerType, {
    [CustomAppEventEnum.APP_STARTED]: handleAppChanged,
    [CustomAppEventEnum.APP_STOPPED]: handleAppChanged,
    [CustomAppEventEnum.CODE_EXECUTION_SUBMITTED]: handleCodeExecutionSubmission,
  });

  function handleAppChanged(event: CustomAppEvent) {
    initializeModels(
      appHandlersRef?.current?.executionFrameworks?.getModel() as PipelineExecutionFrameworkType,
      appHandlersRef?.current?.pipelines?.getModel() as PipelineExecutionFrameworkType,
      event.detail?.manager as unknown,
    );
  }

  function handleCodeExecutionSubmission({ detail }: CustomAppEvent) {
    const { block, node, options } = detail;
    const output = buildOutputNode(node, block, options?.kwargs?.process as any);

    outputsRef.current[node.id] ||= {};
    outputsRef.current[node.id][output.id] = output;

    initializeModels(
      appHandlersRef?.current?.executionFrameworks?.getModel() as PipelineExecutionFrameworkType,
      appHandlersRef?.current?.pipelines?.getModel() as PipelineExecutionFrameworkType,
      detail?.manager as unknown,
    );
  }

  function initializeModels(
    executionFramework2: PipelineExecutionFrameworkType,
    pipeline2: PipelineExecutionFrameworkType,
    opts?: {
      appsRef?: AppManagerType['appsRef'];
    },
  ): Promise<NodeItemType[]> {
    return new Promise((resolve, reject) => {
      try {
        const { blocksByGroup, blockMapping, groupMapping, groupsByLevel } = buildDependencies(
          executionFramework2,
          pipeline2,
        );

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

        // Level 3: all of it
        blockGroupsByLevel.push(blockGroupsByLevel.reduce((acc, bg) => acc.concat(bg)))

        const itemMapping = {};
        const portMapping = {};

        // Each group at a specific level has a different set of ports.
        // Every level has the same blocks, just different grouping.
        // Every block at every level has the same ports.
        // Create an item for every group at every level.
        // Create a port for every group at every level.
        // Create an item for every block at every level because they’ll have different groupings.
        const itemIDsByLevel = [];

        // Initialize all models for all levels.
        blockGroupsByLevel?.forEach((blockGroups: BlockGroupType[], level: number) => {
          const {
            items,
            nodes,
          } = createItemsFromBlockGroups(blockGroups, {
            level,
          });

          const itemsIDs = [];
          items.concat(nodes)?.forEach((item: NodeType) => {
            if (item?.block?.groups) {
              item.block.frameworks = item.block.groups.map((id: GroupUUIDEnum) => groupMapping[id]);
            }
            // item.version = itemVersionRef.current;

            const itemPrev = itemsRef?.current?.[item.id];
            if (itemPrev?.rect) {
              item.rect = itemPrev?.rect;
              item.status = itemPrev?.status;
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
              item.status = ItemStatusEnum.INITIALIZED;
              item.version = 0;
            }

            // Apps
            item.apps = opts?.appsRef?.current?.[item.id]?.filter(
              (app: AppNodeType) => app?.level === level);

            // Output
            item.outputs = Object.values(outputsRef.current?.[item.id] ?? {}) ?? [];

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

        blockMappingRef.current = blockMapping;
        groupMappingRef.current = groupMapping;
        blocksByGroupRef.current = blocksByGroup;
        groupsByLevelRef.current = groupsByLevel;

        itemsRef.current = itemMapping;
        portsRef.current = portMapping;

        // Models
        // console.log('itemIDsByLevelRef', itemIDsByLevelRef)
        itemIDsByLevelRef.current = itemIDsByLevel;

        // WARNING: Do this so it mounts and then the on mount can start the chain.
        const items = Object.values(itemsRef.current);
        // Don’t do any level filtering here, it’ll be done at the Canvas level.
        dispatchAppEvent(CustomAppEventEnum.NODE_LAYOUTS_CHANGED, {
          nodes: items,
        });

        setOutputIDs([...new Set(items?.reduce((acc, { block }) => [
          BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE
        ].includes((block as BlockType)?.type) ? acc : acc.concat((block as BlockType)?.uuid), []))]);

        setHeaderData({
          executionFramework: executionFramework2,
          groupsByLevel,
          pipeline: pipeline2 as PipelineType,
        });

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
    blockMappingRef,
    blocksByGroupRef,
    groupMappingRef,
    groupsByLevelRef,
    itemsRef,
    onItemChangeRef,
    onModelChangeRef,
    portsRef,
  };
}
