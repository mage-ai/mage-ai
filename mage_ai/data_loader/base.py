from abc import ABC, abstractmethod
from pandas import DataFrame
from typing import Any


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


class BaseSQL(BaseLoader):
    """
    Data loader for connected SQL data sources. Can be used as a context manager or by manually opening or closing the connection
    to the SQL data source after data loading is complete.

    WARNING: queries may continue to run on data source unless connection manually closed. For this reason it is recommended to use a context
    manager when connecting to external data sources.
    """

    def __init__(self, **kwargs):
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
