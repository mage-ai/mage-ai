import PipelineExecutionFrameworkType, {
  PipelineExecutionFrameworkBlockType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from '@interfaces/Pipeline';
import { extractNestedBlocks } from '@utils/models/pipeline';
import { removeAtIndex, indexBy } from '@utils/array';
import { isDebug } from '@utils/environment';
import { objectSize } from '@utils/hash';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';

const MAX_LEVELS = 10;

export function buildDependencies(
  pipelineExecutionFramework: PipelineExecutionFrameworkType,
  pipelineExecutionFrameworks: PipelineExecutionFrameworkType[],
  pipeline: PipelineType,
  pipelines: PipelineType[],
) {
  const frameworksMapping = indexBy(pipelineExecutionFrameworks, ({ uuid }) => uuid);
  const groupsMapping = extractNestedBlocks(
    pipelineExecutionFramework,
    frameworksMapping,
    {
      addBlockDependenciesToNestedPipelineBlocks: true,
      addPipelineGroupsToBlocks: true,
    },
  );

  const pipelinesMapping = indexBy(pipelines, ({ uuid }) => uuid);
  const blocksMappingAll = extractNestedBlocks(
    pipeline,
    pipelinesMapping,
    {
      addPipelineToBlocks: true,
    },
  );
  const blocksByGroup = blocksToGroupMapping(Object.values(blocksMappingAll));

  // Build group hierarchy from pipeline execution framework’s blocks:
  // 1. Any block with 0 groups
  // 2. Blocks with a group from level 1
  // 3. Blocks with a group from level 2
  // N. Blocks with type === GROUP
  let level = 0;
  let groupsFlat = Object.values(groupsMapping);
  const groupLevels: PipelineExecutionFrameworkBlockType[][] = [];
  while (level < MAX_LEVELS && groupsFlat.length >= 1) {
    const groupsToAdd = [];
    const groupsLeftOver = [];

    groupsFlat?.forEach((group: PipelineExecutionFrameworkBlockType) => {
      let addedToLevel = false;
      if (level === 0) {
        if (!group?.groups?.length) {
          groupsToAdd.push(group);
          addedToLevel = true;
        }
      } else {
        let groupsFromHigherLevels = {};
        groupLevels?.forEach((arr: PipelineExecutionFrameworkBlockType[]) => {
          groupsFromHigherLevels = {
            ...groupsFromHigherLevels,
            ...indexBy(arr, ({ uuid }) => uuid),
          };
        });

        if (group?.groups?.every((groupUUID: GroupUUIDEnum) => groupsFromHigherLevels[groupUUID])) {
          groupsToAdd.push(group);
          addedToLevel = true;
        }
      }

      if (!addedToLevel) {
        groupsLeftOver.push(group);
      }
    });

    groupLevels.push(groupsToAdd);
    groupsFlat = groupsLeftOver;
    level++;
  }

  // Add upstream and downstream dependencies to pipeline instance’s blocks based on the
  // pipeline execution framework’s blocks.
  const blocksMapping = {};
  groupLevels?.forEach((groupsAtLevel: PipelineExecutionFrameworkBlockType[], level: number) => {
    groupsAtLevel?.forEach((group: PipelineExecutionFrameworkBlockType) => {
      const {
        downstream_blocks: downstreamGroups,
        upstream_blocks: upstreamGroups,
        uuid,
      } = group || {};

      const downstreamBlocks = [];
      const upstreamBlocks = [];

      downstreamGroups?.forEach((groupUUID: GroupUUIDEnum) => {
        Object.values(blocksByGroup?.[groupUUID] ?? {})?.forEach((b: BlockType) => {
          if (!b?.upstream_blocks
            && ![BlockTypeEnum.PIPELINE, BlockTypeEnum.GROUP]?.includes(b?.type)
          ) {
            downstreamBlocks.push(b);
          }
        });
      });

      upstreamGroups?.forEach((groupUUID: GroupUUIDEnum) => {
        Object.values(blocksByGroup?.[groupUUID] ?? {})?.forEach((b: BlockType) => {
          if (!b?.downstream_blocks
            && ![BlockTypeEnum.PIPELINE, BlockTypeEnum.GROUP]?.includes(b?.type)
          ) {
            upstreamBlocks.push(b);
          }
        });
      });

      const blocks = blocksByGroup?.[uuid];
      Object.entries(blocks ?? {})?.forEach(([blockUUID, block]: [string, BlockType]) => {
        if (![BlockTypeEnum.PIPELINE, BlockTypeEnum.GROUP]?.includes(block?.type)) {
          const blockUpdated = { ...block };
          if (!blockUpdated?.upstream_blocks?.length) {
            blockUpdated.upstream_blocks = upstreamBlocks?.map((b2: BlockType) => b2.uuid);
          } else if (!blockUpdated?.downstream_blocks?.length) {
            blockUpdated.downstream_blocks = downstreamBlocks?.map((b2: BlockType) => b2.uuid);
          }

          blocksMapping[blockUUID] = {
            ...blockUpdated,
            level,
          };
        }
      });
    });
  });

  isDebug() && console.log(
    `groupLevels ${groupLevels?.length}`, groupLevels,
    `blocksMapping ${objectSize(blocksMapping)}`, blocksMapping,
  );

  return {
    blocksByGroup,
    blocksMapping,
    blocksMappingAll,
    groupsMapping,
    pipelinesMapping,
  };
}

function blocksToGroupMapping(blocks: BlockType[]): Record<GroupUUIDEnum, BlockType> {
  const mapping = {} as Record<GroupUUIDEnum, BlockType>;

  blocks?.forEach((block: BlockType) => {
    block?.groups?.forEach((groupUUID: GroupUUIDEnum) => {
      mapping[groupUUID] ||= {};
      mapping[groupUUID][block.uuid] = block;
    });
  });

  return mapping;
}
