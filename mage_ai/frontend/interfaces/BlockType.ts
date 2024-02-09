import FeatureType from '@interfaces/FeatureType';
import SuggestionType from './SuggestionType';
import { ActionTypeEnum, AxisEnum } from './ActionPayloadType';
import { CatalogType } from './IntegrationSourceType';
import { ConfigurationType } from './ChartBlockType';
import { DataSourceTypeEnum } from './DataSourceType';
import { DataTypeEnum } from './KernelOutputType';
import { ExecutorTypeEnum } from '@interfaces/ExecutorType';
import { IntegrationDestinationEnum, IntegrationSourceEnum } from './IntegrationSourceType';

export enum TagEnum {
  CONDITION = 'condition',
  DBT_SNAPSHOT = 'snapshot',
  DYNAMIC = 'dynamic',
  DYNAMIC_CHILD = 'dynamic_child',
  REDUCE_OUTPUT = 'reduce_output',
  REPLICA = 'replica',
}

export enum BlockLanguageEnum {
  MARKDOWN = 'markdown',
  PYTHON = 'python',
  R = 'r',
  SQL = 'sql',
  YAML = 'yaml',
}

export const ABBREV_BLOCK_LANGUAGE_MAPPING = {
  [BlockLanguageEnum.MARKDOWN]: 'MD',
  [BlockLanguageEnum.PYTHON]: 'PY',
  [BlockLanguageEnum.R]: 'R',
  [BlockLanguageEnum.SQL]: 'SQL',
  [BlockLanguageEnum.YAML]: 'YAML',
};

// Consider using the one from interfaces/FileType.ts
export const LANGUAGE_DISPLAY_MAPPING = {
  [BlockLanguageEnum.MARKDOWN]: 'Markdown',
  [BlockLanguageEnum.PYTHON]: 'Python',
  [BlockLanguageEnum.R]: 'R',
  [BlockLanguageEnum.SQL]: 'SQL',
  [BlockLanguageEnum.YAML]: 'YAML',
};

export enum BlockTypeEnum {
  CALLBACK = 'callback',
  CHART = 'chart',
  CONDITIONAL = 'conditional',
  CUSTOM = 'custom',
  DATA_EXPORTER = 'data_exporter',
  DATA_LOADER = 'data_loader',
  DBT = 'dbt',
  EXTENSION = 'extension',
  GLOBAL_DATA_PRODUCT = 'global_data_product',
  SCRATCHPAD = 'scratchpad',
  SENSOR = 'sensor',
  MARKDOWN = 'markdown',
  TRANSFORMER = 'transformer',
}

export const ALL_BLOCK_TYPES_WITH_SINGULAR_FOLDERS = {
  [BlockTypeEnum.CUSTOM]: BlockTypeEnum.CUSTOM,
  [BlockTypeEnum.DBT]: BlockTypeEnum.DBT,
};

export const ALL_BLOCK_TYPES = Object.entries(BlockTypeEnum).reduce((acc, [k, v]) => ({
  ...acc,
  [v]: k,
}), {});

export const SIDEKICK_BLOCK_TYPES = [
  BlockTypeEnum.CALLBACK,
  BlockTypeEnum.CONDITIONAL,
  BlockTypeEnum.EXTENSION,
];

export const ADD_ON_BLOCK_TYPES = [
  BlockTypeEnum.CALLBACK,
  BlockTypeEnum.CONDITIONAL,
];

export enum BlockColorEnum {
  BLUE = 'blue',
  GREY = 'grey',
  PINK = 'pink',
  PURPLE = 'purple',
  TEAL = 'teal',
  YELLOW = 'yellow',
}

export const BLOCK_TYPES = [
  BlockTypeEnum.CHART,
  BlockTypeEnum.CUSTOM,
  BlockTypeEnum.DATA_EXPORTER,
  BlockTypeEnum.DATA_LOADER,
  BlockTypeEnum.DBT,
  BlockTypeEnum.MARKDOWN,
  BlockTypeEnum.SCRATCHPAD,
  BlockTypeEnum.SENSOR,
  BlockTypeEnum.TRANSFORMER,
];

