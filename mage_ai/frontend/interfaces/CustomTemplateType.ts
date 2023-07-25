import BlockType, { BlockColorEnum, BlockLanguageEnum, BlockTypeEnum } from './BlockType';
import PipelineType, { PipelineTypeEnum } from './PipelineType';
import { ConfigurationType } from './ChartBlockType';

export const OBJECT_TYPE_BLOCKS = 'blocks';
export const OBJECT_TYPE_PIPELINES = 'pipelines';

export default interface CustomTemplateType {
  block_type: BlockTypeEnum;
  color?: BlockColorEnum;
  configuration?: ConfigurationType;
  content?: string;
  description?: string;
  language: BlockLanguageEnum;
  name: string;
  pipeline?: {
    blocks?: BlockType[];
    type: PipelineTypeEnum;
  } | PipelineType;
  tags?: string[];
  template_uuid?: string;
  user?: {
    username: string;
  };
  uuid: string;
}
