import { get, set } from './localStorage';

const LOCAL_STORAGE_KEY_PIPELINE_LIST_FILTERS = 'pipeline_list_filters';
const LOCAL_STORAGE_KEY_PIPELINE_LIST_GROUP_BYS = 'pipeline_list_group_bys';
export const LOCAL_STORAGE_KEY_PIPELINE_LIST_SORT_COL_IDX = 'pipeline_list_sort_column_index';
export const LOCAL_STORAGE_KEY_PIPELINE_LIST_SORT_DIRECTION = 'pipeline_list_sort_direction';
export const LOCAL_STORAGE_KEY_PIPELINE_SELECTED_TAB_UUID = 'pipeline_list_selected_tab_uuid';

type FilterType = {
  [filterKey: string]: {
    [value: string]: boolean;
  };
};

type GroupByType = {
  [groupByKey: string]: boolean;
};

export function getFilters() {
  return get(LOCAL_STORAGE_KEY_PIPELINE_LIST_FILTERS, {});
}

export function setFilters(filters: FilterType) {
  set(LOCAL_STORAGE_KEY_PIPELINE_LIST_FILTERS, filters);

  return filters;
}

export function getGroupBys() {
  return get(LOCAL_STORAGE_KEY_PIPELINE_LIST_GROUP_BYS, {});
}

export function setGroupBys(groupBys: GroupByType) {
  set(LOCAL_STORAGE_KEY_PIPELINE_LIST_GROUP_BYS, groupBys);

  return groupBys;
}
