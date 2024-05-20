import { BlockTypeEnum } from './BlockType';
import { ConfigurationType } from './ChartBlockType';

export enum DataSourceEnum {
  BLOCK = 'block',
  BLOCK_RUNS = 'block_runs',
  CHART_CODE = 'chart_code',
  PIPELINES = 'pipelines',
  PIPELINE_RUNS = 'pipeline_runs',
  PIPELINE_SCHEDULES = 'pipeline_schedules',
  SYSTEM_METRICS = 'system_metrics',
}

export enum RenderTypeEnum {
  HTML = 'html',
  JPEG = 'jpeg',
  JPG = 'jpg',
  PNG = 'png',
}

export const DATA_SOURCES = [
  DataSourceEnum.BLOCK,
  DataSourceEnum.BLOCK_RUNS,
  DataSourceEnum.CHART_CODE,
  DataSourceEnum.PIPELINES,
  DataSourceEnum.PIPELINE_RUNS,
  DataSourceEnum.PIPELINE_SCHEDULES,
  DataSourceEnum.SYSTEM_METRICS,
];

export const DATA_SOURCES_HUMAN_READABLE_MAPPING = {
  [DataSourceEnum.BLOCK]: 'Block data output',
  [DataSourceEnum.BLOCK_RUNS]: 'Block runs',
  [DataSourceEnum.CHART_CODE]: 'Custom code',
  [DataSourceEnum.PIPELINES]: 'Pipelines',
  [DataSourceEnum.PIPELINE_RUNS]: 'Pipeline runs',
  [DataSourceEnum.PIPELINE_SCHEDULES]: 'Triggers',
  [DataSourceEnum.SYSTEM_METRICS]: 'System metrics',
};

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
  content?: string;
  data?: {
    columns?: string[];
    render?: string;
    render_type?: RenderTypeEnum;
    x?: string[];
    y?: number[][];
  };
  data_source: DataSourceType;
  name?: string;
  type: BlockTypeEnum;
  uuid: string;
}
