from bson.json_util import dumps
from io import StringIO
import json
from mage_ai.io.base import BaseSQLConnection, ExportWritePolicy, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.io.export_utils import (
    BadConversionError,
    clean_df_for_export,
    gen_table_creation_query,
    infer_dtypes,
    PandasTypes,
)
from pandas import DataFrame, read_sql, Series, read_json
from pymongo import MongoClient, database
from psycopg2 import connect
import numpy as np
from optparse import OptionParser
from sys import stdout, exit as sys_exit


def debug_print(func):
    """
    Just a utility decorator to stay out of the way and help with debugging.
    
    Args:
        func: Name of function.

    Returns:
        function
    """
    def wrapper(*args, **kwargs):
        ret = func(*args, **kwargs)
        return ret
    return wrapper 


class MongoDB(BaseSQLConnection):
    """
    Handles data transfer between a MongoDB database and the Mage app.
    """

    def __init__(
        self,
        dbname: str,
        colname: str,
        user: str or None,
        password: str or None,
        host: str,
        port: str = None,
        verbose=True,
        **kwargs,
    ) -> None:
        """
        Initializes the data loader.

        Args:
            dbname (str): The name of the database to connect to.
            colname (str): The name of the collection to connect to.
            user (str): The user with which to connect to the database with.
            password (str): The login password for the user.
            host (str): Path to host address for database.
            port (str): Port on which the database is running.
            **kwargs: Additional settings for creating SQLAlchemy engine and connection
        """
        super().__init__(
            verbose=verbose,
            dbname=dbname,
            colname=colname,
            user=user,
            password=password,
            host=host,
            port=port,
            **kwargs,
        )

    def open(self) -> None:
        """
        Opens a connection to the MongoDB database specified by the parameters.
        """
        with self.printer.print_msg('Opening connection to MongoDB database'):
            user = self.settings['user']
            password = self.settings['password']
            host = self.settings['host']
            port = self.settings['port']
            if user is not None and password is not None:
                conn = MongoClient(f'mongodb://{user}:{password}@{host}:{port}/')
            else:
                conn = MongoClient(host, port)
            self._ctx = conn

    def execute(self, query_string: str, **query_vars) -> None or dict:
        """
        Convert SQL query to Mongo shell -> execute.

        Args:
            query_string (str): SQL query string to apply on the connected database.
            query_vars: Variable values to fill in when using format strings in query.
            
        Returns:
            Dict: Mongo data.
        """
        with self.printer.print_msg(f'Executing query \'{query_string}\''):
            
            query_string = self._clean_query(query_string)

            db = self._ctx[self.settings['dbname']]
            
            # convert SQL query to Mongo query
            spec_dict = self.sql_to_spec(query_string)
            query_mongo = self.create_mongo_shell_query(spec_dict)
            
            # execute Mongo query
            mongo_result = eval(query_mongo)
            
            return mongo_result

    def load(
        self,
        query_string: str,
        limit: int = QUERY_ROW_LIMIT,
        display_query: str = None,
        verbose: bool = True,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from the connected database into a Pandas data frame based on the query given.
        This will fail if the query returns no data from the database. This function will load at
        maximum 100,000 rows of data. To operate on more data, consider performing data
        transformations in warehouse.

        Args:
            query_string (str): Query to execute on the database.
            limit (int, Optional): The number of rows to limit the loaded dataframe to. Defaults to 100000.
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
                print_message += f'\n{query_string}'

        query_string = self._clean_query(query_string)
        
        # get mongo_data after execute SQL
        mongo_data = self.execute(query_string)
        
        #convert mongo_data to dataframe
        json_data = dumps(list(mongo_data))
        df = read_json(StringIO(json_data))
        
        with self.printer.print_msg(print_message):
            if df.empty:
                return {}
            return df

    def export(
        self,
        df: DataFrame,
        db_name: str,
        col_name: str,
        if_exists: ExportWritePolicy = ExportWritePolicy.REPLACE,
        index: bool = False,
        verbose: bool = True,
        query_string: str = None,
        drop_table_on_replace: bool = False,
        cascade_on_drop: bool = False,
    ) -> None:
        """
        Exports dataframe to the connected database from a Pandas data frame. If table doesn't
        exist, the table is automatically created. If the schema doesn't exist, the schema is also created.

        Args:
            db_name (str): Name of the database of the collection to export data to.
            col_name (str): Name of the collection to insert rows from this data frame into.
            if_exists (ExportWritePolicy): Specifies export policy if collection exists. Either
                - `'fail'`: throw an error.
                - `'replace'`: drops existing collection and creates new collection of same name.
                - `'append'`: appends data frame to existing collection. In this case the schema must match the original collection.
            Defaults to `'replace'`.
            index (bool): If true, the data frame index is also exported alongside the collection. Defaults to False.
            **kwargs: Additional query parameters.
        """
        full_collection_name = f'{db_name}.{col_name}'
        
        if not query_string:
            if index:
                df = df.reset_index()

            dtypes = infer_dtypes(df)
            df = clean_df_for_export(df, self.clean, dtypes)

        def __process():
            db = self._ctx[db_name]
            
            collection_exists = self.__collection_exists(db, col_name)

            if collection_exists:
                if ExportWritePolicy.FAIL == if_exists:
                    raise ValueError(
                        f'Collection \'{full_collection_name}\' already exists in database.'
                    )
                elif ExportWritePolicy.REPLACE == if_exists:
                    db[self.settings['colname']].delete_many({})

            data_export = json.loads(df.T.to_json()).values()
            collection = db[col_name]
            for data in data_export:
                collection.insert_one(data)
            
        if verbose:
            with self.printer.print_msg(
                f'Exporting data to \'{full_collection_name}\''
            ):
                __process()
        else:
            __process()

    def __collection_exists(self, db: database.Database, col_name: str) -> bool:
        """
        Returns whether the specified collection exists.

        Args:
            db (database.Database): The database the collection belongs to.
            col_name (str): Name of the collection to check existence of.

        Returns:
            bool: True if the collection exists, else False.
        """
        mongo_collection = db.list_collection_names()

        col_exists = bool([True for col in mongo_collection if col_name in col] or False)

        return col_exists

    def clean(self, column: Series, dtype: str) -> Series:
        """
        Cleans column in order to write data frame to MongoDB database

        Args:
            column (Series): Column to clean
            dtype (str): The pandas data types of this column

        Returns:
            Series: Cleaned column
        """
        if dtype == PandasTypes.CATEGORICAL:
            return column.astype(str)
        elif dtype in (PandasTypes.TIMEDELTA, PandasTypes.TIMEDELTA64, PandasTypes.PERIOD):
            return column.view(int)
        else:
            return column

    def get_type(self, column: Series, dtype: str) -> str:
        """
        Maps pandas Data Frame column to MongoDB type

        Args:
            series (Series): Column to map
            dtype (str): Pandas data type of this column

        Raises:
            ConversionError: Returned if this type cannot be converted to a MongoDB data type

        Returns:
            str: MongoDB data type for this column
        """
        if dtype in (
            PandasTypes.MIXED,
            PandasTypes.UNKNOWN_ARRAY,
            PandasTypes.COMPLEX,
        ):
            raise BadConversionError(
                f'Cannot convert column \'{column.name}\' with data type \'{dtype}\' to a MongoDB datatype.'
            )
        elif dtype in (PandasTypes.DATETIME, PandasTypes.DATETIME64):
            try:
                if column.dt.tz:
                    return 'timestamptz'
            except AttributeError:
                pass
            return 'timestamp'
        elif dtype == PandasTypes.TIME:
            try:
                if column.dt.tz:
                    return 'timetz'
            except AttributeError:
                pass
            return 'time'
        elif dtype == PandasTypes.DATE:
            return 'date'
        elif dtype == PandasTypes.STRING:
            return 'text'
        elif dtype == PandasTypes.CATEGORICAL:
            return 'text'
        elif dtype == PandasTypes.BYTES:
            return 'bytea'
        elif dtype in (PandasTypes.FLOATING, PandasTypes.DECIMAL, PandasTypes.MIXED_INTEGER_FLOAT):
            return 'double precision'
        elif dtype == PandasTypes.INTEGER:
            max_int, min_int = column.max(), column.min()
            if np.int16(max_int) == max_int and np.int16(min_int) == min_int:
                return 'smallint'
            elif np.int32(max_int) == max_int and np.int32(min_int) == min_int:
                return 'integer'
            else:
                return 'bigint'
        elif dtype == PandasTypes.BOOLEAN:
            return 'boolean'
        elif dtype in (PandasTypes.TIMEDELTA, PandasTypes.TIMEDELTA64, PandasTypes.PERIOD):
            return 'bigint'
        else:
            raise ValueError(f'Invalid datatype provided: {dtype}')

    @classmethod
    def with_config(cls, config: BaseConfigLoader) -> 'MongoDB':
        """
        Initializes MongoDB loader from configuration loader

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        return cls(
            dbname=config[ConfigKey.MONGODB_DBNAME],
            colname=config[ConfigKey.MONGODB_COLNAME],
            user=config[ConfigKey.MONGODB_USER],
            password=config[ConfigKey.MONGODB_PASSWORD],
            host=config[ConfigKey.MONGODB_HOST],
            port=config[ConfigKey.MONGODB_PORT],
        )   
    
    def sql_to_spec(self, query: str) -> None or dict:
        """
        Convert an SQL query to a mongo spec.
        This only supports select statements. For now.
        
        Args:
            query: String. A SQL query statement. str
                    
        Returns:
            str: None or a dictionary containing a mongo spec.
        """
        @debug_print
        def fix_token_list(in_list):
            """
            tokens as List is some times deaply nested and hard to deal with.
            Improve parser grouping remove this.
            """
            if isinstance(in_list, list) and len(in_list) == 1 and \
            isinstance(in_list[0], list):
                return fix_token_list(in_list[0])
            else:
                return [item for item in in_list]

        @debug_print
        def select_count_func(*args):
            tokens = args[2]
            return full_select_func(tokens, 'count')

        @debug_print
        def select_distinct_func(*args):
            tokens = args[2]
            return full_select_func(tokens, 'distinct')

        @debug_print
        def select_func(*args):
            tokens = args[2]
            return full_select_func(tokens, 'select')

        def full_select_func(tokens=None, method='select'):
            """
            Take tokens and return a dictionary.
            """
            action = {'distinct': 'distinct',
                    'count': 'count'
                    }.get(method, 'find')
            if tokens is None:
                return
            ret = {action: True, 'fields': {item: 1 for item in fix_token_list(tokens.asList())}}
            if ret['fields'].get('id'):  # Use _id and not id
                # Drop _id from fields since mongo always return _id
                del(ret['fields']['id'])
            else:
                ret['fields']['_id'] = 0
            if "*" in ret['fields'].keys():
                ret['fields'] = {}
                
            return ret

        @debug_print
        def where_func(*args):
            """
            Take tokens and return a dictionary.
            """
            tokens = args[2]
            if tokens is None:
                return
            tokens = fix_token_list(tokens.asList()) + [None, None, None]
            cond = {'!=': '$ne',
                    '>': '$gt',
                    '>=': '$gte',
                    '<': '$lt',
                    '<=': '$lte',
                    'like': '$regex'}.get(tokens[1])

            find_value = tokens[2].strip('"').strip("'")
            if cond == '$regex':
                if find_value[0] != '%':
                    find_value = "^" + find_value
                if find_value[-1] != '%':
                    find_value = find_value + "$"
                find_value = find_value.strip("%")

            if cond is None:
                expr = {tokens[0]: find_value}
            else:
                expr = {tokens[0]: {cond: find_value}}

            return expr

        @debug_print
        def combine(*args):
            tokens = args[2]
            if tokens:
                tokens = fix_token_list(tokens.asList())
                if len(tokens) == 1:
                    return tokens
                else:
                    return {'${}'.format(tokens[1]): [tokens[0], tokens[2]]}

        # TODO: Reduce list of imported functions.
        from pyparsing import (Word, alphas, CaselessKeyword, Group, Optional, ZeroOrMore,
                            Forward, Suppress, alphanums, OneOrMore, quotedString,
                            Combine, Keyword, Literal, replaceWith, oneOf, nums,
                            removeQuotes, QuotedString, Dict)

        LPAREN, RPAREN = map(Suppress, "()")
        EXPLAIN = CaselessKeyword('EXPLAIN'
                                ).setParseAction(lambda t: {'explain': True})
        SELECT = Suppress(CaselessKeyword('SELECT'))
        WHERE = Suppress(CaselessKeyword('WHERE'))
        FROM = Suppress(CaselessKeyword('FROM'))
        CONDITIONS = oneOf("= != < > <= >= like", caseless=True)
        #CONDITIONS = (Keyword("=") | Keyword("!=") |
        #              Keyword("<") | Keyword(">") |
        #              Keyword("<=") | Keyword(">="))
        AND = CaselessKeyword('and')
        OR = CaselessKeyword('or')

        word_match = Word(alphanums + "._") | quotedString
        number = Word(nums)
        statement = Group(word_match + CONDITIONS + word_match
                        ).setParseAction(where_func)
        
        select_fields = Group(SELECT + (word_match | Keyword("*")) +
                            ZeroOrMore(Suppress(",") +
                                        (word_match | Keyword("*")))
                            ).setParseAction(select_func)
        
        select_distinct = (SELECT + Suppress(CaselessKeyword('DISTINCT')) + LPAREN
                                + (word_match | Keyword("*"))
                                + ZeroOrMore(Suppress(",")
                                + (word_match | Keyword("*")))
                                + Suppress(RPAREN)).setParseAction(select_distinct_func)

        select_count = (SELECT + Suppress(CaselessKeyword('COUNT')) + LPAREN
                                + (word_match | Keyword("*"))
                                + ZeroOrMore(Suppress(",")
                                + (word_match | Keyword("*")))
                                + Suppress(RPAREN)).setParseAction(select_count_func)
        LIMIT = (Suppress(CaselessKeyword('LIMIT')) + word_match).setParseAction(lambda t: {'limit': t[0]})
        SKIP = (Suppress(CaselessKeyword('SKIP')) + word_match).setParseAction(lambda t: {'skip': t[0]})
        from_table = (FROM + word_match).setParseAction(
            lambda t: {'collection': t.asList()[0]})
        #word = ~(AND | OR) + word_match

        operation_term = (select_distinct | select_count | select_fields)   # place holder for other SQL statements. ALTER, UPDATE, INSERT
        expr = Forward()
        atom = statement | (LPAREN + expr + RPAREN)
        and_term = (OneOrMore(atom) + ZeroOrMore(AND + atom)
                    ).setParseAction(combine)
        or_term = (and_term + ZeroOrMore(OR + and_term)).setParseAction(combine)

        where_clause = (WHERE + or_term
                        ).setParseAction(lambda t: {'spec': t[0]})
        list_term = Optional(EXPLAIN) + operation_term + from_table + \
                    Optional(where_clause) + Optional(LIMIT) + Optional(SKIP)
        expr << list_term
        
        ret = expr.parseString(query.strip())
        
        query_dict = {}
        query_list = ret.asList()
        
        for extra in query_list:
            query_dict.update(extra)
        
        return query_dict
    
    def spec_str(self, spec):
        """
        Change a spec to the json object format used in mongo.
        eg. Print dict in python gives: {'a':'b'}
            mongo shell would do {a:'b'}
            Mongo shell can handle both formats but it looks more like the
            official docs to keep to their standard.
        
        Args:
            spec: Dictionary. A mongo spec.
        
        Returns:
            str: The spec as it is represended in the mongodb shell.
        """

        if spec is None:
            return "{}"
        if isinstance(spec, list):
            out_str = "[" + ', '.join([self.spec_str(x) for x in spec]) + "]"
        elif isinstance(spec, dict):
            out_str = "{" + ', '.join(["'{}':{}".format(x.replace("'", ""), self.spec_str(spec[x])
                                                    ) for x in sorted(spec)]) + "}"
        elif spec and isinstance(spec, str) and not spec.isdigit():
            out_str = "'" + spec + "'"
        else:
            out_str = spec

        return out_str

    @debug_print
    def create_mongo_shell_query(self, query_dict: dict):
        """
        Create the queries similar to what you will us in mongo shell
        
        Args:
            query_dict: Dictionary. Internal data structure. dict
            
        Returns:
            str: The query that you can use in mongo shell.
        """
        collection = query_dict.get('collection')
        
        if not collection:
            return
        shell_query = "db." + collection + "."

        if query_dict.get('find'):
            shell_query += 'find({}, {})'.format(self.spec_str(query_dict.get('spec')),
                                                self.spec_str(query_dict.get('fields')))
        elif query_dict.get('distinct'):
            shell_query += 'distinct({})'.format(self.spec_str(",".join(
                [k for k in query_dict.get('fields').keys() if query_dict['fields'][k]])))
        elif query_dict.get('count'):
            shell_query += 'count({})'.format(self.spec_str(query_dict.get('spec')))
        if query_dict.get('skip'):
            shell_query += ".skip({})".format(query_dict.get('skip'))

        if query_dict.get('limit'):
            shell_query += ".limit({})".format(query_dict.get('limit'))

        if query_dict.get('explain'):
            shell_query += ".explain()"

        return shell_query

