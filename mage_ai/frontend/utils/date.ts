import moment from 'moment';

export const DATE_FORMAT_LONG = 'YYYY-MM-DD HH:mm:ss';
export const DATE_FORMAT_LONG_NO_SEC = 'YYYY-MM-DD HH:mm';
export const DATE_FORMAT_SHORT = 'YYYY-MM-DD';

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
): string {
  return `${date.toISOString().split('T')[0]} ${hour}:${minute}`;
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

export function padTime(time: string) {
  return time.padStart(2, '0');
}
