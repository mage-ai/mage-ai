from typing import Any, Optional

from mage_ai.data.constants import WRITEABLE_VARIABLE_TYPES
from mage_ai.data.models.shared import BaseData
from mage_ai.data_preparation.models.utils import infer_variable_type
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.models.variables.constants import VariableType


class Writer(BaseData):
    def supported(
        self,
        data: Optional[Any] = None,
        variable: Optional[Variable] = None,
        variable_type: Optional[VariableType] = None,
    ) -> bool:
        if variable_type is None:
            if variable is not None:
                variable_type = variable.variable_type
            elif data is not None:
                variable_type, _ = infer_variable_type(data, repo_path=self.repo_path)

        return variable_type is not None and variable_type in WRITEABLE_VARIABLE_TYPES
