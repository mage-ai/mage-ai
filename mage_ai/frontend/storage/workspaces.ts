import { get, set } from './localStorage';

const LOCAL_STORAGE_KEY_WORKSPACE_LIST_FILTERS = 'workspace_list_filters';

type FilterType = {
  [filterKey: string]: {
    [value: string]: boolean;
  };
};

export function getFilters() {
  return get(LOCAL_STORAGE_KEY_WORKSPACE_LIST_FILTERS, {});
}

export function setFilters(filters: FilterType) {
  set(LOCAL_STORAGE_KEY_WORKSPACE_LIST_FILTERS, filters);

  return filters;
}
