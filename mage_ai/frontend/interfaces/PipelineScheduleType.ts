export enum ScheduleTypeEnum {
  TIME = 'time',
}

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


export default interface PipelineScheduleType {
  created_at?: string;
  id?: string;
  name?: string;
  pipeline_runs_count?: number;
  pipeline_uuid?: string;
  schedule_interval?: string;
  schedule_type?: ScheduleTypeEnum;
  start_time?: string;
  status?: ScheduleStatusEnum;
  updated_at?: string;
  variables?: {
    [key: string]: string | number;
  };
}
