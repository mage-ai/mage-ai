export enum ActionTypeEnum {
  ADD = 'add',
  AVERAGE = 'average',
  CLEAN_COLUMN_NAME = 'clean_column_name',
  COUNT = 'count',
  COUNT_DISTINCT = 'count_distinct',
  CUSTOM = 'custom',
  DIFF = 'diff',
  DROP_DUPLICATE = 'drop_duplicate',
  EXPAND_COLUMN = 'expand_column',
  EXPLODE = 'explode',
  FILTER = 'filter',
  FIRST = 'first',
  FIX_SYNTAX_ERRORS = 'fix_syntax_errors',
  GROUP = 'group',
  IMPUTE = 'impute',
  JOIN = 'join',
  LAST = 'last',
  LIMIT = 'limit',
  MAX = 'max',
  MEDIAN = 'median',
  MIN = 'min',
  MODE = 'mode',
  NORMALIZE = 'normalize',
  REFORMAT = 'reformat',
  REMOVE = 'remove',
  REMOVE_OUTLIERS = 'remove_outliers',
  SCALE = 'scale',
  SELECT = 'select',
  SHIFT_DOWN = 'shift_down',
  SHIFT_UP = 'shift_up',
  SORT = 'sort',
  STANDARDIZE = 'standardize',
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

export enum ActionVariableTypeEnum {
  FEATURE = 'feature',
}

export interface ActionVariablesType {
  [column: string]: {
    feature: {
      column_type: string;
      uuid: string;
    };
    type: typeof ActionVariableTypeEnum.FEATURE;
  };
}

export interface ActionPayloadOverrideType {
  action_code?: string;
  action_variables?: ActionVariablesType;
}

export default interface ActionPayloadType {
  action_arguments?: any[];
  action_code?: string;
  action_options?: any;
  action_type: ActionTypeEnum;
  action_variables?: ActionVariablesType;
  axis: AxisEnum;
  metadata?: any;
  outputs?: any[];
  priority?: number;
  status?: ActionStatusEnum;
}
