from __future__ import annotations

from typing import Any, List, Optional

from mage_ai.data.constants import InputDataType


class VariableWrapper:
    def __init__(self, variable, input_data_type: InputDataType):
        self.variable = variable
        self.input_data_type = input_data_type


def wrap_input_variables(
    block,
    input_data: List[Any],
    block_uuids: List[str],
    variable_uuids: List[List[str]],
) -> List[Any]:
    return [
        wrap_outputs(outputs, variables, block.input_types(block_uuid))
        for outputs, block_uuid, variables in zip(input_data, block_uuids, variable_uuids)
    ]


def wrap_outputs(
    outputs: Any,
    variable_uuids: List[str],
    input_types: Optional[List[InputDataType]],
) -> Any:
    n_variables = len(variable_uuids)
    n_outputs = len(outputs)

    if n_outputs > n_variables:
        raise Exception(
            f'[WRAP_DATA] Too many outputs for the number of variables: {n_outputs} > '
            f'{n_variables}'
        )

    if not input_types:
        input_types = [InputDataType.DEFAULT]
    if n_outputs < n_outputs:
        input_types += [InputDataType.DEFAULT] * (n_variables - n_outputs)

    return [
        wrap_data(data, input_data_type)
        for data, input_data_type in zip(outputs, input_types[:n_outputs])
    ]


def wrap_data(data: Any, input_data_type: InputDataType) -> Any:
    if InputDataType.GENERATOR == input_data_type:
        pass
    return data
