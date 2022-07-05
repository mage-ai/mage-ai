export enum BlockTypeEnum {
  DATA_EXPORTER = 'data_exporter',
  DATA_LOADER = 'data_loader',
  SCRATCHPAD = 'scratchpad',
  TRANSFORMER = 'transformer',
}

export enum StatusTypeEnum {
  EXECUTED = 'executed',
  NOT_EXECUTED = 'not_executed',
}

export default interface BlockType {
  content?: string;
  downstream_blocks?: string[];
  file?: string;
  name?: string;
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
