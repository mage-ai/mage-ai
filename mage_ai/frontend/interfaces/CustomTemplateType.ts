import { BlockColorEnum, BlockLanguageEnum, BlockTypeEnum } from './BlockType';
import { ConfigurationType } from './ChartBlockType';
import { PipelineTypeEnum } from './PipelineType';

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
    type: PipelineTypeEnum;
  };
  tags?: string[];
  template_uuid?: string;
  user?: {
    username: string;
  };
  uuid: string;
}
