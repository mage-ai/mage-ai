import moment from 'moment';

import LogType, { LogDataType } from '@interfaces/LogType';
import { isJsonString } from '@utils/string';

const DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}$/;
const REGEX = /([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}) (.+)/;

function initializeLog(log: LogType) {
  const { content } = log;
  const match = content.trim().match(REGEX);


  const datetime =  match?.[1];
  const dataRaw = match?.[2];


  let data = {};
  if (dataRaw && isJsonString(dataRaw)) {
    data = JSON.parse(dataRaw);
  }

  return {
    ...log,
    createdAt: datetime,
    data,
  };
}

export function initializeLogs(log: LogType) {
  const { content } = log;
  const parts = content.trim().split(REGEX);
  const arr = [];

  let subparts = [];
  parts.forEach((part: string) => {
    const partTrimmed = part.trim();
    if (DATE_REGEX.test(part)) {
      if (subparts.length >= 1) {
        arr.push(subparts.join(' ').trim());
      }
      subparts = [part];
    } else if (subparts.filter(s => s).length <= 1 && partTrimmed) {
      subparts.push(partTrimmed);
    }
  });
  arr.push(subparts.join(' ').trim());

  return arr.map((content2: string) => initializeLog({
    ...log,
    content: content2,
  }));
}

export function formatTimestamp(
  timestamp: number,
  opts?: {
    localTimezone?: boolean;
  },
): string {
  if (!timestamp) {
    return '';
  }

  return opts?.localTimezone
    ? moment.unix(timestamp).local().format()
    : moment.unix(timestamp).utc().format('YYYY-MM-DD HH:mm:ss.SSS');
}
