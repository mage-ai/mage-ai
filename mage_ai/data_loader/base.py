from abc import ABC, abstractmethod
from enum import Enum
from pandas import DataFrame
from typing import Any, Union
import pandas as pd
import os


class FileFormat(str, Enum):
    CSV = 'csv'
    JSON = 'json'
    PARQUET = 'parquet'
    HDF5 = 'hdf5'


FORMAT_TO_FUNCTION = {
    FileFormat.CSV: pd.read_csv,
    FileFormat.JSON: pd.read_json,
    FileFormat.PARQUET: pd.read_parquet,
    FileFormat.HDF5: pd.read_hdf,
}


class BaseLoader(ABC):
    """
    Data loader interface. All data loaders must inherit from this interface.
    """

    @abstractmethod
    def load(self, *args, **kwargs) -> DataFrame:
        """
        Loads a data frame from source, returns it to memory. Subclasses must
        override this method to specify how this data frame is to be returned.

        Returns:
            DataFrame: dataframe returned by the source.
        """
        pass


class BaseFile(BaseLoader):
    """
    Data loader for file-like data sources (for example, loading from local
    filesystem or external file storages such as AWS S3)
    """

    def __init__(self, filepath: os.PathLike, format: Union[FileFormat, str] = None) -> None:
        """
        Initializes the file data loader

        Args:
            filepath (os.PathLike): Path to the file
            format (FileFormat, optional): File format for the data being loaded. Defaults to None.
        """
        if format is None:
            format = os.path.splitext(filepath)[-1][1:]
        self.reader = FORMAT_TO_FUNCTION[format]
        self.filepath = filepath


class BaseSQL(BaseLoader):
    """
    Data loader for connected SQL data sources. Can be used as a context manager or by manually opening or closing the connection
    to the SQL data source after data loading is complete.

    WARNING: queries may continue to run on data source unless connection manually closed. For this reason it is recommended to use a context
    manager when connecting to external data sources.
    """

    def __init__(self, **kwargs) -> None:
        """
        Initializes the connection with the settings given as keyword arguments. Specific data loaders will have access to different settings.
        """
        self.settings = kwargs

    def close(self) -> None:
        """
        Close the underlying connection to the SQL data source if open. Else will do nothing.
        """
        if '_ctx' in self.__dict__:
            self._ctx.close()
            del self._ctx

    @property
    def conn(self) -> Any:
        """
        Returns the connection object to the SQL data source. The exact connection type depends
        on the source and the definition of the data loader.
        """
        try:
            return self._ctx
        except AttributeError:
            raise ConnectionError(
                'No connection currently open. Open a new connection to access this property.'
            )

    @abstractmethod
    def query(self, query_string: str, *args, **kwargs) -> None:
        """
        Executes the query on the SQL database connected to this data loader.

        Args:
            query_string (str): SQL query string to apply to the connected data source.
        """
        pass

    @abstractmethod
    def open(self) -> None:
        """
        Opens an underlying connection to the SQL data source.
        """
        pass

    def __del__(self):
        self.close()

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, *args):
        self.close()
