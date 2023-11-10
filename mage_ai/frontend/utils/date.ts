import moment from 'moment';
import tzMoment from 'moment-timezone';
import 'moment-duration-format';

import { pluralize } from '@utils/string';
import { rangeSequential } from '@utils/array';

export enum TimePeriodEnum {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
}

export enum TimeZoneEnum {
  LOCAL = 'LOCAL',
  UTC = 'UTC',
}

export const TIME_PERIOD_DISPLAY_MAPPING = {
  [TimePeriodEnum.TODAY]: 'today',
  [TimePeriodEnum.WEEK]: 'last 7 days',
  [TimePeriodEnum.MONTH]: 'last 30 days',
};

export const TIME_PERIOD_INTERVAL_MAPPING = {
  [TimePeriodEnum.TODAY]: 0,
  [TimePeriodEnum.WEEK]: 6,
  [TimePeriodEnum.MONTH]: 29,
};

export const DATE_FORMAT_LONG = 'YYYY-MM-DD HH:mm:ss';
export const DATE_FORMAT_LONG_MS = 'YYYY-MM-DD HH:mm:ss.SSS';
export const DATE_FORMAT_LONG_NO_SEC = 'YYYY-MM-DD HH:mm';
export const DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET = 'YYYY-MM-DD HH:mmZ';
export const DATE_FORMAT_SHORT = 'YYYY-MM-DD';
export const DATE_FORMAT_SPARK = 'YYYY-MM-DDTHH:mm:ss.SSSGMT';
export const DATE_FORMAT_FULL = 'MMMM D, YYYY';
export const TIME_FORMAT = 'HH:mm:ss';
export const TIME_FORMAT_NO_SEC = 'HH:mm';
export const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const TIME_ZONE_NAMES: {
  [key in TimeZoneEnum]: string
} = {
  [TimeZoneEnum.LOCAL]: LOCAL_TIMEZONE,
  [TimeZoneEnum.UTC]: 'Etc/Universal',
};

export function formatDateShort(momentObj) {
  return momentObj.format(DATE_FORMAT_SHORT);
}

export function dateFormatShort(text) {
  return formatDateShort(moment(text));
}

export function dateFormatLong(
  text: string,
  opts?: {
    dateFormat?: string;
    dayAgo?: boolean;
    includeSeconds?: boolean;
    utcFormat?: boolean;
  },
) {
  const {
    dayAgo,
    includeSeconds,
    utcFormat,
  } = opts || {};
  let momentObj = moment(text);
  let dateFormat = opts?.dateFormat || DATE_FORMAT_LONG_NO_SEC;

  if (utcFormat) {
    momentObj = momentObj.utc();
  }
  if (dayAgo) {
    momentObj = momentObj.subtract(1, 'days');
  }
  if (includeSeconds) {
    dateFormat = DATE_FORMAT_LONG;
  }

  return momentObj.format(dateFormat);
}

export function datetimeInLocalTimezone(
  datetime: string,
  enableLocalTimezoneConversion?: boolean,
): string {
  if (enableLocalTimezoneConversion) {
    return moment
      .utc(datetime)
      .local()
      .format();
  }

  return datetime;
}

/**
 * Given start and end UTC datetime strings, find the time difference between them
 * and return it in the first matching format:
 *   - >= 1 week: > 1 week
     - >= 1 day: d,HH:mm:ss.SS
 *   - < 1 day: HH:mm:ss.SS
 * If `showFullFormat` is true, we'll return it in a specific, human-readable format.
 */
export function timeDifference({
  startDatetime,
  endDatetime,
  showFullFormat = false,
}: {
  startDatetime: string;
  endDatetime: string;
  showFullFormat?: boolean;
}) {
  const start = moment.utc(startDatetime);
  const end = moment.utc(endDatetime);
  const timeDiff = moment.duration(end.diff(start));

  if (showFullFormat) {
    return timeDiff.format('Y __, M __, W __, D __, H __, m __, s __, S __');
  } else if (timeDiff.asWeeks() >= 1) {
    return '> 1 week';
  } else if (timeDiff.asDays() >= 1) {
    return timeDiff.format('d[d],HH:mm:ss.SS', {
      trim: false,
    });
  } else {
    return timeDiff.format('HH:mm:ss.SS', {
      trim: false,
    });
  }
}

/**
 * Given a UTC datetime string, find how much time has elapsed between then
 * and now. Return the elapsed time in the first matching format:
 *   - >= 1 year: X year(s) ago
 *   - >= 1 month: X month(s) ago
 *   - >= 1 day: X day(s) ago
 *   - >= 1 hr: X hr(s) Y min(s) ago
 *   - < 1 hr: X min(s) ago
 */
export function utcStringToElapsedTime(datetime: string) {
  const then = moment.utc(datetime);
  const now = moment.utc();
  const duration = moment.duration(now.diff(then));

  let timeDisplay = '';
  if (duration.years() >= 1) {
    timeDisplay = `${pluralize('year', duration.years(), true)} ago`;
  } else if (duration.months() >= 1) {
    timeDisplay = `${pluralize('month', duration.months(), true)} ago`;
  } else if (duration.days() >= 1) {
    timeDisplay = `${pluralize('day', duration.days(), true)} ago`;
  } else if (duration.hours() >= 1) {
    timeDisplay = `${pluralize('hr', duration.hours(), true)} ` +
      `${pluralize('min', duration.minutes(), true)} ago`;
  } else {
    timeDisplay = `${pluralize('min', duration.minutes(), true)} ago`;
  }

  return timeDisplay;
}

