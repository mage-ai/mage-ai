import moment from 'moment';

import BlockRunType from '@interfaces/BlockRunType';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import { DEFAULT_PORT } from '@api/utils/url';

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

export function getTimeInUTC(dateTime: string) {
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
