import EventMatcherType from './EventMatcherType';
import { RunStatus as RunStatusEnum } from './BlockRunType';

export enum ScheduleTypeEnum {
  API = 'api',
  EVENT = 'event',
  TIME = 'time',
}

export const SCHEDULE_TYPE_TO_LABEL = {
  [ScheduleTypeEnum.API]: () => 'API',
  [ScheduleTypeEnum.EVENT]: () => 'event',
  [ScheduleTypeEnum.TIME]: () => 'schedule',
};

export enum ScheduleStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum ScheduleIntervalEnum {
  ONCE = '@once',
  HOURLY = '@hourly',
  DAILY = '@daily',
  WEEKLY = '@weekly',
  MONTHLY = '@monthly',
}

export interface SelectedScheduleType {
  pipelineUuid: string;
  scheduleName?: string;
}

export enum PipelineScheduleFilterQueryEnum {
  INTERVAL = 'frequency[]',
  STATUS = 'status[]',
  TAG = 'tag[]',
  TYPE = 'type[]',
}

export enum SortQueryParamEnum {
  CREATED_AT = 'created_at',
  NAME = 'name',
  PIPELINE = 'pipeline_uuid',
  STATUS = 'status',
  TYPE = 'schedule_type',
}

export interface PipelineScheduleSettingsType {
  allow_blocks_to_fail?: boolean;
  landing_time_enabled?: boolean;
  skip_if_previous_running?: boolean;
  timeout?: number;
}

export const SORT_QUERY_TO_COLUMN_NAME_MAPPING = {
  [SortQueryParamEnum.CREATED_AT]: 'Created at',
  [SortQueryParamEnum.NAME]: 'Name',
  [SortQueryParamEnum.PIPELINE]: 'Pipeline',
  [SortQueryParamEnum.STATUS]: 'Active',
  [SortQueryParamEnum.TYPE]: 'Type',
};

export interface PipelineScheduleReqQueryParamsType {
  _limit?: number;
  _offset?: number;
  order_by?: SortQueryParamEnum;
}

export default interface PipelineScheduleType {
  created_at?: string;
  description?: string;
  event_matchers?: EventMatcherType[];
  global_data_product_uuid?: string;
  id?: number;
  last_pipeline_run_status?: RunStatusEnum;
  name?: string;
  next_pipeline_run_date?: string;
  pipeline_runs_count?: number;
  pipeline_uuid?: string;
  runtime_average?: number;
  schedule_interval?: string;
  schedule_type?: ScheduleTypeEnum;
  settings?: PipelineScheduleSettingsType;
  sla?: number;
  start_time?: string;
  status?: ScheduleStatusEnum;
  tags?: string[];
  token?: string;
  updated_at?: string;
  variables?: {
    [key: string]: string | number;
  };
}
