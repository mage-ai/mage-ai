import KernelOutputType from '@interfaces/KernelOutputType';
import { LOCAL_STORAGE_CODE_MATRIX_DATA_OUTPUT } from './constants';
import { get, set } from '@storage/localStorage';

export function getItems(): KernelOutputType[] {
  return get(LOCAL_STORAGE_CODE_MATRIX_DATA_OUTPUT, [])?.filter(item => !!item) as KernelOutputType[];
}

export function setItems(items: KernelOutputType[], replace: boolean = true): KernelOutputType[] {
  let arr = [];
  if (replace) {
    arr = items;
  } else {
    arr = [...getItems(), ...items];
  }

  arr = arr?.filter(i => !!i);
  set(LOCAL_STORAGE_CODE_MATRIX_DATA_OUTPUT, arr);

  return arr;
}
