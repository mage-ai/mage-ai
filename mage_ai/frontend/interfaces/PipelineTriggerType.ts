import {
  PipelineScheduleSettingsType,
  ScheduleStatusEnum,
  ScheduleTypeEnum,
} from './PipelineScheduleType';

export default interface PipelineTriggerType {
  envs?: string[];
  name?: string;
  pipeline_uuid?: string;
  schedule_interval?: string;
  schedule_type?: ScheduleTypeEnum;
  settings?: PipelineScheduleSettingsType;
  sla?: number;
  start_time?: string;
  status?: ScheduleStatusEnum;
  variables?: {
    [key: string]: string | number;
  };
}
