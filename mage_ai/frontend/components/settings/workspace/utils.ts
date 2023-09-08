import { LOCAL_STORAGE_KEY_DISPLAY_LOCAL_TIMEZONE } from '@storage/constants';
import { get, set } from '@storage/localStorage';

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
