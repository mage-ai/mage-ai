import BlockType, { BlockPipelineType, BlockTypeEnum } from 'interfaces/BlockType';
import PipelineType from 'interfaces/PipelineType';

export function extractNestedBlocks(
  pipeline: PipelineType,
  pipelines: Record<string, PipelineType>,
): BlockType[] {
  const { blocks, uuid } = pipeline;

  return blocks?.reduce((acc, block) => {
    const item = {
      ...block,
      pipeline,
    };

    if (BlockTypeEnum.PIPELINE === block.type) {
      const pipelineInner = pipelines[block.uuid];

      return [
        ...acc,
        ...(pipelineInner ? extractNestedBlocks(pipelineInner, pipelines) : []),
        item,
      ];
    }

    return [
      ...acc,
      item,
    ];
  }, []);
}