export const DRAGGABLE_BLOCK_TYPES = [
  BlockTypeEnum.CALLBACK,
  BlockTypeEnum.CONDITIONAL,
  BlockTypeEnum.CUSTOM,
  BlockTypeEnum.DATA_EXPORTER,
  BlockTypeEnum.DATA_LOADER,
  BlockTypeEnum.DBT,
  BlockTypeEnum.MARKDOWN,
  BlockTypeEnum.SCRATCHPAD,
  BlockTypeEnum.SENSOR,
  BlockTypeEnum.TRANSFORMER,
];

export const YAML_BLOCK_TYPES = [
  BlockTypeEnum.DATA_EXPORTER,
  BlockTypeEnum.DATA_LOADER,
];

export const R_BLOCK_TYPES = [
  BlockTypeEnum.DATA_EXPORTER,
  BlockTypeEnum.DATA_LOADER,
  BlockTypeEnum.TRANSFORMER,
];

export const SQL_BLOCK_TYPES = [
  BlockTypeEnum.DATA_EXPORTER,
  BlockTypeEnum.DATA_LOADER,
  BlockTypeEnum.DBT,
  BlockTypeEnum.TRANSFORMER,
];

export const BLOCK_TYPES_NO_DATA_TABLE = [
  BlockTypeEnum.CHART,
  BlockTypeEnum.SCRATCHPAD,
  BlockTypeEnum.SENSOR,
  BlockTypeEnum.MARKDOWN,
];

export const BLOCK_TYPES_WITH_NO_PARENTS = [
  BlockTypeEnum.CALLBACK,
  BlockTypeEnum.CHART,
  BlockTypeEnum.EXTENSION,
  BlockTypeEnum.SCRATCHPAD,
  BlockTypeEnum.MARKDOWN,
];

export const BLOCK_TYPES_WITH_VARIABLES = [
  BlockTypeEnum.CUSTOM,
  BlockTypeEnum.DATA_EXPORTER,
  BlockTypeEnum.DATA_LOADER,
  BlockTypeEnum.SENSOR,
  BlockTypeEnum.TRANSFORMER,
];

export enum StatusTypeEnum {
  EXECUTED = 'executed',
  FAILED = 'failed',
  NOT_EXECUTED = 'not_executed',
  UPDATED = 'updated',
}

export interface SampleDataType {
  columns: string[];
  rows: string[][] | number[][];
}

export interface OutputType {
  multi_output?: boolean;
  sample_data: SampleDataType;
  shape: number[];
  text_data: string;
  type: DataTypeEnum;
  variable_uuid: string;
}

export interface InsightType {
  feature: FeatureType;
}

export interface MetadataType {
  [uuid: string]: string | number;
}

export interface StatisticsType {
  [key: string]: {
    [key: string]: number;
  };
}

export interface AnalysisType {
  insights: InsightType[][];
  metadata: MetadataType;
  statistics: StatisticsType;
  suggestions: any;
  variable_uuid: string;
}

export enum ObjectType {
  BLOCK_FILE = 'block_file',
  CUSTOM_BLOCK_TEMPLATE = 'custom_block_template',
  MAGE_TEMPLATE = 'mage_template',
}

export interface BlockRequestConfigType {
  action_type?: ActionTypeEnum;
  axis?: AxisEnum;
  custom_template?: {
    block_type?: BlockTypeEnum;
    description?: string;
    groups?: string[];
    language?: string;
    name?: string;
    path?: string;
    template_variables?: {
      [key: string]: string | number;
    };
  };
  custom_template_uuid?: string;
  data_source?: DataSourceTypeEnum;
  suggested_action?: SuggestionType;
  template_path?: string;
}

export interface BlockRequestPayloadType {
  block_action_object?: {
    block_type?: BlockTypeEnum;
    description?: string;
    language?: BlockLanguageEnum;
    object_type: ObjectType;
    title?: string;
    uuid: string;
  };
  color?: BlockColorEnum;
  config?: BlockRequestConfigType;
  configuration?: ConfigurationType;
  content?: string;
  converted_from_type?: string;
  converted_from_uuid?: string;
  defaults?: {
    language?: BlockLanguageEnum;
  };
  detach?: boolean;
  downstream_blocks?: string[];
  extension_uuid?: string;
  language?: BlockLanguageEnum;
  name?: string;
  priority?: number;
  replicated_block?: string;
  require_unique_name?: boolean;
  type?: BlockTypeEnum;
  uuid?: string;
  upstream_blocks?: string[];
}

