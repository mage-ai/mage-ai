import BlockType from './BlockType';
import PipelineScheduleType from './PipelineScheduleType';
import TransformerActionType from './TransformerActionType';
import { CatalogType } from './IntegrationSourceType';
import { PipelineMetadataType } from './MetadataType';

export enum PipelineTypeEnum {
  INTEGRATION = 'integration',
  PYTHON = 'python',
  PYSPARK = 'pyspark',
  STREAMING = 'streaming',
}

export const PIPELINE_TYPE_LABEL_MAPPING = {
  [PipelineTypeEnum.INTEGRATION]: 'Integration',
  [PipelineTypeEnum.PYTHON]: 'Standard',
  [PipelineTypeEnum.PYSPARK]: 'PySpark',
  [PipelineTypeEnum.STREAMING]: 'Streaming',
};

/*
* These are not actual attributes on the Pipeline model. They are statuses
* depending on the status of the pipeline schedules (triggers) for a pipeline.
*/
export enum PipelineStatusEnum {
  ACTIVE = 'active',    // At least one active trigger
  INACTIVE = 'inactive',    // All inactive triggers
  NO_SCHEDULES = 'no_schedules',    // No triggers
}

export const PIPELINE_TYPE_TO_KERNEL_NAME = {
  [PipelineTypeEnum.PYTHON]: 'python3',
  [PipelineTypeEnum.PYSPARK]: 'pysparkkernel',
};

export default interface PipelineType {
  actions?: TransformerActionType[];
  blocks?: BlockType[];
  data_integration?: {
    catalog: CatalogType;
  };
  id?: number;
  metadata?: PipelineMetadataType;
  name?: string;
  schedules?: PipelineScheduleType[];
  type?: PipelineTypeEnum;
  uuid: string;
}
