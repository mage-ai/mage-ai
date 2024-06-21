import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from '@interfaces/Pipeline';
import { extractNestedBlocks } from '@utils/models/pipeline';
import { indexBy } from '@utils/array';
import { isDebug } from '@utils/environment';
import { objectSize } from '@utils/hash';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import BlockType from '@interfaces/BlockType';

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
  const blocksMapping = extractNestedBlocks(
    pipeline,
    pipelinesMapping,
    {
      addPipelineToBlocks: true,
    },
  );
  const blocksByGroup = blocksToGroupMapping(Object.values(blocksMapping));

  isDebug() && console.log(
    `groupsMapping ${objectSize(groupsMapping)}`, groupsMapping,
    `blocksMapping ${objectSize(blocksMapping)}`, blocksMapping,
    `blocksByGroup ${objectSize(blocksByGroup)}`, blocksByGroup,
  );

  const mapping = {};
  Object.entries(groupsMapping).forEach(([groupUUID, blocks]) => {

  });

  return {
    blocksByGroup,
    blocksMapping,
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
