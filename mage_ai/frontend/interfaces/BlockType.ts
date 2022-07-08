import FeatureType from '@interfaces/FeatureType';
import { DataTypeEnum } from './KernelOutputType';

export enum BlockTypeEnum {
  DATA_EXPORTER = 'data_exporter',
  DATA_LOADER = 'data_loader',
  SCRATCHPAD = 'scratchpad',
  TRANSFORMER = 'transformer',
}

export const BLOCK_TYPES = [
  BlockTypeEnum.DATA_EXPORTER,
  BlockTypeEnum.DATA_LOADER,
  BlockTypeEnum.SCRATCHPAD,
  BlockTypeEnum.TRANSFORMER,
];

export enum StatusTypeEnum {
  EXECUTED = 'executed',
  NOT_EXECUTED = 'not_executed',
}

export interface SampleDataType {
  columns: string[];
  rows: string[][] | number[][];
}

export interface OutputType {
  sample_data: SampleDataType;
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

export default interface BlockType {
  content?: string;
  downstream_blocks?: string[];
  file?: string;
  name?: string;
  outputs?: OutputType[];
  priority?: number;
  status?: StatusTypeEnum;
  type?: BlockTypeEnum;
  upstream_blocks?: string[];
  uuid?: string;
}

export const BLOCK_TYPE_NAME_MAPPING = {
  [BlockTypeEnum.DATA_EXPORTER]: 'Data exporter',
  [BlockTypeEnum.DATA_LOADER]: 'Data loader',
  [BlockTypeEnum.SCRATCHPAD]: 'Scratchpad',
  [BlockTypeEnum.TRANSFORMER]: 'Transformer',
};

export const BLOCK_TYPE_ABBREVIATION_MAPPING = {
  [BlockTypeEnum.DATA_EXPORTER]: 'DE',
  [BlockTypeEnum.DATA_LOADER]: 'DL',
  [BlockTypeEnum.SCRATCHPAD]: 'SP',
  [BlockTypeEnum.TRANSFORMER]: 'TF',
};

export type SetEditingBlockType = {
  setEditingBlock: (data: {
    upstreamBlocks: {
      block: BlockType;
      values: BlockType[];
    };
  }) => void;
};
