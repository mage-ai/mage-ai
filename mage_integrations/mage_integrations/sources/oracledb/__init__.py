from datetime import datetime
from mage_integrations.connections.oracledb import (
    OracleDB as OracleDBConnection
)
from mage_integrations.sources.base import main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    REPLICATION_METHOD_FULL_TABLE,
)
from mage_integrations.sources.sql.base import Source
from mage_integrations.utils.schema_helpers import (
    extract_selected_columns,
)
from singer.schema import Schema
from singer import metadata
from typing import Dict, Generator, List
import collections
import itertools

Column = collections.namedtuple('Column', [
    "table_schema",
    "table_name",
    "column_name",
    "data_type",
    "data_length",
    "char_length",
    "character_used",
    "numeric_precision",
    "numeric_scale"
])

STRING_TYPES = set([
    'char',
    'nchar',
    'varchar',
    'varchar2',
    'nvarchar2',
])

FLOAT_TYPES = set([
   'binary_float',
   'binary_double'
])


class OracleDB(Source):
    @property
    def host(self) -> str:
        return self.config['host']

    @property
    def port(self) -> str:
        return self.config['port']

    @property
    def service(self) -> str:
        return self.config['service']

    @property
    def user(self) -> str:
        return self.config['user']

    @property
    def password(self) -> str:
        return self.config['password']

    def nullable_column(self, col_name, col_type, pks_for_table):
        if col_name in pks_for_table:
            return [col_type]
        else:
            return ['null', col_type]

    def get_database_name(self, connection):
        cur = connection.cursor()
        rows = cur.execute("SELECT name FROM v$database").fetchall()
        return rows[0][0]

    def produce_column_metadata(
            self, connection, table_info, table_schema, table_name, pk_constraints, column_schemas, cols):
        mdata = {}

        table_pks = pk_constraints.get(table_schema, {}).get(table_name, [])

        # NB> sadly, some system tables like XDB$STATS have P constraints
        # for columns that do not exist so we must protect against this
        table_pks = list(filter(
            lambda pk: column_schemas.get(pk, Schema(None)).type is not None, table_pks))

        database_name = self.get_database_name(connection)

        metadata.write(mdata, (), 'table-key-properties', table_pks)
        metadata.write(mdata, (), 'schema-name', table_schema)
        metadata.write(mdata, (), 'database-name', database_name)

        if table_schema in table_info and table_name in table_info[table_schema]:
            metadata.write(mdata, (), 'is-view', table_info[table_schema][table_name]['is_view'])

            row_count = table_info[table_schema][table_name].get('row_count')

            if row_count is not None:
                metadata.write(mdata, (), 'row-count', row_count)

        for c in cols:
            c_name = c.column_name
            # Write the data_type or "None" when the column has no datatype
            metadata.write(mdata, ('properties', c_name), 'sql-datatype', (c.data_type or "None"))
            if column_schemas[c_name].type is None:
                mdata = metadata.write(mdata, ('properties', c_name), 'inclusion', 'unsupported')
                mdata = metadata.write(mdata, ('properties', c_name), 'selected-by-default', False)
            elif c_name in pk_constraints.get(table_schema, {}).get(table_name, []):
                mdata = metadata.write(mdata, ('properties', c_name), 'inclusion', 'automatic')
                mdata = metadata.write(mdata, ('properties', c_name), 'selected-by-default', True)
            else:
                mdata = metadata.write(mdata, ('properties', c_name), 'inclusion', 'available')
                mdata = metadata.write(mdata, ('properties', c_name), 'selected-by-default', True)

        return mdata

    def schema_for_column(self, c, pks_for_table):
        # Return Schema(None) to avoid calling lower() on a column with no datatype
        if c.data_type is None:
            self.logger.info(f"Skipping column {c.column_name} since it had no datatype")
            return Schema(None)

        data_type = c.data_type.lower()
        result = Schema()

        # Scale of None indicates default of 6 digits
        numeric_scale = c.numeric_scale

        if data_type == 'number' and numeric_scale is not None and numeric_scale <= 0:
            result.type = self.nullable_column(c.column_name, 'integer', pks_for_table)

            return result

        elif data_type == 'number':
            # NB: Due to scale and precision variations in Oracle version, and
            #     among numeric types, we're using a custom `singer.decimal` string
            #     formatter for this, with no opinion on scale/precision.
            result.type = self.nullable_column(c.column_name, 'string', pks_for_table)
            result.format = 'singer.decimal'

            return result

        elif data_type == 'date' or data_type.startswith("timestamp"):
            result.type = self.nullable_column(c.column_name, 'string', pks_for_table)

            result.format = 'date-time'
            return result

        elif data_type in FLOAT_TYPES:
            result.type = self.nullable_column(c.column_name, 'number', pks_for_table)
            return result

        elif data_type in STRING_TYPES:
            character_used = c.character_used
            result.type = self.nullable_column(c.column_name, 'string', pks_for_table)

            if character_used == 'C':
                result.maxLength = c.char_length
            return result

        # these column types are insane. they are NOT actually ieee754 floats
        # instead they are represented as decimals, but despite this
        # it appears we can say nothing about their max or min

        # "float", "double_precision", "real"
        elif data_type in ['float', 'double_precision']:
            result.type = self.nullable_column(c.column_name, 'string', pks_for_table)
            result.format = 'singer.decimal'
            return result

        return Schema(None)

    def produce_pk_constraints(self, conn, current_user):
        cur = conn.cursor()
        pk_constraints = {}

        sql = """
        SELECT cols.owner, cols.table_name, cols.column_name
        FROM all_constraints cons, all_cons_columns cols
        WHERE cons.constraint_type = 'P'
        AND cons.constraint_name = cols.constraint_name
        AND cons.owner = cols.owner
        AND cols.owner != 'SYS'
        """

        for schema, table_name, column_name in cur.execute(sql):
            if pk_constraints.get(schema) is None:
                pk_constraints[schema] = {}

            if pk_constraints[schema].get(table_name) is None:
                pk_constraints[schema][table_name] = [column_name]
            else:
                pk_constraints[schema][table_name].append(column_name)

        cur.close()
        return pk_constraints

    def discover_columns(self, connection, table_info, current_user):
        cursor = connection.cursor()
        sql = f"""
      SELECT '{current_user}' AS owner,
             TABLE_NAME, COLUMN_NAME,
             DATA_TYPE, DATA_LENGTH,
             CHAR_LENGTH, CHAR_USED,
             DATA_PRECISION, DATA_SCALE
        FROM user_tab_columns
       ORDER BY owner, table_name, column_name
      """
        cursor.execute(sql)
        columns = []
        rec = cursor.fetchone()
        while rec is not None:
            columns.append(Column(*rec))
            rec = cursor.fetchone()

        pk_constraints = self.produce_pk_constraints(connection, current_user)
        entries = []
        for (k, cols) in itertools.groupby(columns, lambda c: (c.table_schema, c.table_name)):
            cols = list(cols)
            (table_schema, table_name) = k
            pks_for_table = pk_constraints.get(table_schema, {}).get(table_name, [])

            column_schemas = {
                c.column_name: self.schema_for_column(c, pks_for_table) for c in cols}
            schema = Schema(type='object', properties=column_schemas)

            md = self.produce_column_metadata(
                connection, table_info, table_schema, table_name,
                pk_constraints, column_schemas, cols)

            entry = CatalogEntry(
                table=table_name,
                key_properties=pk_constraints,
                stream=table_name,
                replication_method=REPLICATION_METHOD_FULL_TABLE,
                metadata=metadata.to_list(md),
                tap_stream_id=table_name,
                schema=schema)

            entries.append(entry)
        cursor.close()
        return entries

    def _limit_query_string(self, limit, offset):
        return f'OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY'

    def discover_streams(self) -> List[Dict]:
        connection = self.build_connection().build_connection()
        cursor = connection.cursor()

        all_tables_sql = "SELECT table_name FROM user_tables"
        table_list = []
        for row in cursor.execute(all_tables_sql):
            table = row[0]
            table_list.append(dict(
                stream=table,
                tap_stream_id=table,
            ))

        cursor.close()
        connection.close()
        return table_list

    def discover_stream(self, connection, table_name):
        '''
        Read a single table in OracleDB.
        '''
        cursor = connection.cursor()
        current_user_sql = "select user from dual"
        for row in cursor.execute(current_user_sql):
            current_user = row[0]
            break

        table_info = {}
        table_info[current_user] = {}
        table_info[current_user][table_name] = {
            'is_view': False
        }
        catalog_entries = self.discover_columns(connection, table_info, current_user)
        return catalog_entries

    def discover(self, streams: List[str] = None) -> Catalog:
        '''
        Read streams in OracleDB.
        '''
        connection = self.build_connection().build_connection()
        outputs = []
        if streams:
            # Check if streams available
            for stream in streams:
                catalog_entries = self.discover_stream(connection, stream)
                if catalog_entries is not None and catalog_entries:
                    outputs.extend(catalog_entries)
                
        connection.close()
        return Catalog(outputs)

    def build_connection(self) -> OracleDBConnection:
        return OracleDBConnection(
            self.host, self.password, self.user, self.port, self.service)

    def test_connection(self):
        conn = self.build_connection().build_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""SELECT name FROM v$database""")
        except Exception as exc:
            self.logger.info(f"test_connection exception: {exc}")
            raise exc
        return


if __name__ == '__main__':
    main(OracleDB)
