export enum ScheduleTypeEnum {
  TIME = 'time',
}

export enum ScheduleStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface SelectedScheduleType {
  pipelineUuid: string;
  scheduleName: string;
}

export default interface PipelineScheduleType {
  name: string;
  pipeline_uuid: string;
  schedule_type: ScheduleTypeEnum;
  start_time: string;
  schedule_interval: string;
  status: ScheduleStatusEnum;
}
