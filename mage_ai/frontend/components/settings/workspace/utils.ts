import { ICON_SIZE_MEDIUM } from '@oracle/styles/units/icons';
import { LOCAL_STORAGE_KEY_DISPLAY_LOCAL_TIMEZONE } from '@storage/constants';
import { get, set } from '@storage/localStorage';

export const LOCAL_TIMEZONE_TOOLTIP_PROPS = {
  block: true,
  description: 'Display dates in local timezone. Please note that certain pages'
    + ' (e.g. Monitor page) or components (e.g. Pipeline run bar charts) may still'
    + ' be in UTC time. Dates in local time will have a timezone offset in the'
    + ' timestamp (e.g. -07:00).',
  lightBackground: true,
  muted: true,
  size: ICON_SIZE_MEDIUM,
};

export function shouldDisplayLocalTimezone(): boolean {
  const displayLocalTimezone = get(LOCAL_STORAGE_KEY_DISPLAY_LOCAL_TIMEZONE, null);

  return displayLocalTimezone || false;
}

export function storeLocalTimezoneSetting(displayLocalTimezone: boolean): boolean {
  if (typeof displayLocalTimezone !== 'undefined') {
    set(LOCAL_STORAGE_KEY_DISPLAY_LOCAL_TIMEZONE, displayLocalTimezone);
  }

  return displayLocalTimezone;
}
