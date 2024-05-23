from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from mage_ai.data.constants import InputDataType
from mage_ai.data.models.generator import DataGenerator
from mage_ai.data.models.outputs.presenters import (
    present_block_outputs,
    present_dynamic_block_outputs,
)
from mage_ai.data_preparation.models.interfaces import BlockInterface
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


class BlockOutput(BaseOutput):
    def __init__(self, block: BlockInterface, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.block = block

    def render(
        self,
        csv_lines_only: Optional[bool] = None,
        from_notebook: Optional[bool] = None,
        global_vars: Optional[Dict] = None,
        include_print_outputs: Optional[bool] = None,
        index: Optional[int] = None,
        input_args: Optional[List[Any]] = None,
        input_data_types: Optional[List[InputDataType]] = None,  # variable.read_data
        metadata: Optional[Dict] = None,
        sample_data: Optional[bool] = None,
        take: Optional[int] = None,
        variable_type: Optional[VariableType] = None,
    ) -> Any:
        # Handle kwargs
        return self.variable.read_data()


class OutputManager(DataGenerator):
    pass


class BlockOutputManager(OutputManager):
    def __init__(self, block: BlockInterface, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.block = block

    @property
    def dynamic(self) -> bool:
        from mage_ai.data_preparation.models.block.dynamic.utils import is_dynamic_block

        return is_dynamic_block(self.block)

    @property
    def dynamic_child(self) -> bool:
        from mage_ai.data_preparation.models.block.dynamic.utils import (
            is_dynamic_block_child,
        )

        return is_dynamic_block_child(self.block)

    def present(
        self,
        csv_lines_only: Optional[bool] = None,  # block.get_outputs
        from_notebook: Optional[bool] = None,  # data integrations
        global_vars: Optional[Dict] = None,  # data integrations
        include_print_outputs: Optional[bool] = None,  # block.get_outputs
        index: Optional[int] = None,  # data integrations
        input_args: Optional[List[Any]] = None,  # data integrations
        metadata: Optional[Dict] = None,  # data integrations
        sample_data: Optional[bool] = None,  # sample
        take: Optional[int] = None,  # sample_count
        variable_type: Optional[VariableType] = None,  # block.get_outputs
    ) -> List[Dict[str, Any]]:
        if self.dynamic or self.dynamic_child:
            return present_dynamic_block_outputs(
                self.block,
                self,
                sample_data=sample_data,
                take=take,
                dynamic=self.dynamic,
                dynamic_child=self.dynamic_child,
            )
        return present_block_outputs(self.block, self, sample_data=sample_data, take=take)

    async def present_async(
        self,
        csv_lines_only: Optional[bool] = None,  # block.get_outputs
        from_notebook: Optional[bool] = None,  # data integrations
        global_vars: Optional[Dict] = None,  # data integrations
        include_print_outputs: Optional[bool] = None,  # block.get_outputs
        index: Optional[int] = None,  # data integrations
        input_args: Optional[List[Any]] = None,  # data integrations
        metadata: Optional[Dict] = None,  # data integrations
        sample_data: Optional[bool] = None,  # sample
        take: Optional[int] = None,  # sample_count
        variable_type: Optional[VariableType] = None,  # block.get_outputs
    ) -> List[Dict[str, Any]]:
        """
        block.__get_outputs_async
        """
        return []
