import moment from 'moment';

export enum TimePeriodEnum {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
}

export const DATE_FORMAT_LONG = 'YYYY-MM-DD HH:mm:ss';
export const DATE_FORMAT_LONG_NO_SEC = 'YYYY-MM-DD HH:mm';
export const DATE_FORMAT_SHORT = 'YYYY-MM-DD';
export const DATE_FORMAT_FULL = 'MMMM D, YYYY';

export function formatDateShort(momentObj) {
  return momentObj.format(DATE_FORMAT_SHORT);
}

export function dateFormatShort(text) {
  return formatDateShort(moment(text));
}

export function dateFormatLong(
  text: string,
  opts?: {
    dayAgo?: boolean;
    includeSeconds?: boolean;
    utcFormat?: boolean;
  },
) {
  const {
    dayAgo,
    includeSeconds,
    utcFormat,
  } = opts;
  let momentObj = moment(text);
  let dateFormat = DATE_FORMAT_LONG_NO_SEC;

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
    dateMoment = dateMoment.subtract(7, 'days');
  } else if (period === TimePeriodEnum.MONTH) {
    dateMoment = dateMoment.subtract(1, 'months');
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

export function padTime(time: string) {
  return time.padStart(2, '0');
}
