import PipelineExecutionFrameworkType, {
  PipelineExecutionFrameworkBlockType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from '@interfaces/PipelineType';
import { extractNestedBlocks } from '@utils/models/pipeline';
import { removeAtIndex, indexBy } from '@utils/array';
import { isDebug } from '@utils/environment';
import { objectSize } from '@utils/hash';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import {
  BlockMappingType,
  BlocksByGroupType,
  GroupMappingType,
  GroupLevelsMappingType,
} from '../../../Canvas/interfaces';

const MAX_LEVELS = 10;

export function buildDependencies(
  pipelineExecutionFramework: PipelineExecutionFrameworkType,
  pipelineExecutionFrameworks: PipelineExecutionFrameworkType[],
  pipeline: PipelineType | PipelineExecutionFrameworkType,
  pipelines: (PipelineType | PipelineExecutionFrameworkType)[],
): {
  blockMapping: BlockMappingType;
  blocksByGroup: BlocksByGroupType;
  groupLevelsMapping: GroupLevelsMappingType;
  groupMapping: GroupMappingType;
} {
  const frameworksMapping = indexBy(pipelineExecutionFrameworks, ({ uuid }) => uuid);
  const groupMapping = extractNestedBlocks(pipelineExecutionFramework, frameworksMapping, {
    addBlockDependenciesToNestedPipelineBlocks: true,
    addPipelineGroupsToBlocks: true,
  }) as Record<GroupUUIDEnum, PipelineExecutionFrameworkBlockType>;

  const pipelinesMapping = indexBy(pipelines, ({ uuid }) => uuid);
  const blocksByUUIDAll = extractNestedBlocks(pipeline, pipelinesMapping, {
    addPipelineToBlocks: true,
  });
  const blocksByGroupInit: BlocksByGroupType = blocksToGroupMapping(Object.values(blocksByUUIDAll));

  // Build group hierarchy from pipeline execution framework’s blocks:
  // 1. Any block with 0 groups
  // 2. Blocks with a group from level 1
  // 3. Blocks with a group from level 2
  // N. Blocks with type === GROUP
  let level = 0;
  const groupsPending = { ...groupMapping };
  const groupLevelsMapping: GroupMappingType[] = [];
  while (level < MAX_LEVELS && objectSize(groupsPending) >= 1) {
    const groupsToAdd = {} as GroupMappingType;

    const groupsProcessing = { ...groupsPending };
    Object.entries(groupsProcessing)?.forEach(
      ([groupID, group]: [GroupUUIDEnum, PipelineExecutionFrameworkBlockType]) => {
        if (level === 0) {
          if (!group?.groups?.length) {
            groupsToAdd[groupID] = group;
            delete groupsPending[groupID];
          }
        } else {
          let groupsFromHigherLevels = {};
          groupLevelsMapping?.forEach((map: GroupMappingType) => {
            groupsFromHigherLevels = {
              ...groupsFromHigherLevels,
              ...map,
            };
          });

          if (
            group?.groups?.every((groupUUID: GroupUUIDEnum) => groupsFromHigherLevels[groupUUID])
          ) {
            groupsToAdd[groupID] = group;
            delete groupsPending[groupID];
          }
        }
      },
    );

    groupLevelsMapping.push(groupsToAdd);
    level++;
  }

  // Add upstream and downstream dependencies to pipeline instance’s blocks based on the
  // pipeline execution framework’s blocks.
  const blockMapping = {};
  groupLevelsMapping?.forEach((groupsAtLevel: GroupMappingType, level: number) => {
    Object.entries(groupsAtLevel ?? {})?.forEach(
      ([groupID, group]: [GroupUUIDEnum, PipelineExecutionFrameworkBlockType]) => {
        const {
          downstream_blocks: downstreamGroups,
          upstream_blocks: upstreamGroups,
          uuid,
        } = group || {};

        const downstreamBlocks = [];
        const upstreamBlocks = [];

        downstreamGroups?.forEach((groupUUID: GroupUUIDEnum) => {
          Object.values(blocksByGroupInit?.[groupUUID] ?? {})?.forEach((b: BlockType) => {
            if (
              !b?.upstream_blocks &&
              ![BlockTypeEnum.PIPELINE, BlockTypeEnum.GROUP]?.includes(b?.type)
            ) {
              downstreamBlocks.push(b);
            }
          });
        });

        upstreamGroups?.forEach((groupUUID: GroupUUIDEnum) => {
          Object.values(blocksByGroupInit?.[groupUUID] ?? {})?.forEach((b: BlockType) => {
            if (
              !b?.downstream_blocks &&
              ![BlockTypeEnum.PIPELINE, BlockTypeEnum.GROUP]?.includes(b?.type)
            ) {
              upstreamBlocks.push(b);
            }
          });
        });

        const blocks = blocksByGroupInit?.[uuid];
        Object.entries(blocks ?? {})?.forEach(([blockUUID, block]: [string, BlockType]) => {
          if (![BlockTypeEnum.PIPELINE, BlockTypeEnum.GROUP]?.includes(block?.type)) {
            const blockUpdated = { ...block };
            if (!blockUpdated?.upstream_blocks?.length) {
              blockUpdated.upstream_blocks = upstreamBlocks?.map((b2: BlockType) => b2.uuid);
            } else if (!blockUpdated?.downstream_blocks?.length) {
              blockUpdated.downstream_blocks = downstreamBlocks?.map((b2: BlockType) => b2.uuid);
            }

            blockMapping[blockUUID] = {
              ...blockUpdated,
              level,
            };
          }
        });
      },
    );
  });
  const blocksByGroup = blocksToGroupMapping(Object.values(blockMapping));

  false &&
    isDebug() &&
    console.log(
      `groupMapping ${objectSize(groupMapping)}`,
      groupMapping,
      `groupLevelsMapping ${groupLevelsMapping?.length}`,
      groupLevelsMapping,
      `blocksByGroup ${objectSize(blocksByGroup)}`,
      blocksByGroup,
      `blockMapping ${objectSize(blockMapping)}`,
      blockMapping,
    );

  return {
    blockMapping,
    blocksByGroup,
    groupLevelsMapping,
    groupMapping,
  };
}

export function blocksToGroupMapping(blocks: BlockType[]): BlocksByGroupType {
  const mapping = {} as BlocksByGroupType;

  blocks?.forEach((block: BlockType) => {
    block?.groups?.forEach((groupUUID: GroupUUIDEnum) => {
      mapping[groupUUID as GroupUUIDEnum] ||= {} as BlockMappingType;
      mapping[groupUUID as GroupUUIDEnum][block.uuid] = block;
    });
  });

  return mapping as BlocksByGroupType;
}
