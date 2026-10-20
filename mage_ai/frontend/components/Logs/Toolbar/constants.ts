import { LogRangeEnum } from '@interfaces/LogType';

export const LOG_ITEMS_PER_PAGE = 100;
export const LOG_FILE_COUNT_INTERVAL = 20;

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