export function utcStringToLocalDate(
  datetime: string,
): Date {
  return moment
    .utc(datetime)
    .local()
    .toDate();
}

export function utcNowDate(opts?: { dateObj?: boolean }): any {
  const utcDate: string = dateFormatLong(
    new Date().toISOString(),
    {
      includeSeconds: true,
      utcFormat: true,
    },
  );

  if (opts?.dateObj) {
    return new Date(utcDate);
  }

  return utcDate;
}

// Return a map of the current time in the different provided timezones
export function currentTimes({
  timeZones,
  includeSeconds = false,
}: {
  timeZones: TimeZoneEnum[];
  includeSeconds?: boolean;
}) {
  const currentMoment = tzMoment.utc();
  const zoneTimes = new Map(
    timeZones.map((timeZone) => {
      let moment = currentMoment;
      switch (timeZone) {
        case TimeZoneEnum.LOCAL:
          moment = currentMoment.local();
        default:
          break;
      }

      return [
        timeZone,
        moment.format(includeSeconds ? TIME_FORMAT : TIME_FORMAT_NO_SEC),
      ];
    }),
  );

  return zoneTimes;
}

export function abbreviatedTimezone(timezone: TimeZoneEnum) {
  return tzMoment.tz(TIME_ZONE_NAMES[timezone]).zoneAbbr();
}

export function dateFromFromUnixTimestamp(timestamp: number) {
  return moment.unix(timestamp);
}

export function dateFormatLongFromUnixTimestamp(text, opts: { withSeconds?: boolean } = {}) {
  return moment.unix(text).format(opts?.withSeconds
    ? DATE_FORMAT_LONG
    : DATE_FORMAT_LONG_NO_SEC,
  );
}

export function isoDateFormatFromDateParts(
  date: Date,
  hour: string | number,
  minute: string | number,
): string {
  return moment(date).utc().hours(+hour).minutes(+minute).format();
}

export function unixTimestampFromDate(date: string) {
  return moment(date).unix();
}

export function utcDateFromDateAndTime(
  date: Date,
  hour: string,
  minute: string,
  second?: string,
): string {
  const utcDateNoSeconds = `${date.toISOString().split('T')[0]} ${hour}:${minute}`;

  return second ? `${utcDateNoSeconds}:${second}` : utcDateNoSeconds;
}

export function getDatePartsFromUnixTimestamp(
  timestamp: string | number,
): {
  date: Date,
  hour: string,
  minute: string,
} {
  const dateMoment = moment.unix(+timestamp).utc();

  return {
    date: dateMoment.toDate(),
    hour: String(dateMoment.hour()),
    minute: String(dateMoment.minute()),
  };
}

export function getFullDateRangeString(
  daysAgo: number,
  options?: {
    endDateOnly?: boolean;
    localTime?: boolean;
  },
) {
  let dateMomentStart = moment.utc();
  let dateMomentEnd = moment.utc();

  if (options?.localTime) {
    dateMomentStart = moment().local();
    dateMomentEnd = moment().local();
  }

  dateMomentStart = dateMomentStart.subtract(daysAgo, 'days');
  const dateStartString = dateMomentStart.format(DATE_FORMAT_FULL);
  const dateEndString = dateMomentEnd.format(DATE_FORMAT_FULL);

  return options?.endDateOnly
    ? dateEndString
    : `${dateStartString} - ${dateEndString}`;
}

export function getStartDateStringFromPeriod(
  period: TimePeriodEnum | string,
  options?: {
    isoString?: boolean;
    localTime?: boolean;
  },
): string {
  let dateMoment = options?.localTime ? moment().local() : moment.utc();
  if (period === TimePeriodEnum.WEEK) {
    const weekDaysAgo = TIME_PERIOD_INTERVAL_MAPPING[TimePeriodEnum.WEEK];
    dateMoment = dateMoment.subtract(weekDaysAgo, 'days');
  } else if (period === TimePeriodEnum.MONTH) {
    const monthDaysAgo = TIME_PERIOD_INTERVAL_MAPPING[TimePeriodEnum.MONTH];
    dateMoment = dateMoment.subtract(monthDaysAgo, 'days');
  }

  return options?.isoString
    ? dateMoment.startOf('day').toISOString()
    : dateMoment.startOf('day').format(DATE_FORMAT_LONG);
}

export function getDateRange(
  daysInterval: number = 90,
): string[] {
  const date = new Date();
  const dateRange = [];
  for (let i = 0; i < daysInterval; i++) {
    dateRange.unshift(date.toISOString().split('T')[0]);
    date.setDate(date.getDate() - 1);
  }

  return dateRange;
}

export function getDayRangeForCurrentMonth() {
  const currentDate = new Date();
  const monthNumber = String(currentDate.getMonth() + 1).padStart(2, '0');
  const year = currentDate.getFullYear();
  const daysInMonth = moment(`${year}-${monthNumber}`, 'YYYY-MM').daysInMonth();

  return rangeSequential(daysInMonth, 1);
}

export function padTime(time: string) {
  return time.padStart(2, '0');
}
