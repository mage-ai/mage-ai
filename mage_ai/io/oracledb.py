import warnings
from typing import IO, Any, List, Union

import numpy as np
import oracledb
import simplejson
from pandas import DataFrame, Series, read_sql

from mage_ai.io.base import QUERY_ROW_LIMIT, ExportWritePolicy
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import PandasTypes
from mage_ai.io.sql import BaseSQL
from mage_ai.server.logger import Logger
from mage_ai.shared.parsers import encode_complex

logger = Logger().new_server_logger(__name__)


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
        if self.settings['mode'] and self.settings['mode'].lower() == 'thick':
            logger.info('Initializing Oracle thick mode.')
            oracledb.init_oracle_client()
        with self.printer.print_msg(f'Opening connection to OracleDB database \
                                    ({self.settings["mode"]} mode)'):
            connection_dsn = "{}:{}/{}".format(
                self.settings['host'],
                self.settings['port'],
                self.settings['service_name'])
            self._ctx = oracledb.connect(
                user=self.settings['user'], password=self.settings['password'], dsn=connection_dsn)

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

    def table_exists(self, schema_name: str, table_name: str) -> bool:
        with self.conn.cursor() as cur:
            try:
                cur.execute(f"select * from {table_name} where rownum=1")
            except Exception as exc:
                logger.info(f"Table not existing: {table_name}. Exception: {exc}")
                return False
        return True

    def get_type(self, column: Series, dtype: str) -> str:
        if dtype in (
            PandasTypes.MIXED,
            PandasTypes.UNKNOWN_ARRAY,
            PandasTypes.COMPLEX,
        ):
            return 'CHAR(255)'
        elif dtype in (PandasTypes.DATETIME, PandasTypes.DATETIME64):
            try:
                if column.dt.tz:
                    return 'TIMESTAMP'
            except AttributeError:
                pass
            return 'TIMESTAMP'
        elif dtype == PandasTypes.TIME:
            try:
                if column.dt.tz:
                    return 'TIMESTAMP'
            except AttributeError:
                pass
            return 'TIMESTAMP'
        elif dtype == PandasTypes.DATE:
            return 'DATE'
        elif dtype == PandasTypes.STRING:
            return 'CHAR(255)'
        elif dtype == PandasTypes.CATEGORICAL:
            return 'CHAR(255)'
        elif dtype == PandasTypes.BYTES:
            return 'CHAR(255)'
        elif dtype in (PandasTypes.FLOATING, PandasTypes.DECIMAL, PandasTypes.MIXED_INTEGER_FLOAT):
            return 'NUMBER'
        elif dtype == PandasTypes.INTEGER:
            max_int, min_int = column.max(), column.min()
            if np.int16(max_int) == max_int and np.int16(min_int) == min_int:
                return 'NUMBER'
            elif np.int32(max_int) == max_int and np.int32(min_int) == min_int:
                return 'NUMBER'
            else:
                return 'NUMBER'
        elif dtype == PandasTypes.BOOLEAN:
            return 'CHAR(52)'
        elif dtype in (PandasTypes.TIMEDELTA, PandasTypes.TIMEDELTA64, PandasTypes.PERIOD):
            return 'NUMBER'
        elif dtype == PandasTypes.EMPTY:
            return 'CHAR(255)'
        else:
            print(f'Invalid datatype provided: {dtype}')

        return 'CHAR(255)'

    def export(
        self,
        df: DataFrame,
        table_name: str = None,
        if_exists: ExportWritePolicy = ExportWritePolicy.REPLACE,
        **kwargs,
    ) -> None:
        super().export(
            df,
            **kwargs,
            table_name=table_name,
            if_exists=if_exists,
            # Oracle cursor execute will automatically add a semicolon at the end of the query.
            skip_semicolon_at_end=True
        )

    def upload_dataframe(
        self,
        cursor: Any,
        df: DataFrame,
        db_dtypes: List[str],
        dtypes: List[str],
        full_table_name: str,
        buffer: Union[IO, None] = None,
        **kwargs,
    ) -> None:
        def serialize_obj(val):
            if type(val) is dict or type(val) is np.ndarray:
                return simplejson.dumps(
                    val,
                    default=encode_complex,
                    ignore_nan=True,
                )
            elif type(val) is list and len(val) >= 1 and type(val[0]) is dict:
                return simplejson.dumps(
                    val,
                    default=encode_complex,
                    ignore_nan=True,
                )
            return val

        # Create values
        df_ = df.copy()
        columns = df_.columns
        for col in columns:
            dtype = df_[col].dtype
            if dtype == PandasTypes.OBJECT:
                df_[col] = df_[col].apply(lambda x: serialize_obj(x))
            elif dtype in (
                PandasTypes.MIXED,
                PandasTypes.UNKNOWN_ARRAY,
                PandasTypes.COMPLEX,
            ):
                df_[col] = df_[col].astype('string')

            # Remove extraneous surrounding double quotes
            # that get added while performing conversion to string.
            df_[col] = df_[col].apply(lambda x: x.strip('"') if x and isinstance(x, str) else x)
        df_.replace({np.NaN: None}, inplace=True)
        values = []
        for i in range(0, len(df_)):
            values.append(tuple(df_.fillna('').values[i]))

        # Create values placeholder
        colmn_names = df.columns.tolist()
        values_placeholder = ""
        for i in range(0, len(colmn_names)):
            values_placeholder += f':{str(i + 1)},'

        insert_sql = f'INSERT INTO {full_table_name} VALUES({values_placeholder.rstrip(",")})'
        cursor.executemany(insert_sql, values)
