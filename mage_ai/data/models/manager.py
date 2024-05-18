from typing import Any, Optional

from mage_ai.data.models.reader import Reader
from mage_ai.data.models.shared import BaseData
from mage_ai.data.models.writer import Writer
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.models.variables.constants import VariableType


class Manager(BaseData):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._reader = None
        self._writer = None

    @property
    def reader(self) -> Reader:
        if not self._reader:
            self._reader = Reader(
                repo_path=self.repo_path,
                storage=self.storage,
                variables_dir=self.variables_dir,
            )
        return self._reader

    @property
    def writer(self) -> Writer:
        if not self._writer:
            self._writer = Writer(
                repo_path=self.repo_path,
                storage=self.storage,
                variables_dir=self.variables_dir,
            )
        return self._writer

    async def read_async(self, variable: Variable, data: Any) -> None:
        pass

    def read_sync(self, variable: Variable, data: Any) -> None:
        pass

    async def write_async(self, variable: Variable, data: Any) -> None:
        pass

    def write_sync(self, variable: Variable, data: Any) -> None:
        pass

    def readable(
        self,
        data: Optional[Any] = None,
        variable: Optional[Variable] = None,
        variable_type: Optional[VariableType] = None,
    ) -> bool:
        return self.reader.supported(
            data=data,
            variable=variable,
            variable_type=variable_type,
        )

    def writeable(
        self,
        data: Optional[Any] = None,
        variable: Optional[Variable] = None,
        variable_type: Optional[VariableType] = None,
    ) -> bool:
        return self.writer.supported(
            data=data,
            variable=variable,
            variable_type=variable_type,
        )
