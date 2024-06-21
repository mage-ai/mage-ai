import BlockType, { BlockTypeEnum } from '../BlockType';
import { GroupUUIDEnum, PipelineExecutionFrameworkUUIDEnum } from './types';
import { PipelineTypeEnum } from '../PipelineType';

export type PipelineExecutionFrameworkBlockType = BlockType & {
  downstream_blocks?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
  groups?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
  type?: BlockTypeEnum.GROUP | BlockTypeEnum.PIPELINE;
  upstream_blocks?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
  uuid: GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum;
};

type PipelineExecutionFrameworkType = {
  blocks: PipelineExecutionFrameworkBlockType[];
  groups?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
  name?: string;
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK;
  uuid: GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum;
};

export default PipelineExecutionFrameworkType;
