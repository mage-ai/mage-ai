import BlockType from './BlockType';
import PipelineScheduleType from './PipelineScheduleType';
import TransformerActionType from './TransformerActionType';
import { PipelineMetadataType } from './MetadataType';

export enum PipelineTypeEnum {
  PYTHON = 'python',
  PYSPARK = 'pyspark',
  STREAMING = 'streaming',
}

export const PIPELINE_TYPE_TO_KERNEL_NAME = {
  [PipelineTypeEnum.PYTHON]: 'python3',
  [PipelineTypeEnum.PYSPARK]: 'pysparkkernel',
};

export default interface PipelineType {
  actions?: TransformerActionType[];
  blocks?: BlockType[];
  id?: number;
  metadata?: PipelineMetadataType;
  name?: string;
  schedules?: PipelineScheduleType[];
  type?: PipelineTypeEnum;
  uuid: string;
}
