from datetime import datetime
from lark import Lark, Transformer
from mage_ai.data_cleaner.transformer_actions.query.grammar import GRAMMAR
from pandas import DataFrame
from typing import List
import logging
import numpy as np
import re

GRAMMAR_FP = './sqlgrammar.lark'


logger = logging.getLogger(__name__)


class Query:
    def __init__(self, df: DataFrame) -> None:
        """
        Constructs a query to operate on the given dataframe

        Args:
            df (DataFrame): Data frame to execute the given query on
            ctypes (Dict[ColumnType, str]): Column types for each column in the data frame.
        """
        self.df = df
        self.columns = list(df.columns)

    def execute(self) -> DataFrame:
        """
        Executes the query on the data frame

        Returns:
            DataFrame: Returns the dataframe after being transformed by the query
        """
        raise NotImplementedError('Children of Query must override this method')


class SelectQuery(Query):
    """
    Constructs a select query to execute on the given dataframe.
    """

    def __init__(
        self,
        df: DataFrame,
        selection_columns: List[str],
        condition: str,
    ) -> None:
        super().__init__(df)
        self.selection_columns = selection_columns
        self.condition = condition

    def execute(self) -> DataFrame:
        logger.debug(f'Executing query: SELECT {self.columns} FROM df WHERE {self.condition}')
        view = self.df
        if self.condition:
            view = view.query(self.condition)
        view = view[self.selection_columns]
        return view


class QueryTransformer(Transformer):
    """
    Generates a query object by traversing the parse tree associated with a query.
    """

    def __init__(self, df: DataFrame):
        self.columns = list(df.columns)
        self.column_set = set(self.columns)
        self.df = df
        self.dtype_cache = {}

    def query(self, items):
        return items[0]

    def select(self, items):
        columns, _, condition = items
        query = SelectQuery(self.df, columns, condition)
        return query

    def literal(self, items):
        return items[0]

    def column_type(self, items):
        return items[0].value

    def datetime(self, items):
        return f'datetime.fromisoformat({items[0]})'

    def column(self, items):
        return [item.strip('\"\'') for item in items]

    def negation(self, items):
        return f'~({items[1]})'

    def binop(self, items):
        expr1, op, expr2 = items
        if expr1.strip('\"\'') in self.column_set:
            expr1 = self.__escape_column_name(expr1)
        if expr2.strip('\"\'') in self.column_set:
            expr2 = self.__escape_column_name(expr2)
        return f'{expr1} {op} {expr2}'

    def parens(self, items):
        return f'({",".join(items[1:-1])})'

    def null_expr(self, items):
        column, condition = items
        column = self.__escape_column_name(column)
        return self.build_null_expr(column, condition)

    def build_null_expr(self, column, condition):
        dtype = self.__get_exact_dtype(column)
        string_condition = f'{column}.{condition}()'
        if dtype is str:
            if condition == 'isna':
                string_condition = f'({string_condition} or {column}.str.len() == 0)'
            else:
                string_condition = f'({string_condition} and {column}.str.len() >= 1)'
        elif np.issubdtype(dtype, np.bool_):
            if condition == 'isna':
                string_condition = f'({string_condition} or {column} == \'\')'
            else:
                string_condition = f'({string_condition} and {column} != \'\')'
        return string_condition

    def null_check(self, items):
        if type(items) is str:
            return items
        else:
            return "notna"

    def is_expr(self, items):
        column, negation, value = items
        column = self.__escape_column_name(column)
        if value.lower() == 'null':
            if negation:
                cond = 'notna'
            else:
                cond = 'isna'
            return self.build_null_expr(column, cond)
        else:
            return f'{column} {"!" if negation else "="}= {value}'

    def between_expr(self, items):
        column, negation, lb, ub = items
        column = self.__escape_column_name(column)
        return f'{"~" if negation else ""}({column} >= {lb} and {column} <= {ub})'

    def in_expr(self, items):
        column, negation, values = items
        column = self.__escape_column_name(column)
        if ',' not in values:
            values = values[:-1] + ',' + values[-1]
        return f'{"~" if negation else ""}{column}.isin({values})'

    def like_expr(self, items):
        # TODO: Perform check for column being string type
        column, negation, expr = items
        column = self.__escape_column_name(column)
        value = expr.value.strip('\"\'')
        value = re.escape(value)
        value = value.replace('_', '.')
        value = value.replace('%', '.*')
        value = f'"{value}"'
        return f'{"~" if negation else ""}{column}.str.fullmatch({value}, na=False)'

    def literal_set(self, items):
        print(items)
        return '(' + ','.join(items) + ')'

    def expr(self, items):
        return ' '.join(items)

    def __get_exact_dtype(self, column):
        dtype = self.dtype_cache.get(column, None)
        if dtype is None:
            series = self.df[column.strip('\"\'`')]
            dropped_series = series.dropna()
            dropped_series = dropped_series[~(dropped_series == '')]
            dtype = type(dropped_series.iloc[0]) if len(dropped_series) else None
            self.dtype_cache[column] = dtype
        return dtype

    def __escape_column_name(self, value):
        if value[0] in '\'\"' and value[-1] in '\'\"':
            value = value.strip('\"\'')
            value = f'`{value}`'
        return value

    notkw = lambda self, _: 'not'
    true = lambda self, _: 'true'
    false = lambda self, _: 'false'
    le = lambda self, _: '<'
    ge = lambda self, _: '>'
    leq = lambda self, _: '<='
    geq = lambda self, _: '>='
    eq = lambda self, _: '=='
    neq = lambda self, _: '!='
    lpar = lambda self, _: '('
    rpar = lambda self, _: ')'
    isna = lambda self, _: 'isna'
    notna = lambda self, _: 'notna'
    and_ct = lambda self, _: 'and'
    or_ct = lambda self, _: 'or'
    null = lambda self, _: 'null'
    all = lambda self, _: self.columns
    dtnow = lambda self, _: datetime.now()


class QueryGenerator:
    """
    Generates a query to be executed on the given dataframe
    """

    def __init__(self, df: DataFrame, grammar: str = GRAMMAR) -> None:
        """
        Initializes the query generator

        Args:
            df (DataFrame): Data frame to generate queries for.
            grammar (str, optional): Grammar to use to parse this query. Defaults to GRAMMAR.
        """
        transformer = QueryTransformer(df)
        self.parser = Lark(grammar, start='query', parser='lalr', transformer=transformer)

    def __call__(self, query: str) -> Query:
        """
        Generates a query object from the given query string

        Args:
            query (str): String to generate query from

        Returns:
            Query: Query object corresponding to the query string
        """
        return self.parser.parse(query)