export interface BlockPipelineType {
  added_at?: string;
  pipeline: {
    created_at?: string;
    description?: string;
    name: string;
    tags?: string[];
    repo_path?: string;
    type: string;
    updated_at: string;
    uuid: string;
  };
  updated_at: string;
}

export interface BlockRetryConfigType {
  delay?: number;
  exponential_backoff?: boolean;
  max_delay?: number;
  retries?: number;
}

export default interface BlockType {
  all_upstream_blocks_executed?: boolean;
  callback_blocks?: string[];
  callback_content?: string;
  catalog?: CatalogType;
  conditional_blocks?: string[];
  color?: BlockColorEnum;
  config?: BlockRequestConfigType;
  configuration?: ConfigurationType;
  content?: string;
  converted_from?: string;
  defaults?: {
    language?: BlockLanguageEnum;
  };
  detach?: boolean;
  description?: string;
  documentation?: string;
  downstream_blocks?: string[];
  error?: {
    error: string;
    message: string;
  };
  executor_type?: ExecutorTypeEnum;
  extension_uuid?: string;
  file?: string;
  force?: boolean;
  has_callback?: boolean;
  language?: BlockLanguageEnum;
  metadata?: {
    data_integration?: {
      config?: {
        [key: string]: number | string;
      };
      destination?: IntegrationDestinationEnum;
      name?: string;
      source?: IntegrationSourceEnum;
      sql?: boolean;
    };
    dbt?: {
      block?: {
        snapshot?: boolean;
      };
      lineage?: BlockType[];
      project: string;
      projects: {
        [name: string]: {
          target: string;
          targets: string[];
        };
      };
      sql?: string;
    };
  };
  name?: string;
  outputs?: OutputType[];
  pipelines?: BlockPipelineType[];
  priority?: number;
  replicated_block?: string;
  retry_config?: BlockRetryConfigType;
  runtime?: number;
  status?: StatusTypeEnum;
  tags?: TagEnum[];
  timeout?: number;
  type?: BlockTypeEnum;
  upstream_blocks?: string[];
  uuid?: string;
}

export const BLOCK_TYPES_WITH_UPSTREAM_INPUTS = [
  BlockTypeEnum.CUSTOM,
  BlockTypeEnum.DATA_EXPORTER,
  BlockTypeEnum.DATA_LOADER,
  BlockTypeEnum.TRANSFORMER,
];

export const BLOCK_TYPE_NAME_MAPPING = {
  [BlockTypeEnum.CALLBACK]: 'Callback',
  [BlockTypeEnum.CHART]: 'Chart',
  [BlockTypeEnum.CONDITIONAL]: 'Conditional',
  [BlockTypeEnum.CUSTOM]: 'Custom',
  [BlockTypeEnum.DATA_EXPORTER]: 'Data exporter',
  [BlockTypeEnum.DATA_LOADER]: 'Data loader',
  [BlockTypeEnum.DBT]: 'DBT',
  [BlockTypeEnum.EXTENSION]: 'Extension',
  [BlockTypeEnum.GLOBAL_DATA_PRODUCT]: 'Global data product',
  [BlockTypeEnum.MARKDOWN]: 'Markdown',
  [BlockTypeEnum.SCRATCHPAD]: 'Scratchpad',
  [BlockTypeEnum.SENSOR]: 'Sensor',
  [BlockTypeEnum.TRANSFORMER]: 'Transformer',
};

// Specific order, don’t change
export const CONVERTIBLE_BLOCK_TYPES = [
  BlockTypeEnum.DATA_LOADER,
  BlockTypeEnum.TRANSFORMER,
  BlockTypeEnum.DATA_EXPORTER,
  BlockTypeEnum.SENSOR,
];

export const BLOCK_TYPE_ABBREVIATION_MAPPING = {
  [BlockTypeEnum.DATA_EXPORTER]: 'DE',
  [BlockTypeEnum.DATA_LOADER]: 'DL',
  [BlockTypeEnum.SCRATCHPAD]: 'SP',
  [BlockTypeEnum.SENSOR]: 'SR',
  [BlockTypeEnum.MARKDOWN]: 'MD',
  [BlockTypeEnum.TRANSFORMER]: 'TF',
};

export type SetEditingBlockType = {
  setEditingBlock?: (data: {
    upstreamBlocks: {
      block: BlockType;
      values: BlockType[];
    };
  }) => void;
};
