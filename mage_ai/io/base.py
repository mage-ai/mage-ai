from abc import ABC, abstractmethod
from enum import Enum
from mage_ai.shared.logger import VerbosePrintHandler
from pandas import DataFrame
from typing import IO, Any, Callable, Mapping, Union
import os
import pandas as pd

QUERY_ROW_LIMIT = 100_000


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


class ExportWritePolicy(str, Enum):
    APPEND = 'append'
    FAIL = 'fail'
    REPLACE = 'replace'


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

    def _enforce_limit(self, query: str, limit: int = QUERY_ROW_LIMIT) -> str:
        """
        Modifies SQL SELECT query to enforce a limit on the number of rows returned by the query.
        This method is currently supports PostgreSQL syntax, which means it can be used with
        PostgreSQL, Amazon Redshift, Snowflake, and Google BigQuery.

        Args:
            query (str): The SQL query to modify
            limit (int): The limit on the number of rows to return.

        Returns:
            str: Modified query with limit on row count returned.
        """
        return f'SELECT * FROM ({query.strip(";")}) AS subquery LIMIT {limit};'

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
        self.can_limit = self.format in (FileFormat.CSV, FileFormat.JSON)

    def _trim_df(self, df: DataFrame, limit: int = QUERY_ROW_LIMIT) -> DataFrame:
        """
        Truncates data frame to `limit` rows

        Args:
            df (DataFrame): Data frame to truncate out.

        Returns:
            DataFrame: Truncated data frame with removed rows.
        """
        return df[:limit]

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


class BaseSQLDatabase(BaseIO):
    """
    Base data loader for connecting to a SQL database. This adds `query` method which allows a user
    to send queries to the databse server.
    """

    @abstractmethod
    def execute(self, query_string: str, **kwargs) -> None:
        """
        Sends query to the connected database

        Args:
            query_string (str): Query to send to the connected database.
            **kwargs: Additional arguments to pass to query, such as query configurations
        """
        pass

    def sample(self, schema: str, table: str, size: int = QUERY_ROW_LIMIT, **kwargs) -> DataFrame:
        """
        Sample data from a table in the connected database. Sample is not
        guaranteed to be random.

        Args:
            schema (str): The schema to select the table from.
            size (int): The number of rows to sample. Defaults to 100,000
            table (str): The table to sample from in the connected database.

        Returns:
            DataFrame: Sampled data from the data frame.
        """
        return self.load(f'SELECT * FROM {schema}.{table} LIMIT {str(size)};', **kwargs)


class BaseSQLConnection(BaseSQLDatabase):
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

    def commit(self) -> None:
        """
        Commits all changes made to database since last commit
        """
        self.conn.commit()

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
    def open(self) -> None:
        """
        Opens an underlying connection to the SQL data source.
        """
        pass

    def rollback(self) -> None:
        """
        Rolls back (deletes) all changes made to database since last commit.
        """
        self.conn.rollback()

    def __del__(self):
        self.close()

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, *args):
        self.close()
