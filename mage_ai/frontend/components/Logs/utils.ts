import { FilterQueryParamEnum } from './Filter';
import { queryFromUrl } from '@utils/url';

export const getLogScrollPositionLocalStorageKey = (
  pipelineUUID: string,
) => {
  const q = queryFromUrl();
  const pipelineScheduleIds = (q?.[FilterQueryParamEnum.PIPELINE_SCHEDULE_ID] || []).join(',');

  return `${pipelineUUID}/logs/triggers/${pipelineScheduleIds}`;
};
