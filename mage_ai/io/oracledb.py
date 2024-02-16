import warnings
from typing import Union

import oracledb
from pandas import DataFrame, read_sql

from mage_ai.io.base import QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.sql import BaseSQL


class OracleDB(BaseSQL):
    def __init__(self,
                 user,
                 password,
                 host,
                 port,
                 service_name,
                 verbose: bool = False,
                 mode: str = 'thin',
                 **kwargs) -> None:
        super().__init__(user=user,
                         password=password,
                         host=host,
                         port=port,
                         service_name=service_name,
                         verbose=verbose,
                         mode=mode,
                         **kwargs)

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'OracleDB':
        return cls(
            user=config[ConfigKey.ORACLEDB_USER],
            password=config[ConfigKey.ORACLEDB_PASSWORD],
            host=config[ConfigKey.ORACLEDB_HOST],
            port=config[ConfigKey.ORACLEDB_PORT],
            service_name=config[ConfigKey.ORACLEDB_SERVICE],
            mode=config[ConfigKey.ORACLEDB_MODE],
        )

    def open(self) -> None:
        with self.printer.print_msg('Opening connection to OracleDB database (thin mode)'):
            self._ctx = oracledb.connect(**self.settings)

    def load(
        self,
        query_string: str,
        limit: int = QUERY_ROW_LIMIT,
        display_query: Union[str, None] = None,
        verbose: bool = True,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from the connected database into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database. This function will load at
        maximum 10,000,000 rows of data. To operate on more data, consider performing data
        transformations in warehouse.

        Args:
            query_string (str): Query to execute on the database.
            limit (int, Optional): The number of rows to limit the loaded dataframe to. Defaults
                to 10,000,000.
            **kwargs: Additional query parameters.

        Returns:
            DataFrame: The data frame corresponding to the data returned by the given query.
        """
        print_message = 'Loading data'
        if verbose:
            print_message += ' with query'

            if display_query:
                for line in display_query.split('\n'):
                    print_message += f'\n{line}'
            else:
                print_message += f'\n\n{query_string}\n\n'

        query_string = self._clean_query(query_string)

        with self.printer.print_msg(print_message):
            warnings.filterwarnings('ignore', category=UserWarning)

            return read_sql(
                self._enforce_limit_oracledb(query_string, limit),
                self.conn,
                **kwargs,
            )

    def _enforce_limit_oracledb(self, query: str, limit: int = QUERY_ROW_LIMIT) -> str:
        """
        Modifies SQL SELECT query to enforce a limit on the number of rows returned by the query.
        This method is currently supports Oracledb syntax only.

        Args:
            query (str): The SQL query to modify
            limit (int): The limit on the number of rows to return.

        Returns:
            str: Modified query with limit on row count returned.
        """
        query = query.strip(';')

        return f"""
WITH subquery AS (
    {query}
)

SELECT *
FROM subquery
FETCH FIRST {limit} ROWS ONLY
                """
