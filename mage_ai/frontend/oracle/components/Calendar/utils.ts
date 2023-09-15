import { TimeType } from './index';
import { getTimeInUTC } from '@components/Triggers/utils';
import { padTime, utcStringToLocalDate } from '@utils/date';

export function getDateAndTimeObjFromDatetimeString(
  datetime: string,
  opts?: { localTimezone: boolean },
): {
  date: Date;
  time: TimeType;
} {
  let dateObj;
  let timeObj;

  if (opts?.localTimezone) {
    dateObj = utcStringToLocalDate(datetime);
    timeObj = {
      hour: padTime(String(dateObj.getHours())),
      minute: padTime(String(dateObj.getMinutes())),
    };
  } else {
    // UTC string with "YYYY-MM-DD HH:MM:SS" format
    const dateTimeSplit = datetime.split(' ');
    const timePart = dateTimeSplit[1];
    dateObj = getTimeInUTC(datetime);
    timeObj = {
      hour: timePart.substring(0, 2),
      minute: timePart.substring(3, 5),
    };
  }

  return {
    date: dateObj,
    time: timeObj,
  };
}
