import { BlockTypeEnum } from './BlockType';
import { ConfigurationType } from './ChartBlockType';

export enum DataSourceEnum {
  BLOCK = 'block',
  BLOCK_RUNS = 'block_runs',
  CHART_CODE = 'chart_code',
  PIPELINES = 'pipelines',
  PIPELINE_RUNS = 'pipeline_runs',
  PIPELINE_SCHEDULES = 'pipeline_schedules',
}

export interface DataSourceType {
  block_uuid?: string;
  partitions?: number | string[];
  pipeline_schedule_id?: number;
  pipeline_uuid?: string;
  refresh_interval?: number;
  type: DataSourceEnum;
}

export default interface BlockLayoutItemType {
  configuration?: ConfigurationType;
  data?: {
    [key: string]: any;
  };
  data_source: DataSourceType;
  name?: string;
  type: BlockTypeEnum;
  uuid: string;
}
