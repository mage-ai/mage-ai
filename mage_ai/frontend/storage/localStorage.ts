import ls from 'local-storage';

import { ActionTypeEnum } from '@interfaces/ActionPayloadType';

export const LOCAL_STORAGE_KEY_CUSTOM_CODE = 'custom_code';
const LOCAL_STORAGE_KEY_OBJECT_COUNTS = 'object_counts';

function getCustomCodeKey(featureSetId: string) {
  return `${LOCAL_STORAGE_KEY_CUSTOM_CODE}_${featureSetId}`;
}

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
  featureSetId,
  defaultValue = {},
}: {
  actionType: ActionTypeEnum;
  featureSetId: string
  defaultValue?: any;
}) {
  const key = getCustomCodeKey(featureSetId);
  return get(key, defaultValue)[actionType];
}

export function setCustomCodeState({
  actionType,
  featureSetId,
  newValue,
}: {
  actionType: ActionTypeEnum;
  featureSetId: string
  newValue: string;
}) {
  const key = getCustomCodeKey(featureSetId);
  set(key, {
    ...get(key),
    [actionType]: newValue,
  });
}

export default {
  get,
  set,
};

export function resetObjectCounts() {
  return set(LOCAL_STORAGE_KEY_OBJECT_COUNTS, {});
}
