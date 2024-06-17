import update from 'immutability-helper';

import BlockType, { BlockTypeEnum } from 'interfaces/BlockType';
import PipelineType from 'interfaces/PipelineType';

interface NestedBlockType extends BlockType {
  parent_pipeline: {
    uuid: string;
  };
}

export function extractNestedBlocks(
  {
    blocks,
    uuid,
  }: PipelineType,
  pipelines: Record<string, PipelineType>,
): NestedBlockType[] {
  return blocks?.reduce((acc, block) => {
    if (BlockTypeEnum.PIPELINE === block.type) {
      const pipeline = pipelines[block.uuid];

      return [
        ...acc,
        ...(pipeline ? extractNestedBlocks(pipeline, pipelines) : []),
      ];
    }

    return [
      ...acc,
      update(block as NestedBlockType,{
        parent_pipeline: {
          $set: {
            uuid,
          },
        },
      }),
    ];
  }, []);
}
