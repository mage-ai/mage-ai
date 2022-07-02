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
  downstream_blocks?: string[];
  file?: string;
  name?: string;
  priority?: number;
  status?: StatusTypeEnum;
  type?: BlockTypeEnum;
  upstream_blocks?: string[];
  uuid?: string;
}
