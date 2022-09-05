import PipelineScheduleType, { TriggerTypeEnum } from '@interfaces/PipelineScheduleType';

export function getTriggerType(pipelineSchedule: PipelineScheduleType) {
  if (!pipelineSchedule) {
    return null;
  }

  if (pipelineSchedule.schedule_interval && pipelineSchedule.start_time) {
    return TriggerTypeEnum.SCHEDULE;
  } else if (pipelineSchedule.event_matchers?.length >= 1) {
    return TriggerTypeEnum.EVENT;
  }

  return null;
}
