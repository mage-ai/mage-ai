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
  defaultValue = {},
}: {
  actionType: ActionTypeEnum;
  defaultValue?: any;
}) {
  return get(LOCAL_STORAGE_KEY_CUSTOM_CODE, defaultValue)[actionType];
}

export function setCustomCodeState({
  actionType,
  newValue,
}: {
  actionType: ActionTypeEnum;
  newValue: string;
}) {
  set(LOCAL_STORAGE_KEY_CUSTOM_CODE, {
    ...get(LOCAL_STORAGE_KEY_CUSTOM_CODE),
    [actionType]: newValue,
  });
}

export default {
  get,
  set,
};
