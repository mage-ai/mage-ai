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
  id?: string;
  name?: string;
  pipeline_uuid?: string;
  schedule_type?: ScheduleTypeEnum;
  start_time?: string;
  schedule_interval?: string;
  status?: ScheduleStatusEnum;
}
