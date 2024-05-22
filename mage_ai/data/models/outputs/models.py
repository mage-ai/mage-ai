from typing import Any, Optional

from mage_ai.data_preparation.models.variable import Variable


class BaseOutput:
    def __init__(self, data: Optional[Any] = None, variable: Optional[Variable] = None):
        self.data = data
        self.variable = variable

    def print(self):
        print(self.data)


class BlockOutput(BaseOutput):
    def __init__(self, block: Any, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.block = block
