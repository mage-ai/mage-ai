import FeatureType from '@interfaces/FeatureType';
import SuggestionType from './SuggestionType';
import { ActionTypeEnum, AxisEnum } from './ActionPayloadType';
import { ConfigurationType } from './ChartBlockType';
import { DataSourceTypeEnum } from './DataSourceType';
import { DataTypeEnum } from './KernelOutputType';

export enum TagEnum {
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

export enum BlockTypeEnum {
  CALLBACK = 'callback',
  CHART = 'chart',
  CUSTOM = 'custom',
  DATA_EXPORTER = 'data_exporter',
  DATA_LOADER = 'data_loader',
  DBT = 'dbt',
  EXTENSION = 'extension',
  SCRATCHPAD = 'scratchpad',
  SENSOR = 'sensor',
  MARKDOWN = 'markdown',
  TRANSFORMER = 'transformer',
}

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
  BlockTypeEnum.SCRATCHPAD,
  BlockTypeEnum.SENSOR,
  BlockTypeEnum.MARKDOWN,
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

export interface BlockRequestPayloadType {
  color?: BlockColorEnum;
  config?: {
    data_source?: DataSourceTypeEnum;
    action_type?: ActionTypeEnum;
    axis?: AxisEnum;
    suggested_action?: SuggestionType;
    template_path?: string;
  };
  configuration?: ConfigurationType;
  content?: string;
  converted_from_type?: string;
  converted_from_uuid?: string;
  extension_uuid?: string;
  language?: BlockLanguageEnum;
  name?: string;
  priority?: number;
  replicated_block?: string;
  type?: BlockTypeEnum;
  upstream_blocks?: string[];
}

export default interface BlockType {
  all_upstream_blocks_executed?: boolean;
  callback_blocks?: string[];
  callback_content?: string;
  color?: BlockColorEnum;
  configuration?: ConfigurationType;
  content?: string;
  converted_from?: string;
  downstream_blocks?: string[];
  error?: {
    error: string;
    message: string;
  };
  extension_uuid?: string;
  file?: string;
  has_callback?: boolean;
  language?: BlockLanguageEnum;
  metadata?: {
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
  priority?: number;
  replicated_block?: string;
  status?: StatusTypeEnum;
  tags?: TagEnum[];
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
  [BlockTypeEnum.EXTENSION]: 'Callback',
  [BlockTypeEnum.CUSTOM]: 'Custom',
  [BlockTypeEnum.DATA_EXPORTER]: 'Data exporter',
  [BlockTypeEnum.DATA_LOADER]: 'Data loader',
  [BlockTypeEnum.EXTENSION]: 'Extension',
  [BlockTypeEnum.SCRATCHPAD]: 'Scratchpad',
  [BlockTypeEnum.SENSOR]: 'Sensor',
  [BlockTypeEnum.MARKDOWN]: 'Markdown',
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
