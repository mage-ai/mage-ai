import { LogRangeEnum } from '@interfaces/LogType';

export const LIMIT_PARAM = '_limit';
export const OFFSET_PARAM = '_offset';
export const LOG_ITEMS_PER_PAGE = 100;

/*
 * LOG_OFFSET_INTERVAL is the default number of hour log groupings fetched.
 * (e.g. If user fetches a day's worth of logs, and there are logs written
 * during each hour that day, there would be 2 batches of logs fetched, each
 * batch containing 12 hour groupings of logs.)
 *
 * Since streaming pipelines would be expected to have continuous logs while
 * they are running, the log grouping interval is lower than for other types
 * of pipelines. Increase the numbers below to increase the amount of logs fetched
 * at a time.
*/
export const LOG_OFFSET_INTERVAL = 12;
export const LOG_STREAM_OFFSET_INTERVAL = 1;

export const SPECIFIC_LOG_RANGES = [
  LogRangeEnum.LAST_HOUR,
  LogRangeEnum.LAST_DAY,
  LogRangeEnum.LAST_WEEK,
  LogRangeEnum.LAST_30_DAYS,
];

export const LOG_RANGE_SEC_INTERVAL_MAPPING = {
  [LogRangeEnum.LAST_HOUR]: 3600,
  [LogRangeEnum.LAST_DAY]: 86400,
  [LogRangeEnum.LAST_WEEK]: 604800,
  [LogRangeEnum.LAST_30_DAYS]: 2592000,
};
