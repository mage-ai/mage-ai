from typing import Any, Optional

from mage_ai.data.constants import SUPPORTED_VARIABLE_TYPES
from mage_ai.data_preparation.models.utils import infer_variable_type
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.shared.environments import is_debug


def variable_type_supported(
    variable_type: Optional[VariableType] = None, data: Optional[Any] = None
) -> bool:
    from mage_ai.data_preparation.models.utils import is_user_defined_complex

    # Need to import here to mock in tests
    from mage_ai.settings.server import (
        MEMORY_MANAGER_PANDAS_V2,
        MEMORY_MANAGER_POLARS_V2,
        MEMORY_MANAGER_V2,
    )

    if not MEMORY_MANAGER_V2:
        if is_debug():
            print('[WARNING] Memory manager V2 is not enabled.')
        return False

    basic_iterable = False
    if data is not None and variable_type is None:
        variable_type, basic_iterable = infer_variable_type(data)

    if variable_type not in SUPPORTED_VARIABLE_TYPES:
        if is_debug():
            print(f'[WARNING] Variable type {variable_type} is not supported.')
        return False

    if (
        variable_type
        in [
            VariableType.POLARS_DATAFRAME,
            VariableType.SERIES_POLARS,
        ]
        and not MEMORY_MANAGER_POLARS_V2
    ):
        if is_debug():
            print(f'[WARNING] Variable type {variable_type} is not supported.')
        return False

    if (
        variable_type
        in [
            VariableType.DATAFRAME,
            VariableType.SERIES_PANDAS,
        ]
        and not MEMORY_MANAGER_PANDAS_V2
    ):
        if is_debug():
            print(f'[WARNING] Variable type {variable_type} is not supported.')
        return False

    return data is None or basic_iterable or is_user_defined_complex(data)
