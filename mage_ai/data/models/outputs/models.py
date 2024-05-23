from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from mage_ai.data.constants import InputDataType
from mage_ai.data.models.generator import DataGenerator
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.shared.models import BaseDataClass


@dataclass
class OutputDisplay(BaseDataClass):
    pass


class BaseOutput:
    def __init__(self, variable: Variable, data: Optional[Any] = None):
        self.data = data
        self.variable = variable

    def render(
        self,
        csv_lines_only: Optional[bool] = None,
        from_notebook: Optional[bool] = None,
        global_vars: Optional[Dict] = None,
        include_print_outputs: Optional[bool] = None,
        index: Optional[int] = None,
        input_args: Optional[List[Any]] = None,
        input_data_types: Optional[List[InputDataType]] = None,
        metadata: Optional[Dict] = None,
        sample_data: Optional[bool] = None,
        take: Optional[int] = None,
        variable_type: Optional[VariableType] = None,
    ) -> Any:
        return {}


class BlockOutput(BaseOutput):
    def __init__(self, block: Any, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.block = block


class OutputManager(DataGenerator):
    def present(
        self,
        csv_lines_only: Optional[bool] = None,
        from_notebook: Optional[bool] = None,
        global_vars: Optional[Dict] = None,
        include_print_outputs: Optional[bool] = None,
        index: Optional[int] = None,
        input_args: Optional[List[Any]] = None,
        input_data_types: Optional[List[InputDataType]] = None,
        metadata: Optional[Dict] = None,
        sample_data: Optional[bool] = None,
        take: Optional[int] = None,
        variable_type: Optional[VariableType] = None,
    ) -> List[Any]:
        return []

    async def present_async(
        self,
        csv_lines_only: Optional[bool] = None,
        from_notebook: Optional[bool] = None,
        global_vars: Optional[Dict] = None,
        include_print_outputs: Optional[bool] = None,
        index: Optional[int] = None,
        input_args: Optional[List[Any]] = None,
        input_data_types: Optional[List[InputDataType]] = None,
        metadata: Optional[Dict] = None,
        sample_data: Optional[bool] = None,
        take: Optional[int] = None,
        variable_type: Optional[VariableType] = None,
    ) -> List[Any]:
        return []
