from typing import Any, Optional, Union

from mage_ai.data.models.reader import Reader
from mage_ai.data.models.shared import BaseData
from mage_ai.data.models.writer import Writer
from mage_ai.data_preparation.models.utils import infer_variable_type


class DataManager(BaseData):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._reader = None
        self._writer = None

    @property
    def reader(self) -> Reader:
        if not self._reader:
            self._reader = Reader(
                storage=self.storage,
                variable_dir_path=self.variable_dir_path,
                variable_path=self.variable_path,
                variable_type=self.variable_type,
            )
        return self._reader

    @property
    def writer(self) -> Writer:
        if not self._writer:
            self._writer = Writer(
                storage=self.storage,
                variable_dir_path=self.variable_dir_path,
                variable_path=self.variable_path,
                variable_type=self.variable_type,
            )
        return self._writer

    async def read_async(self) -> Optional[Union[Any, str]]:
        pass

    def read_sync(self) -> Optional[Union[Any, str]]:
        pass

    async def write_async(self, data: Any) -> None:
        self.__prepare(data, self.writer)
        await self.writer.write_async(data)

    def write_sync(self, data: Any) -> None:
        self.__prepare(data, self.writer)
        self.writer.write_sync(data)

    def readable(self) -> bool:
        return self.reader.supported()

    def writeable(self, data: Optional[Any] = None) -> bool:
        return self.writer.supported(data=data)

    def __prepare(self, data: Any, base_data: BaseData) -> None:
        if self.variable_type is None:
            self.variable_type, _ = infer_variable_type(data)
            if self.variable_type is not None:
                base_data.variable_type = self.variable_type
