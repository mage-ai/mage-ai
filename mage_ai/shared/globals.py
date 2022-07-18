from mage_ai.data_preparation.models.constants import BlockType
from keyword import kwlist
from typing import Any, Mapping


RESERVED_VARIABLE_NAMES = frozenset(
    [BlockType.DATA_LOADER, BlockType.TRANSFORMER, BlockType.DATA_EXPORTER, *kwlist]
)


def validate_global_names(global_vars: Mapping[str, Any]) -> str:
    """
    Validates whether the names of global variables are valid names.

    Args:
        global_vars (Mapping[str, Any]): Global variables to inject into runtime

    Raises: ValueError - Raised if validation fails
    - Variable name is reserved
    - Variable is already defined in globals
    """
    for variable in global_vars:
        if variable in RESERVED_VARIABLE_NAMES:
            raise ValueError(f'\'{variable}\' is a reserved name')
        elif variable in globals().keys():
            raise ValueError(f'\'{variable}\' is already defined, choose a different name')
