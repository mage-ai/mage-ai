import BlockType from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import update from 'immutability-helper';

export function setPipelineBlock(pipeline: PipelineType, block: BlockType): PipelineType {
  const blocks = [...(pipeline?.blocks ?? [])]?.map((block2: BlockType) => ({
    ...block2,
    ...(block2?.uuid === block.uuid ? block : {}),
  }));

  return update(pipeline, {
    blocks: { $set: blocks },
  });
}
