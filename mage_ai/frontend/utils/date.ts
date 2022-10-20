import moment from 'moment';

export const DATE_FORMAT_LONG = 'YYYY-MM-DD HH:mm:SS';
export const DATE_FORMAT_SHORT = 'YYYY-MM-DD';

export function formatDateShort(momentObj) {
  return momentObj.format(DATE_FORMAT_SHORT);
}

export function dateFormatShort(text) {
  return formatDateShort(moment(text));
}

export function dateFormatLong(text) {
  return moment(text).format('YYYY-MM-DD HH:mm');
}

export function dateFormatLongFromUnixTimestamp(text) {
  return moment.unix(text).format('YYYY-MM-DD HH:mm');
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
