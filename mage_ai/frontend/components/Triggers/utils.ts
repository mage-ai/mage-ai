import moment from 'moment';

import BlockRunType from '@interfaces/BlockRunType';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import { DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET, dateFormatLong } from '@utils/date';
import { DEFAULT_PORT } from '@api/utils/url';
import {
  PipelineScheduleFilterQueryEnum,
  ScheduleIntervalEnum,
  ScheduleTypeEnum,
} from '@interfaces/PipelineScheduleType';
import { TimeType } from '@oracle/components/Calendar';
import { getDayRangeForCurrentMonth } from '@utils/date';
import { ignoreKeys } from '@utils/hash';
import { rangeSequential } from '@utils/array';

export const checkIfCustomInterval = (
  scheduleInterval: string,
) => !!scheduleInterval &&
  !Object.values(ScheduleIntervalEnum).includes(scheduleInterval as ScheduleIntervalEnum);

export function createBlockStatus(blockRuns: BlockRunType[]) {
  return blockRuns?.reduce(
    (prev, blockRun) => {
      const {
        block_uuid: blockUuid,
        completed_at: completedAt,
        started_at: startedAt,
        status,
      } = blockRun;

      let runtime = null;

      if (startedAt && completedAt) {
        const completedAtTs = moment(completedAt).valueOf();
        const startedAtTs = moment(startedAt).valueOf();

        runtime = completedAtTs - startedAtTs;
      }

      return {
        ...prev,
        [blockUuid]: {
          runtime,
          status: status,
        },
      };
    },
    {},
  );
}

export const getTriggerTypes = (
  isStreamingPipeline?: boolean,
): {
  description: () => string;
  label: () => string;
  uuid: ScheduleTypeEnum;
}[] => {
  const triggerTypes = [
    {
      description: () => 'This pipeline will run continuously on an interval or just once.',
      label: () => 'Schedule',
      uuid: ScheduleTypeEnum.TIME,
    },
    {
      description: () => 'This pipeline will run when a specific event occurs.',
      label: () => 'Event',
      uuid: ScheduleTypeEnum.EVENT,
    },
    {
      description: () => 'Run this pipeline when you make an API call.',
      label: () => 'API',
      uuid: ScheduleTypeEnum.API,
    },
  ];

  return isStreamingPipeline
    ? triggerTypes.slice(0, 1)
    : triggerTypes;
};

export function getPipelineScheduleApiFilterQuery(
  query: any,
) {
  const apiFilterQuery = ignoreKeys(
    query,
    [
      PipelineScheduleFilterQueryEnum.INTERVAL,
      PipelineScheduleFilterQueryEnum.TYPE,
    ],
  );
  const intervalQueryValue = query[PipelineScheduleFilterQueryEnum.INTERVAL];
  if (intervalQueryValue) {
    apiFilterQuery['schedule_interval[]'] = encodeURIComponent(intervalQueryValue);
  }
  const typeQueryValue = query[PipelineScheduleFilterQueryEnum.TYPE];
  if (typeQueryValue) {
    apiFilterQuery['schedule_type[]'] = typeQueryValue;
  }

  return apiFilterQuery;
}

export function getTimeInUTC(dateTime: string): Date {
  if (!dateTime) {
    return null;
  }
  const date = new Date(moment(dateTime).valueOf());

  const utcTs = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  );
  return new Date(utcTs);
}

export function getTimeInUTCString(dateTime: string) {
  if (typeof dateTime !== 'string') {
    return dateTime;
  }
  const formattedDate = dateTime.split('+')[0];

  return getTimeInUTC(formattedDate)
    .toISOString()
    .split('.')[0];
}

export enum TimeUnitEnum {
  DAY = 'day',
  HOUR = 'hour',
  MINUTE = 'minute',
  SECOND = 'second',
}

export const TIME_UNIT_TO_SECONDS = {
  [TimeUnitEnum.DAY]: 86400,
  [TimeUnitEnum.HOUR]: 3600,
  [TimeUnitEnum.MINUTE]: 60,
  [TimeUnitEnum.SECOND]: 1,
};

export function convertSeconds(seconds: number) {
  let unit = TimeUnitEnum.SECOND;
  let time = seconds;
  if (seconds % 86400 === 0) {
    time = time / 86400;
    unit = TimeUnitEnum.DAY;
  } else if (seconds % 3600 === 0) {
    time = time / 3600;
    unit = TimeUnitEnum.HOUR;
  } else if (seconds % 60 === 0) {
    time = time / 60;
    unit = TimeUnitEnum.MINUTE;
  }

  return {
    time,
    unit,
  };
}

export function convertToSeconds(time: number, unit: TimeUnitEnum) {
  return time * TIME_UNIT_TO_SECONDS[unit];
}

