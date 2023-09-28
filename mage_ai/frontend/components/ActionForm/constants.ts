export const FEATURE_ATTRIBUTE_COLUMN_TYPE = 'columnType';

export const VALUES_TYPE_COLUMNS = 'columns';
export const VALUES_TYPE_USER_INPUT = 'user_input';

export const OPERATOR_CONTAINS = 'contains';
export const OPERATOR_EQUAL = '==';
export const OPERATOR_GREATER_THAN = '>';
export const OPERATOR_GREATER_THAN_OR_EQUAL_TO = '>=';
export const OPERATOR_LESS_THAN = '<';
export const OPERATOR_LESS_THAN_OR_EQUAL = '<=';
export const OPERATOR_NOT_EQUAL = '!=';

export const CODE_EXAMPLE = '@transformer_action\n\
def transform(df):\n\
\t# Your code here ... \n\
\treturn df';

export interface ConditionType {
  feature_attribute?: typeof FEATURE_ATTRIBUTE_COLUMN_TYPE;
  operator: (typeof OPERATOR_CONTAINS
    | typeof OPERATOR_EQUAL
    | typeof OPERATOR_GREATER_THAN
    | typeof OPERATOR_GREATER_THAN_OR_EQUAL_TO
    | typeof OPERATOR_LESS_THAN
    | typeof OPERATOR_LESS_THAN_OR_EQUAL
    | typeof OPERATOR_NOT_EQUAL
  );
  options_key?: string;
  value: string | number | string[] | number[];
}

interface ArgumentsType {
  condition?: ConditionType;
  description?: string;
  values: OptionType[] | (typeof VALUES_TYPE_COLUMNS
    | typeof VALUES_TYPE_USER_INPUT
  );
}

interface OptionType {
  condition?: ConditionType;
  description?: string;
  value: string;
}

interface CodeType {
  default?: string;
  multiline?: boolean;
  value?: string;
  values?: typeof VALUES_TYPE_USER_INPUT
}

export interface FormConfigType {
  arguments?: ArgumentsType;
  code?: CodeType;
  description?: string;
  multiColumns?: boolean;
  options?: {
    [key: string]: ArgumentsType;
  };
  title: string;
}
