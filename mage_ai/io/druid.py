from mage_ai.io.base import ExportWritePolicy, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.sql import BaseSQL
from pandas import DataFrame, Series
from pydruid.db.api import Connection, Cursor as CursorParent
from typing import Dict, List, Union, Any, IO

WRITE_NOT_SUPPORTED_EXCEPTION = Exception('write operations are not supported.')


class Cursor(CursorParent):
    # added because the pydruid.db.api.Cursor doesn't implement __enter__ and __exit__
    # and we use the cursor in a `with` in sql.py
    def __enter__(self):
        return self

    def __exit__(self, *args, **kwargs):
        pass


class ConnectionWrapper(Connection):
    def cursor(self):
        return Cursor(url=self.url, user=self.user, password=self.password)


class Druid(BaseSQL):
    """
    Handles data transfer between a Druid data warehouse and the Mage app.
    """

    def __init__(
            self,
            host: str,
            port: int,
            user: Union[str, None] = None,
            password: Union[str, None] = None,
            path: str = '/druid/v2/sql/',
            scheme: str = 'http',
            verbose=True,
            **kwargs,
    ) -> None:
        """
        Initializes the data loader.

        Args:
            host (str): The host of the druid broker server to connect to.
            port (int): Port on which the druid broker server is running.
            user (str): The user with which to connect to the server with.
            password (str): The login password for the user.
            path (str): Path to druid sql api.
            scheme (str): The scheme identifies the protocol to be used http or https.
            **kwargs: Additional settings for creating SQLAlchemy engine and connection
        """
        self._ctx = None
        super().__init__(
            verbose=verbose,
            host=host,
            port=port,
            user=user,
            password=password,
            path=path,
            scheme=scheme,
            **kwargs,
        )

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'Druid':
        return cls(
            host=config[ConfigKey.DRUID_HOST],
            port=config[ConfigKey.DRUID_PORT],
            user=config[ConfigKey.DRUID_USER],
            password=config[ConfigKey.DRUID_PASSWORD],
            path=config[ConfigKey.DRUID_PATH],
            scheme=config[ConfigKey.DRUID_SCHEME],
        )

    def open(self) -> None:
        with self.printer.print_msg('Opening connection to Druid warehouse'):
            connect_kwargs = dict(
                host=self.settings['host'],
                port=self.settings['port'],
                user=self.settings['user'],
                password=self.settings['password'],
                path=self.settings['path'],
                scheme=self.settings['scheme'],
            )
            print(connect_kwargs)
            self._ctx = ConnectionWrapper(**connect_kwargs)

    def table_exists(self, schema_name: str, table_name: str) -> bool:
        # Not used
        with self.conn.cursor() as cur:
            cur.execute(
                f'SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = \'{table_name}\''
            )
        return bool(cur.rowcount)

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

    def close(self) -> None:
        super().close()

    def commit(self) -> None:
        super().commit()

    @property
    def conn(self) -> Any:
        return super().conn

    def rollback(self) -> None:
        super().rollback()

    def upload_dataframe(self,
                         cursor,
                         df: DataFrame,
                         db_dtypes: List[str],
                         dtypes: List[str],
                         full_table_name: str,
                         buffer: Union[IO, None] = None) -> None:
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
