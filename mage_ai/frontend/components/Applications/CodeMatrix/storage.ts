import KernelOutputType from '@interfaces/KernelOutputType';
import { LOCAL_STORAGE_CODE_MATRIX_DATA_OUTPUT } from './constants';
import { dedupe } from '@utils/array';
import { get, set } from '@storage/localStorage';

export function getItems(): KernelOutputType[] {
  return dedupe(
    get(LOCAL_STORAGE_CODE_MATRIX_DATA_OUTPUT, [])?.filter(item => !!item),
    ['msg_id'],
  ) as KernelOutputType[];
}

export function setItems(items: KernelOutputType[], replace: boolean = true): KernelOutputType[] {
  let arr = [];
  if (replace) {
    arr = items;
  } else {
    arr = [...getItems(), ...items];
  }

  arr = dedupe(arr?.filter(i => !!i), ['msg_id']);
  set(LOCAL_STORAGE_CODE_MATRIX_DATA_OUTPUT, arr);

  return arr;
}
