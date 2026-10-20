import re
from typing import Any, List, Optional, Tuple, Union

from mage_ai.data_preparation.models.interfaces import VariableInterface
from mage_ai.shared.array import find
from mage_ai.shared.strings import to_ordinal_integers


def __sort(text) -> Tuple[int, int]:
    number = re.findall('\\d+', text)
    if number:
        if len(number) == 1:
            number.append(0)
        number = number[:2]
    else:
        number = to_ordinal_integers(text)

    number = [int(i) for i in number][:2]
    return tuple(number)


def __sort_object(variable: VariableInterface) -> Tuple[int, int]:
    return __sort(variable.uuid)


def sort_variable_uuids(variable_uuids: List[str]) -> List[str]:
    return sorted(variable_uuids, key=__sort)


def sort_variables(variables: List[VariableInterface]) -> List[VariableInterface]:
    return sorted(variables, key=__sort_object)


def is_output_variable(variable_uuid: str, include_df: bool = True) -> bool:
    """
    Checks if the given variable UUID represents an output variable.

    `df` variable is only used to save the sample Spark dataframe now.

    Args:
        variable_uuid (str): The UUID of the variable.
        include_df (bool): Whether to include the `df` variable. Only set it to True
            when saving or fetching sample Spark dataframe.

    Returns:
        bool: True if the variable is an output variable, False otherwise.

    """
    return (include_df and variable_uuid == 'df') or variable_uuid.startswith('output')


def variable_priority(variable_uuid: str) -> Optional[int]:
    number = re.findall('\\d+', variable_uuid)[:1]
    if number:
        number = number[0]
        if number.isdigit():
            return int(number)


def get_first_data_output_variable(
    variables: List[Union[VariableInterface, Any]],
) -> Optional[Union[VariableInterface, Any]]:
    return find(
        lambda variable: is_output_variable(variable.uuid)
        and variable_priority(variable.uuid) == 0,
        sort_variables(variables),
    )


def get_first_data_output_variable_uuid(
    variables: List[str],
) -> Optional[str]:
    return find(
        lambda variable_uuid: is_output_variable(variable_uuid)
        and variable_priority(variable_uuid) == 0,
        sort_variable_uuids(variables),
    )
