from mage_ai.data_cleaner.transformer_actions.constants import Operator
import re


ACTION_CODE_CONDITION_PATTERN = re.compile(
    r'([^\s()]+) ([!=<>]+|(?:contains)|(?:not contains)) ([^\s()]+)'
)
ORIGINAL_COLUMN_PREFIX = 'orig_'
TRANSFORMED_COLUMN_PREFIX = 'tf_'


def __query_mutate_null_type(match, dtype):
    condition = ['']
    column_name, operator, _ = match.groups()
    column_name = f'{ORIGINAL_COLUMN_PREFIX}{column_name}'
    if operator == '==':
        condition.append(f'({column_name}.isna()')
        if dtype == bool:
            condition.append(f' | {column_name} == \'\'')
        elif dtype == str:
            condition.append(f' | {column_name}.str.len() == 0')
        condition.append(f')')
    else:
        condition.append(f'({column_name}.notna()')
        if dtype == bool:
            condition.append(f' & {column_name} != \'\'')
        elif dtype == str:
            condition.append(f' & {column_name}.str.len() >= 1')
        condition.append(f')')
    return ''.join(condition)


def __query_mutate_contains_op(match):
    column_name, operator, value = match.groups()
    column_name = f'{TRANSFORMED_COLUMN_PREFIX}{column_name}'
    value = value.strip('\'').strip('\"')
    if operator == Operator.CONTAINS:
        condition = f'({column_name}.notna() & {column_name}.str.contains(\'{value}\'))'
    else:
        condition = f'~({column_name}.notna() & {column_name}.str.contains(\'{value}\'))'
    return condition


def __query_mutate_default_case(match, column_set):
    column_name, operator, value = match.groups()
    column_name = f'{TRANSFORMED_COLUMN_PREFIX}{column_name}'
    if value in column_set:
        # if comparison is with another column, prefix value with column identifier
        value = f'{TRANSFORMED_COLUMN_PREFIX}{value}'
    return f'{column_name} {operator} {value}'


def __get_column_type(df, cache, column_name):
    dtype = cache.get(column_name, None)
    if dtype is None:
        dropped_na = df[column_name].dropna()
        dropped_na = dropped_na[~dropped_na.isin([''])]
        dtype = type(dropped_na.iloc[0]) if len(dropped_na.index) >= 1 else object
        cache[column_name] = dtype
    return dtype


def query_with_action_code(df, action_code, kwargs):
    transformed_types, original_types = {}, {}
    original_df, original_merged = kwargs.get('original_df', None), False
    reconstructed_code = []   
    queried_df = df.copy().add_prefix(TRANSFORMED_COLUMN_PREFIX)
    column_set = set(df.columns)

    prev_end = 0
    for match in ACTION_CODE_CONDITION_PATTERN.finditer(action_code):
        column_name, operator, value = match.groups()
        reconstructed_code.append(action_code[prev_end: match.start()])
        prev_end = match.end()
        if operator == Operator.CONTAINS or operator == Operator.NOT_CONTAINS:
            transformed_dtype = __get_column_type(df, transformed_types, column_name)
            if transformed_dtype != str:
                raise TypeError(
                    f'\'{operator}\' can only be used on string columns, {transformed_dtype}'
                )
            reconstructed_code.append(__query_mutate_contains_op(match))
        elif (operator == Operator.EQUALS or operator == Operator.NOT_EQUALS) and value == 'null':
            if original_df is None:
                raise Exception(
                    'Null value queries require original dataframe as keyword argument'
                )
            elif not original_merged:
                queried_df = queried_df.join(original_df.add_prefix(ORIGINAL_COLUMN_PREFIX))
                original_merged = True
            original_dtype = __get_column_type(original_df, original_types, column_name)
            reconstructed_code.append(__query_mutate_null_type(match, original_dtype))
        else:
            reconstructed_code.append(__query_mutate_default_case(match, column_set))
    reconstructed_code.append(action_code[prev_end:])

    action_code = ''.join(reconstructed_code)
    queried_df = queried_df.query(action_code).rename(
        lambda x: x[len(TRANSFORMED_COLUMN_PREFIX):], 
        axis='columns'
    )
    return queried_df[df.columns]
