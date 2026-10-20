from abc import ABC, abstractmethod
from contextlib import contextmanager
from typing import Dict, List, Optional, Union

import pandas as pd
import polars as pl


class BaseStorage(ABC):
    @abstractmethod
    def isdir(self, path: str) -> bool:
        """
        Check whether a path is a directory.
        """
        pass

    @abstractmethod
    def listdir(self, path: str, suffix: str = None) -> List[str]:
        """
        Get a list of files and directories in the specified directory.
        """
        pass

    @abstractmethod
    def makedirs(self, path: str, **kwargs) -> None:
        """
        Create new directories.
        """
        pass

    @abstractmethod
    def path_exists(self, path: str) -> bool:
        """
        Check whether a path exists.
        """
        pass

    @abstractmethod
    def remove(self, path: str) -> None:
        """
        Remove a file with file path.
        """
        pass

    @abstractmethod
    def remove_dir(self, path: str) -> None:
        """
        Remove a directory with directory path.
        """
        pass

    @abstractmethod
    def read_parquet(self, file_path: str, **kwargs) -> pd.DataFrame:
        """
        Read parquet from a file with file path and return a pandas DataFrame.
        """
        pass

    @abstractmethod
    def read_polars_parquet(self, file_path: str, **kwargs) -> pl.DataFrame:
        """
        Read parquet from a file with file path and return a polars DataFrame.
        """
        pass

    @abstractmethod
    def read_json_file(
        self,
        file_path: str,
        default_value: Optional[Union[Dict, List]] = None,
        raise_exception: bool = False,
    ) -> Dict:
        """
        Read json from a file with file path.
        """
        pass

    @abstractmethod
    async def read_json_file_async(
        self,
        file_path: str,
        default_value: Dict = None,
        raise_exception: bool = False,
    ) -> Dict:
        """
        Read json from a file with file path asynchronously.
        """
        pass

    @abstractmethod
    def write_json_file(self, file_path: str, data) -> None:
        """
        Write json to a file with file path.
        """
        pass

    @abstractmethod
    async def write_json_file_async(self, file_path: str, data) -> None:
        """
        Write json to a file with file path asynchronously.
        """
        pass

    @abstractmethod
    def write_parquet(self, df, file_path: str) -> None:
        """
        Write Pandas dataframe to a file in parquet format.
        """
        pass

    @abstractmethod
    def write_polars_dataframe(self, df, file_path: str) -> None:
        """
        Write Polars dataframe to a file in parquet format.
        """
        pass

    @abstractmethod
    @contextmanager
    def open_to_write(self, file_path: str) -> None:
        pass

    @abstractmethod
    async def read_async(self, file_path: str) -> str:
        pass
