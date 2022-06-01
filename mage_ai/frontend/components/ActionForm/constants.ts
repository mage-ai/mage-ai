export const FEATURE_ATTRIBUTE_COLUMN_TYPE = 'column_type';

export const VALUES_TYPE_COLUMNS = 'columns';
export const VALUES_TYPE_USER_INPUT = 'user_input';

export const OPERATOR_CONTAINS = 'contains';
export const OPERATOR_EQUAL = '==';
export const OPERATOR_GREATER_THAN = '>';
export const OPERATOR_GREATER_THAN_OR_EQUAL_TO = '>=';
export const OPERATOR_LESS_THAN = '<';
export const OPERATOR_LESS_THAN_OR_EQUAL = '<=';
export const OPERATOR_NOT_EQUAL = '!=';

export interface ConditionType {
  feature_attribute?: FEATURE_ATTRIBUTE_COLUMN_TYPE;
  operator: (OPERATOR_CONTAINS
    | OPERATOR_EQUAL
    | OPERATOR_GREATER_THAN
    | OPERATOR_GREATER_THAN_OR_EQUAL_TO
    | OPERATOR_LESS_THAN
    | OPERATOR_LESS_THAN_OR_EQUAL
    | OPERATOR_NOT_EQUAL
  );
  options_key?: string;
  value: string;
}

interface ArgumentsType {
  condition?: ConditionType;
  description?: string;
  values: OptionType[] | (VALUES_TYPE_COLUMNS
    | VALUES_TYPE_USER_INPUT
  );
}

interface OptionType {
  condition?: ConditionType;
  description?: string;
  value: string;
}

export interface FormConfigType {
  arguments?: ArgumentsType;
  code?: ArgumentsType;
  description: string;
  multiColumns?: boolean;
  options?: {
    [key: string]: ArgumentsType;
  };
  title: string;
}
