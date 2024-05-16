import ls from 'local-storage';

import { ActionTypeEnum } from '@interfaces/ActionPayloadType';

export const LOCAL_STORAGE_KEY_CUSTOM_CODE = 'custom_code';
export const LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN = 'pipeline_editor_after_hidden';
export const LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_WIDTH = 'pipeline_editor_after_width';
export const LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN = 'pipeline_editor_before_hidden';
export const LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_WIDTH = 'pipeline_editor_before_width';
export const LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN = 'pipeline_execution_hidden';
export const LOCAL_STORAGE_KEY_DATA_OUTPUT_BLOCK_UUIDS = 'data_output_block_uuids';
const LOCAL_STORAGE_KEY_OBJECT_COUNTS = 'object_counts';
export const LOCAL_STORAGE_KEY_HIDE_KERNEL_WARNING = 'hide_kernel_warning';
export const LOCAL_STORAGE_KEY_OAUTH_STATE = 'oauth_state';
export const LOCAL_STORAGE_KEY_FOLDERS_STATE = 'folders_state';
export const LOCAL_STORAGE_KEY_GENERATE_CODE_HISTORY = 'generate_code_history';
export const LOCAL_STORAGE_KEY_MULTI_COLUMN_WIDTHS_PREFIX = 'multi_column_widths';
export const LOCAL_STORAGE_KEY_OVERVIEW_TAB_SELECTED = 'overview_tab_selected_recently';

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

  if (!!value && (typeof cached === 'undefined' || cached === null)) {
    set(key, value);
  } else {
    return cached;
  }

  return value;
}

// Has to be an object
export function getSetUpdate(key, value) {
  const combined = {
    ...(get(key) || {}),
    ...value,
  };

  set(key, combined);

  return combined;
}

export function remove(key) {
  const val = get(key);
  // @ts-ignore
  ls.remove(key);

  return val;
}

export function getCustomCodeState({
  actionType,
  featureSetId,
  defaultValue = {},
}: {
  actionType: ActionTypeEnum;
  featureSetId: string;
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
  featureSetId: string;
  newValue: string;
}) {
  const key = getCustomCodeKey(featureSetId);
  set(key, {
    ...get(key),
    [actionType]: newValue,
  });
}

export function setLocalStorageValue(
  storageKey: string,
  value: boolean | string | number,
): boolean | string | number {
  if (typeof value !== 'undefined') {
    set(storageKey, value);
  }

  return value;
}

export function resetObjectCounts() {
  return set(LOCAL_STORAGE_KEY_OBJECT_COUNTS, {});
}

const localStorage = {
  get,
  remove,
  set,
};

export default localStorage;
