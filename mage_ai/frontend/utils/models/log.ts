import moment from 'moment';

import LogType, { LogDataType } from '@interfaces/LogType';
import { isJsonString } from '@utils/string';

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
    if (part === '\n') {
      if (subparts.length >= 1) {
        arr.push(subparts.join(' ').trim());
      }
      subparts = [];
    } else if (subparts.filter(s => s).length <= 1) {
      subparts.push(part.trim());
    }
  });
  arr.push(subparts.join(' ').trim());

  return arr.map((content2: string) => initializeLog({
    ...log,
    content: content2,
  }));
}

export function formatTimestamp(timestamp: number) {
  return timestamp && moment.unix(timestamp).utc().format('YYYY-MM-DD HH:mm:ss');
}
