import BlockType, { BlockTypeEnum } from '../BlockType';
import { GroupUUIDEnum, PipelineExecutionFrameworkUUIDEnum } from './types';
import { PipelineTypeEnum } from '../PipelineType';

export type FrameworkType = (PipelineExecutionFrameworkBlockType | PipelineExecutionFrameworkType) & {
  downstream_blocks?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
  upstream_blocks?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
};

export type PipelineExecutionFrameworkBlockType = BlockType & {
  blocks: PipelineExecutionFrameworkBlockType[];
  name?: string;
  downstream_blocks?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
  groups?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
  type?: BlockTypeEnum;
  upstream_blocks?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
  uuid: GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum;
};

type PipelineExecutionFrameworkType = {
  blocks: PipelineExecutionFrameworkBlockType[];
  execution_framework?: PipelineExecutionFrameworkUUIDEnum;
  groups?: (GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum)[];
  pipelines?: PipelineExecutionFrameworkType[];
  name?: string;
  type: PipelineTypeEnum.EXECUTION_FRAMEWORK;
  uuid: GroupUUIDEnum | PipelineExecutionFrameworkUUIDEnum;
};

export default PipelineExecutionFrameworkType;
