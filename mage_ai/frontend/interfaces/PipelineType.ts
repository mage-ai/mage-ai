import BlockType from './BlockType';
import PipelineScheduleType from './PipelineScheduleType';
import TransformerActionType from './TransformerActionType';
import { Batch, HexagonAll, Integration, Streaming } from '@oracle/icons';
import { CatalogType } from './IntegrationSourceType';
import { ExecutorTypeEnum } from '@interfaces/ExecutorType';
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

export const ALL_PIPELINE_RUNS_TYPE = 'all';

export const PIPELINE_TYPES_TO_DISPLAY = [
  PipelineTypeEnum.PYTHON,
  PipelineTypeEnum.INTEGRATION,
  PipelineTypeEnum.STREAMING,
];

export const PIPELINE_TYPE_ICON_MAPPING = {
  [ALL_PIPELINE_RUNS_TYPE]: HexagonAll,
  [PipelineTypeEnum.INTEGRATION]: Integration,
  [PipelineTypeEnum.PYTHON]: Batch,
  [PipelineTypeEnum.STREAMING]: Streaming,
};

/*
* These are not actual attributes on the Pipeline model. They are statuses
* depending on the status of the pipeline schedules (triggers) for a pipeline.
*/
export enum PipelineStatusEnum {
  ACTIVE = 'active',    // At least one active trigger
  INACTIVE = 'inactive',    // All inactive triggers
  NO_SCHEDULES = 'no_schedules',    // No triggers
  RETRY = 'retry',
  // Retry incomplete block runs for failed pipeline runs specifically
  RETRY_INCOMPLETE_BLOCK_RUNS = 'retry_incomplete_block_runs',
}

export enum PipelineQueryEnum {
  GROUP = 'group_by',
  STATUS = 'status[]',
  TAG = 'tag[]',
  TYPE = 'type[]',
}

export enum PipelineGroupingEnum {
  STATUS = 'status',
  TAG = 'tag',
  TYPE = 'type',
}

export const PIPELINE_TYPE_TO_KERNEL_NAME = {
  [PipelineTypeEnum.PYTHON]: 'python3',
  [PipelineTypeEnum.PYSPARK]: 'pysparkkernel',
};

export interface PipelineExtensionsType {
  [key: string]: {
    blocks?: BlockType[];
  };
}

export interface PipelineRetryConfigType {
  delay?: number;
  exponential_backoff?: boolean;
  max_delay?: number;
  retries?: number;
}

export default interface PipelineType {
  actions?: TransformerActionType[];
  blocks?: BlockType[];
  callbacks?: BlockType[];
  conditionals?: BlockType[];
  created_at?: string;
  data_integration?: {
    catalog: CatalogType;
  };
  description?: string;
  executor_type?: ExecutorTypeEnum;
  extensions?: PipelineExtensionsType;
  id?: number;
  metadata?: PipelineMetadataType;
  name?: string;
  retry_config?: PipelineRetryConfigType;
  run_pipeline_in_one_process?: boolean;
  schedules?: PipelineScheduleType[];
  tags?: string[];
  type?: PipelineTypeEnum;
  updated_at?: string;
  uuid: string;
  widgets?: BlockType[];
}