export function getDatetimeFromDateAndTime(
  date: Date,
  time: TimeType,
  opts?: {
    convertToUtc?: boolean,
    localTimezone?: boolean,
    includeSeconds?: boolean,
  },
): string {
  let datetimeString = `${date.toISOString().split('T')[0]} ${time?.hour}:${time?.minute}`;

  if (opts?.includeSeconds) {
    datetimeString = datetimeString.concat(':00');
  }
  if (opts?.localTimezone) {
    const momentObj = moment(date);
    momentObj.set('hour', +time?.hour || 0);
    momentObj.set('minute', +time?.minute || 0);
    momentObj.set('second', 0);
    datetimeString = momentObj.format(DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET);
    if (opts?.convertToUtc) {
      datetimeString = dateFormatLong(
        datetimeString,
        { includeSeconds: opts?.includeSeconds, utcFormat: true },
      );
    }
  }

  return datetimeString;
}

export function getTriggerApiEndpoint(pipelineSchedule: PipelineScheduleType) {
  let url = '';
  let port: string;

  const windowIsDefined = typeof window !== 'undefined';
  if (windowIsDefined) {
    url = `${window.origin}/api/pipeline_schedules/${pipelineSchedule?.id}/pipeline_runs`;

    if (pipelineSchedule?.token) {
      url = `${url}/${pipelineSchedule.token}`;
    }
  }

  if (windowIsDefined) {
    port = window.location.port;

    if (port) {
      url = url.replace(port, DEFAULT_PORT);
    }
  }

  return url;
}

type CronValueWithOffsetType = {
  additionalOffset: number;
  cronValue: string;
};
function calculateCronValueWithOffset(
  timeUnitValue: number,
  timeOffset: number,
  range: number[],
): CronValueWithOffsetType {
  let currentIndex = range.indexOf(timeUnitValue);
  let additionalOffsetForGreaterTimeUnit = 0;
  if (timeOffset < 0) {
    for (let i = 0; i > timeOffset; i--) {
      if (currentIndex === 0) {
        currentIndex = range.length - 1;
        additionalOffsetForGreaterTimeUnit -= 1;
      } else {
        currentIndex -= 1;
      }
    }
  } else if (timeOffset > 0) {
    for (let i = 0; i < timeOffset; i++) {
      if (currentIndex === range.length - 1) {
        currentIndex = 0;
        additionalOffsetForGreaterTimeUnit += 1;
      } else {
        currentIndex += 1;
      }
    }
  }
  return {
    additionalOffset: additionalOffsetForGreaterTimeUnit,
    cronValue: String(range[currentIndex] || timeUnitValue),
  };
}

function adjustSingleCronValueForTimeOffset(
  cronValue: string,
  timeOffset: number,
  timeRange: number[],
): CronValueWithOffsetType {
  if (cronValue.match(/[*,-/]/)) {
    return {
      additionalOffset: 0,
      cronValue,
    };
  } else {
    return calculateCronValueWithOffset(
      +cronValue,
      timeOffset,
      timeRange,
    );
  }
}

const minuteRange = rangeSequential(60);
const hourRange = rangeSequential(24);
const dayRange = getDayRangeForCurrentMonth();
export function convertUtcCronExpressionToLocalTimezone(
  cronExpression: string,
  reverse?: boolean,
) {
  if (!cronExpression) {
    return cronExpression;
  }

  const localTimezoneOffset = moment().local().format('Z');
  const offsetParts = localTimezoneOffset.split(':');
  const isNegativeOffset = localTimezoneOffset[0] === '-';
  let hourOffset = offsetParts[0].length === 3
    ? Number(offsetParts[0].slice(1))
    : Number(offsetParts[0]);
  let minuteOffset = Number(offsetParts[1]);
  if ((isNegativeOffset && !reverse) || (!isNegativeOffset && reverse)) {
    hourOffset = -hourOffset;
    minuteOffset = -minuteOffset;
  }

  const cronParts = cronExpression.split(' ');
  const minuteExpr = cronParts[0];
  const hourExpr = cronParts[1];
  const dayOfMonthExpr = cronParts[2];
  const minuteCronValueWithHourOffset = adjustSingleCronValueForTimeOffset(
    minuteExpr,
    minuteOffset,
    minuteRange,
  );
  const hourCronValueWithDayOffset = adjustSingleCronValueForTimeOffset(
    hourExpr,
    hourOffset + minuteCronValueWithHourOffset.additionalOffset,
    hourRange,
  );
  cronParts[0] = minuteCronValueWithHourOffset.cronValue;
  cronParts[1] = hourCronValueWithDayOffset.cronValue;
  if (hourCronValueWithDayOffset?.additionalOffset !== 0) {
    const dayOfMonthCronValue = adjustSingleCronValueForTimeOffset(
      dayOfMonthExpr,
      hourCronValueWithDayOffset.additionalOffset,
      dayRange,
    );
    cronParts[2] = dayOfMonthCronValue.cronValue;
  }

  return cronParts.join(' ');
}
