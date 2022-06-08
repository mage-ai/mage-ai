import ls from 'local-storage';

import { ActionTypeEnum } from '@interfaces/ActionPayloadType';

export const LOCAL_STORAGE_KEY_CUSTOM_CODE = 'custom_code';

export function set(key, value) {
  // @ts-ignore
  ls.set(key, value);

  return value;
}

export function get(key, value = null) {
  // @ts-ignore
  const cached = ls.get(key);

  if (typeof cached === 'undefined' || cached === null) {
    set(key, value);
  } else {
    return cached;
  }

  return value;
}

export function getCustomCodeState({
  actionType,
  defaultValue = '',
}: {
  actionType: ActionTypeEnum;
  defaultValue?: string;
}) {
  if (actionType === ActionTypeEnum.CUSTOM) {
    return get(LOCAL_STORAGE_KEY_CUSTOM_CODE, defaultValue);
  }

  return defaultValue;
}

export function setCustomCodeState(value) {
  return set(LOCAL_STORAGE_KEY_CUSTOM_CODE, value);
}

export default {
  get,
  set,
};
