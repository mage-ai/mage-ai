import { LogRangeEnum } from '@interfaces/LogType';

export const SPECIFIC_LOG_RANGES = [
  LogRangeEnum.LAST_HOUR,
  LogRangeEnum.LAST_DAY,
  LogRangeEnum.LAST_WEEK,
];

export const LOG_RANGE_SEC_INTERVAL_MAPPING = {
  [LogRangeEnum.LAST_HOUR]: 3600,
  [LogRangeEnum.LAST_DAY]: 86400,
  [LogRangeEnum.LAST_WEEK]: 604800,
};
