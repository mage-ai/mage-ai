from keyword import iskeyword
from mage_ai.data_cleaner.column_types.column_type_detector import REGEX_NUMBER, infer_column_types
from mage_ai.data_cleaner.column_types.constants import ColumnType
from mage_ai.data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis,
    NameConventionPatterns,
)
from pandas import DataFrame
from typing import Dict, List, Union
import logging

logger = logging.getLogger(__name__)


def build_action_variables(
    df: DataFrame, ctypes: Dict[str, ColumnType] = None, columns: List[str] = None
) -> Dict:
    """
    Builds action variable set from data frame for use with transformer actions library.

    Args:
        df (DataFrame): Data frame to build transformer actions for.
        ctypes (Dict[str, ColumnType], optional): Column type for each column in data frame.
        Defaults to None, in which case the column types will be automatically inferred.
        columns (List[str], options): Columns to generate action variables for. Defaults to None,
        in which case action variables are generated for all columns of the data frame.
    Returns:
        Dict: Set of action variables.
    """
    if ctypes is None:
        ctypes = {}
    if columns is None:
        columns = df.columns
    ctypes = infer_column_types(df, column_types=ctypes)
    variable_set = {}
    for column_name in columns:
        variable_set[column_name] = {
            'feature': {
                'column_type': ctypes[column_name],
                'uuid': column_name,
            },
            'type': 'feature',
        }
    return variable_set


def build_transformer_action(
    df: DataFrame,
    action_type: Union[ActionType, str],
    arguments: List[str] = [],
    action_code: str = '',
    options: Dict = {},
    axis: Union[Axis, str] = Axis.COLUMN,
    outputs: List[Dict] = [],
) -> Dict:
    """
    Builds transformer action payload from arguments. The output of this function can be passed
    as input to the `transformer_actions.base.BaseAction` to perform the requested transformation.

    Designed as a helper method to simplify generating transformer action payloads

    Args:
        df (DataFrame): The data frame to build a transformer action payload for.
        action_type (Union[ActionType, str]): Transformer action to perform.
        arguments (List[str], optional): Columns/Rows to perform this action on.
        Defaults to [].
        action_code (str, optional): Special code or query to execute with action. Defaults to ''.
        options (Dict, optional): Options specifying behavior of action. Defaults to {}.
        axis (Union[Axis, str], optional): Axis of the data frame to apply the action to.
        Defaults to Axis.COLUMN.
        outputs (List[Dict], optional): Specifies metadata of newly created columns.
        Defaults to [].

    Returns:
        Dict: Transformer action payload
    """
    action_variables = build_action_variables(df)
    return dict(
        action_type=action_type,
        action_arguments=list(arguments),
        action_code=action_code,
        action_options=options,
        action_variables=action_variables,
        axis=axis,
        outputs=outputs,
    )


def clean_column_name(name):
    if iskeyword(name):
        name = f'{name}_'
    name = name.strip(' \'\"_-')
    name = NameConventionPatterns.CONNECTORS.sub('_', name)
    name = NameConventionPatterns.NON_ALNUM.sub('', name)
    name = REGEX_NUMBER.sub(lambda number: f'number_{number.group(0)}', name)
    if iskeyword(name):
        name = f'{name}_'
    uppercase_group = NameConventionPatterns.UPPERCASE.match(name)
    pascal_group = NameConventionPatterns.PASCAL.match(name)
    camel_group = NameConventionPatterns.CAMEL.match(name)
    if uppercase_group:
        name = name.lower()
    elif pascal_group:
        components = NameConventionPatterns.PASCAL_COMPONENT.findall(name)
        name = '_'.join(components)
    elif camel_group:
        components = NameConventionPatterns.CAMEL_COMPONENT.findall(name)
        components += NameConventionPatterns.PASCAL_COMPONENT.findall(name)
        name = '_'.join(components)
    return name.lower()


def columns_to_remove(transformer_actions):
    arr = filter(
        lambda x: x['action_type'] == ActionType.REMOVE and x['axis'] == Axis.COLUMN,
        transformer_actions,
    )

    columns = []
    for transformer_action in arr:
        columns += transformer_action['action_arguments']

    return columns


def generate_action_titles(transformer_actions):
    for a in transformer_actions:
        if not a.get('title'):
            a['title'] = generate_action_title(a)
    return transformer_actions


def generate_action_title(action):
    payload = action['action_payload']
    action_type = payload['action_type']
    title = ''
    if action_type == ActionType.REMOVE:
        title = 'Remove columns'
    elif action_type == ActionType.FILTER:
        title = 'Filter rows'
    elif action_type == ActionType.DROP_DUPLICATE:
        title = 'Drop duplicate rows'
    elif action_type == ActionType.REFORMAT:
        title = 'Reformat values'
    elif action_type == ActionType.IMPUTE:
        title = 'Fill in missing values'
    elif action_type == ActionType.CLEAN_COLUMN_NAME:
        title = 'Clean dirty column names'
    return title


def generate_string_cols(df, columns):
    for column in columns:
        clean_col = df[column]
        dropped = clean_col.dropna(axis=0)
        exact_dtype = type(dropped.iloc[0]) if len(dropped) > 0 else None
        if exact_dtype is str:
            yield column
        else:
            logger.warn(
                f'Attempted to perform string-only action on non-string column \'{column}\''
            )
