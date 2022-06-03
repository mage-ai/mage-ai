export enum ActionTypeEnum {
  ADD = 'add',
  AVERAGE = 'average',
  CLEAN_COLUMN_NAME = 'clean_column_name',
  COUNT = 'count',
  COUNT_DISTINCT = 'count_distinct',
  DIFF = 'diff',
  DROP_DUPLICATE = 'drop_duplicate',
  EXPAND_COLUMN = 'expand_column',
  EXPLODE = 'explode',
  FILTER = 'filter',
  FIRST = 'first',
  GROUP = 'group',
  IMPUTE = 'impute',
  JOIN = 'join',
  LAST = 'last',
  LIMIT = 'limit',
  MAX = 'max',
  MEDIAN = 'median',
  MIN = 'min',
  MODE = 'mode',
  REFORMAT = 'reformat',
  REMOVE = 'remove',
  SCALE = 'scale',
  SELECT = 'select',
  SHIFT_DOWN = 'shift_down',
  SHIFT_UP = 'shift_up',
  SORT = 'sort',
  SUM = 'sum',
  UNION = 'union',
  UPDATE_TYPE = 'update_type',
  UPDATE_VALUE = 'update_value',
}

export enum AxisEnum {
  COLUMN = 'column',
  ROW = 'row',
}

export enum ActionStatusEnum {
  NOT_APPLIED = 'not_applied',
  COMPLETED = 'completed',
}

export default interface ActionPayloadType {
  action_arguments?: any[];
  action_code?: string;
  action_options?: any;
  action_type: ActionTypeEnum;
  action_variables?: any;
  axis: AxisEnum;
  metadata?: any;
  outputs?: any[];
  priority?: number;
  status?: ActionStatusEnum;
}
