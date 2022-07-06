from abc import ABC, abstractmethod
from enum import Enum
from mage_ai.shared.logger import VerbosePrintHandler
from pandas import DataFrame
from typing import IO, Any, Callable, Mapping, Union
import pandas as pd
import os


class DataSource(str, Enum):
    BIGQUERY = 'bigquery'
    FILE = 'file'
    POSTGRES = 'postgres'
    REDSHIFT = 'redshift'
    S3 = 's3'
    SNOWFLAKE = 'snowflake'


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


class BaseIO(ABC):
    """
    Data loader interface. All data loaders must inherit from this interface.
    """

    def __init__(self, verbose=False) -> None:
        self.verbose = verbose
        self.printer = VerbosePrintHandler(f'{type(self).__name__} initialized', verbose=verbose)

    @classmethod
    @abstractmethod
    def with_config(cls, config: Mapping[str, Any]) -> None:
        pass

    @abstractmethod
    def load(self, *args, **kwargs) -> DataFrame:
        """
        Loads a data frame from source, returns it to memory. Subclasses must
        override this method to specify how this data frame is to be returned.

        Returns:
            DataFrame: dataframe returned by the source.
        """
        pass

    @abstractmethod
    def export(self, df: DataFrame, *args, **kwargs) -> None:
        """
        Exports the input dataframe to the specified source. Subclasses must override
        this method to specify of this data frame should be exported.

        Args:
            df (DataFrame): Data frame to export.
        """
        pass


class BaseFile(BaseIO):
    """
    Data loader for file-like data sources (for example, loading from local
    filesystem or external file storages such as AWS S3)
    """

    def __init__(
        self, filepath: os.PathLike, format: Union[FileFormat, str] = None, verbose=False
    ) -> None:
        """
        Initializes the file data loader

        Args:
            filepath (os.PathLike): Path to the file
            format (FileFormat, optional): File format for the data being loaded. Defaults to None.
        """
        super().__init__(verbose=verbose)
        parts = os.path.splitext(os.path.basename(filepath))
        if format is None:
            format = parts[-1][1:]
        self.name = parts[0]
        self.reader = FORMAT_TO_FUNCTION[format]
        self.filepath = filepath
        self.format = format

    def _write(self, df: DataFrame, output: Union[IO, os.PathLike], **kwargs) -> None:
        """
        Base method for writing a data frame to some buffer or file.

        Args:
            df (DataFrame): Data frame to write.
            output (Union[IO, os.PathLike]): Output to write data frame to
            (can be a filepath or a buffer in memory).
        """
        writer = self.__get_writer(df)
        if self.format == FileFormat.HDF5:
            kwargs.setdefault('key', self.name)
        writer(output, **kwargs)

    def __get_writer(self, df: DataFrame) -> Callable:
        """
        Fetches the appropriate file writer based on format

        Args:
            df (DataFrame): Data frame to get file writer for

        Returns:
            Callable: File writer method
        """
        if self.format == FileFormat.CSV:
            writer = df.to_csv
        elif self.format == FileFormat.JSON:
            writer = df.to_json
        elif self.format == FileFormat.PARQUET:
            writer = df.to_parquet
        elif self.format == FileFormat.HDF5:
            writer = df.to_hdf
        else:
            raise ValueError(f'Unexpected format provided: {self.format}')
        return writer

    def __del__(self):
        if self.verbose and self.printer.exists_previous_message:
            print('')


class BaseSQL(BaseIO):
    """
    Data loader for connected SQL data sources. Can be used as a context manager or by manually opening or closing the connection
    to the SQL data source after data loading is complete.

    WARNING: queries may continue to run on data source unless connection manually closed. For this reason it is recommended to use a context
    manager when connecting to external data sources.
    """

    def __init__(self, verbose=False, **kwargs) -> None:
        """
        Initializes the connection with the settings given as keyword arguments. Specific data loaders will have access to different settings.
        """
        super().__init__(verbose=verbose)
        self.settings = kwargs

    def close(self) -> None:
        """
        Close the underlying connection to the SQL data source if open. Else will do nothing.
        """
        if '_ctx' in self.__dict__:
            self._ctx.close()
            del self._ctx
        if self.verbose and self.printer.exists_previous_message:
            print('')

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
