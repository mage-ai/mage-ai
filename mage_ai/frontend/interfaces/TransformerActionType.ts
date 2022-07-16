import SuggestionType from './SuggestionType';
import { ActionTypeEnum, AxisEnum } from './ActionPayloadType';

export default interface TransformerActionType extends SuggestionType {
  id?: number;
}

export const COLUMN_ACTIONS: ActionTypeEnum[] = [
  ActionTypeEnum.ADD,
  ActionTypeEnum.AVERAGE,
  ActionTypeEnum.CLEAN_COLUMN_NAME,
  ActionTypeEnum.COUNT,
  ActionTypeEnum.COUNT_DISTINCT,
  ActionTypeEnum.CUSTOM,
  ActionTypeEnum.DIFF,
  ActionTypeEnum.FIRST,
  ActionTypeEnum.FIX_SYNTAX_ERRORS,
  ActionTypeEnum.IMPUTE,
  ActionTypeEnum.LAST,
  ActionTypeEnum.MAX,
  ActionTypeEnum.MEDIAN,
  ActionTypeEnum.MIN,
  ActionTypeEnum.REFORMAT,
  ActionTypeEnum.REMOVE,
  ActionTypeEnum.REMOVE_OUTLIERS,
  ActionTypeEnum.SELECT,
  ActionTypeEnum.SHIFT_DOWN,
  ActionTypeEnum.SHIFT_UP,
  ActionTypeEnum.SUM,
];

export const ROW_ACTIONS: ActionTypeEnum[] = [
  ActionTypeEnum.CUSTOM,
  ActionTypeEnum.DROP_DUPLICATE,
  ActionTypeEnum.FILTER,
  ActionTypeEnum.SORT,
  ActionTypeEnum.REMOVE,
];

export const ACTION_TYPE_HUMAN_READABLE_MAPPING = {
  [AxisEnum.COLUMN]: {
    [ActionTypeEnum.ADD]: 'Add column',
    [ActionTypeEnum.AVERAGE]: 'Aggregate by average value',
    [ActionTypeEnum.CLEAN_COLUMN_NAME]: 'Clean column name',
    [ActionTypeEnum.COUNT_DISTINCT]: 'Aggregate by distinct count',
    [ActionTypeEnum.COUNT]: 'Aggregate by total count',
    [ActionTypeEnum.CUSTOM]: 'Custom column action',
    [ActionTypeEnum.DIFF]: 'Difference',
    [ActionTypeEnum.FIRST]: 'Aggregate by first value',
    [ActionTypeEnum.FIX_SYNTAX_ERRORS]: 'Fix syntax errors',
    [ActionTypeEnum.IMPUTE]: 'Impute',
    [ActionTypeEnum.LAST]: 'Aggregate by last value',
    [ActionTypeEnum.MAX]: 'Aggregate by maximum value',
    [ActionTypeEnum.MEDIAN]: 'Aggregate by median value',
    [ActionTypeEnum.MIN]: 'Aggregate by mininum value',
    [ActionTypeEnum.REFORMAT]: 'Reformat',
    [ActionTypeEnum.REMOVE_OUTLIERS]: 'Remove outliers',
    [ActionTypeEnum.REMOVE]: 'Remove column(s)',
    [ActionTypeEnum.SELECT]: 'Keep columns',
    [ActionTypeEnum.SHIFT_DOWN]: 'Shift rows down in a column',
    [ActionTypeEnum.SHIFT_UP]: 'Shift rows up in a column',
    [ActionTypeEnum.SUM]: 'Aggregate by sum of values',
  },
  [AxisEnum.ROW]: {
    [ActionTypeEnum.CUSTOM]: 'Custom row action',
    [ActionTypeEnum.DROP_DUPLICATE]: 'Drop duplicates',
    [ActionTypeEnum.FILTER]: 'Filter',
    [ActionTypeEnum.SORT]: 'Sort',
    [ActionTypeEnum.REMOVE]: 'Remove rows',
  },
};
