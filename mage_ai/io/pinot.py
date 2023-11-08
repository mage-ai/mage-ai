import re
from typing import IO, Any, Dict, List, Union

from pandas import DataFrame, Series
from pinotdb import connect

from mage_ai.io.base import QUERY_ROW_LIMIT, ExportWritePolicy
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.sql import BaseSQL

WRITE_NOT_SUPPORTED_EXCEPTION = Exception('write operations are not supported.')


class Pinot(BaseSQL):
    """
    Handles data transfer between a Pinot data warehouse and the Mage app.
    """

    def __init__(
            self,
            host: str,
            port: int,
            username: Union[str, None] = None,
            password: Union[str, None] = None,
            path: str = '/query/sql',
            scheme: str = 'http',
            **kwargs,
    ) -> None:
        """
        Initializes the data loader.

        Args:
            host (str): The host of the pinot controller to connect to.
            port (int): Port on which the pinot controller is running.
            username (str): The user with which to connect to the server with.
            password (str): The login password for the user.
            path (str): Path to pinot sql api.
            scheme (str): The scheme identifies the protocol to be used http or https.
            **kwargs: Additional settings for creating SQLAlchemy engine and connection
        """
        self._ctx = None
        super().__init__(
            host=host,
            port=port,
            username=username,
            password=password,
            path=path,
            scheme=scheme,
            **kwargs,
        )

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'Pinot':
        return cls(
            host=config[ConfigKey.PINOT_HOST],
            port=config[ConfigKey.PINOT_PORT],
            username=config[ConfigKey.PINOT_USER],
            password=config[ConfigKey.PINOT_PASSWORD],
            path=config[ConfigKey.PINOT_PATH],
            scheme=config[ConfigKey.PINOT_SCHEME],
        )

    def open(self) -> None:
        with self.printer.print_msg('Opening connection to Pinot warehouse'):
            self._ctx = connect(
                host=self.settings['host'],
                port=self.settings['port'],
                username=self.settings['username'],
                password=self.settings['password'],
                path=self.settings['path'],
                scheme=self.settings['scheme'],
            )

    def execute(self, query_string: str, **query_vars) -> None:
        super().execute(query_string, **query_vars)

    def execute_queries(self,
                        queries: List[str],
                        query_variables: List[Dict] = None,
                        commit: bool = False,
                        fetch_query_at_indexes: List[bool] = None) -> List:
        return super().execute_queries(queries, query_variables, commit, fetch_query_at_indexes)

    def fetch_query(self, cursor, query: str) -> Any:
        return super().fetch_query(cursor, query)

    def load(self,
             query_string: str,
             limit: int = QUERY_ROW_LIMIT,
             display_query: Union[str, None] = None,
             verbose: bool = True,
             **kwargs) -> DataFrame:
        return super().load(query_string, limit, display_query, verbose, **kwargs)

    def clean(self, column: Series, dtype: str) -> Series:
        return super().clean(column, dtype)

    @property
    def conn(self) -> Any:
        return super().conn

    def upload_dataframe(self,
                         cursor,
                         df: DataFrame,
                         db_dtypes: List[str],
                         dtypes: List[str],
                         full_table_name: str,
                         buffer: Union[IO, None] = None,
                         **kwargs) -> None:
        raise WRITE_NOT_SUPPORTED_EXCEPTION

    def export(self,
               df: DataFrame,
               schema_name: str,
               table_name: str,
               if_exists: ExportWritePolicy = ExportWritePolicy.REPLACE,
               index: bool = False, verbose: bool = True,
               query_string: Union[str, None] = None,
               drop_table_on_replace: bool = False,
               cascade_on_drop: bool = False,
               allow_reserved_words: bool = False,
               unique_conflict_method: str = None,
               unique_constraints: List[str] = None) -> None:
        raise WRITE_NOT_SUPPORTED_EXCEPTION

    def _enforce_limit(self, query: str, limit: int = QUERY_ROW_LIMIT) -> str:
        query = query.strip(';')
        if re.search('limit', query, re.IGNORECASE):
            return f"""
{query}
"""
        else:
            return f"""
{query} limit {limit}
"""
