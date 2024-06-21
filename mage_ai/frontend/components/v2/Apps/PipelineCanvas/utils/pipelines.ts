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
  const groupsMapping = extractNestedBlocks(
    pipelineExecutionFramework,
    indexBy(pipelineExecutionFrameworks, ({ uuid }) => uuid),
    {
      addBlockDependenciesToNestedPipelineBlocks: true,
      addPipelineGroupsToBlocks: true,
    },
  );

  const blocksMapping = extractNestedBlocks(
    pipeline,
    indexBy(pipelines, ({ uuid }) => uuid),
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

  return {};
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
