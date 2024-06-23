import BlockType from './BlockType';
import PipelineScheduleType from './PipelineScheduleType';
import TransformerActionType from './TransformerActionType';
import { BatchPipeline, HexagonAll, IntegrationPipeline, StreamingPipeline } from '@oracle/icons';
import { CatalogType } from './IntegrationSourceType';
import { ExecutorTypeEnum } from '@interfaces/ExecutorType';
import { KernelNameEnum } from './KernelType';
import { PipelineMetadataType } from './MetadataType';
import {
  GroupUUIDEnum,
  PipelineExecutionFrameworkUUIDEnum,
} from './PipelineExecutionFramework/types';

export enum PipelineTypeEnum {
  EXECUTION_FRAMEWORK = 'execution_framework',
  INTEGRATION = 'integration',
  PYTHON = 'python',
  PYSPARK = 'pyspark',
  STREAMING = 'streaming',
}

export enum ConcurrencyConfigRunLimitReachedActionEnum {
  SKIP = 'skip',
  WAIT = 'wait',
}

// Invalid pipeline type used for pipelines with invalid configuration
export const PIPELINE_TYPE_INVALID = 'invalid';

export const PIPELINE_TYPE_DISPLAY_NAME = {
  [PipelineTypeEnum.INTEGRATION]: 'Integration',
  [PipelineTypeEnum.PYTHON]: 'Python',
  [PipelineTypeEnum.PYSPARK]: 'PySpark',
  [PipelineTypeEnum.STREAMING]: 'Streaming',
};

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
  [PipelineTypeEnum.INTEGRATION]: IntegrationPipeline,
  [PipelineTypeEnum.PYTHON]: BatchPipeline,
  [PipelineTypeEnum.STREAMING]: StreamingPipeline,
};

/*
 * These are not actual attributes on the Pipeline model. They are statuses
 * depending on the status of the pipeline schedules (triggers) for a pipeline.
 */
export enum PipelineStatusEnum {
  ACTIVE = 'active', // At least one active trigger
  INACTIVE = 'inactive', // All inactive triggers
  NO_SCHEDULES = 'no_schedules', // No triggers
  RETRY = 'retry',
  // Retry incomplete block runs for failed pipeline runs specifically
  RETRY_INCOMPLETE_BLOCK_RUNS = 'retry_incomplete_block_runs',
}

export enum PipelineQueryEnum {
  GROUP = 'group_by',
  HISTORY_DAYS = 'from_history_days',
  NO_TAGS = 'no_tags',
  SEARCH = 'search',
  STATUS = 'status[]',
  TAG = 'tag[]',
  TYPE = 'type[]',
}

export enum PipelineGroupingEnum {
  STATUS = 'status',
  TAG = 'tag',
  TYPE = 'type',
}

export const FILTERABLE_PIPELINE_STATUSES: PipelineStatusEnum[] = [
  PipelineStatusEnum.ACTIVE,
  PipelineStatusEnum.INACTIVE,
  PipelineStatusEnum.NO_SCHEDULES,
];

export const PIPELINE_TYPE_TO_KERNEL_NAME = {
  [PipelineTypeEnum.PYTHON]: KernelNameEnum.PYTHON3,
  [PipelineTypeEnum.PYSPARK]: KernelNameEnum.PYSPARK,
};

export const KERNEL_NAME_TO_PIPELINE_TYPE = Object.entries(PIPELINE_TYPE_TO_KERNEL_NAME).reduce(
  (acc, [k, v]) => ({
    ...acc,
    [v]: k,
  }),
  {},
);

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

interface PipelineSettingsTriggersType {
  save_in_code_automatically?: boolean;
}

export interface PipelineSettingsType {
  triggers?: PipelineSettingsTriggersType;
}

interface ConcurrencyConfigType {
  block_run_limit?: number;
  on_pipeline_run_limit_reached?: ConcurrencyConfigRunLimitReachedActionEnum;
  pipeline_run_limit?: number;
  pipeline_run_limit_all_triggers?: number;
}

export default interface PipelineType {
  actions?: TransformerActionType[];
  blocks?: BlockType[];
  callbacks?: BlockType[];
  concurrency_config?: ConcurrencyConfigType;
  conditionals?: BlockType[];
  created_at?: string;
  data_integration?: {
    catalog: CatalogType;
  };
  description?: string;
  executor_type?: ExecutorTypeEnum;
  execution_framework?: PipelineExecutionFrameworkUUIDEnum;
  extensions?: PipelineExtensionsType;
  groups?: GroupUUIDEnum[];
  id?: number;
  metadata?: PipelineMetadataType;
  name?: string;
  pipeline_schedule_id?: string;
  retry_config?: PipelineRetryConfigType;
  run_pipeline_in_one_process?: boolean;
  schedules?: PipelineScheduleType[];
  settings?: PipelineSettingsType;
  tags?: string[];
  type?: PipelineTypeEnum;
  updated_at?: string;
  uuid: string;
  variables?: { [keyof: string]: string };
  widgets?: BlockType[];
}
