import json
from typing import Dict, List, Tuple

from mage_integrations.connections.teradata import Teradata as TeradataConnection
from mage_integrations.destinations.constants import (
    COLUMN_TYPE_OBJECT,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.sql.utils import build_insert_columns
from mage_integrations.destinations.sql.utils import (
    column_type_mapping as column_type_mapping_orig,
)
from mage_integrations.destinations.sql.utils import convert_column_type
from mage_integrations.destinations.teradata.utils import (
    build_alter_table_command,
    build_create_table_command,
    clean_column_name,
)


class Teradata(Destination):
    @property
    def skip_schema_creation(self) -> bool:
        return True

    @property
    def quote(self) -> str:
        return '"'

    @property
    def use_lowercase(self) -> bool:
        return False

    def build_connection(self) -> TeradataConnection:
        return TeradataConnection(
            database=self.config['database'],
            host=self.config['host'],
            password=self.config['password'],
            port=self.config.get('port'),
            username=self.config['username'],
        )

    def build_create_table_commands(
        self,
        schema: Dict,
        schema_name: str,
        stream: str,
        table_name: str,
        database_name: str = None,
        unique_constraints: List[str] = None,
    ) -> List[str]:
        return [
            build_create_table_command(
                column_type_mapping=self.column_type_mapping(schema),
                columns=schema['properties'].keys(),
                full_table_name=self.full_table_name(database_name, table_name),
                key_properties=self.key_properties.get(stream),
                unique_constraints=unique_constraints,
                use_lowercase=self.use_lowercase,
            ),
        ]

    def build_alter_table_commands(
        self,
        schema: Dict,
        schema_name: str,
        stream: str,
        table_name: str,
        database_name: str = None,
        unique_constraints: List[str] = None,
    ) -> List[str]:
        results = self.build_connection().load(f"""
SELECT
    ColumnName
    , ColumnType
FROM DBC.ColumnsV
WHERE TableName = '{table_name}' AND DatabaseName = '{database_name}'
        """)
        current_columns = [r[0].lower() if self.use_lowercase else r[0] for r in results]
        schema_columns = schema['properties'].keys()
        new_columns = [c for c in schema_columns
                       if self.clean_column_name(c) not in current_columns]

        if not new_columns:
            return []

        # TODO: Support alter column types
        return [
            build_alter_table_command(
                column_type_mapping=self.column_type_mapping(schema),
                columns=new_columns,
                full_table_name=f'{database_name}.{table_name}',
                use_lowercase=self.use_lowercase,
            ),
        ]

    def build_merge_stage_command(
        self,
        columns: List[str],
        target_table_name: str,
        source_table_name: str,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
    ) -> str:
        unique_constraints = unique_constraints or []
        unique_constraints_clean = [
            f'{self.clean_column_name(col)}'
            for col in unique_constraints
        ]
        update_columns_cleaned = [
            self._wrap_with_quotes(self.clean_column_name(col))
            for col in columns if col not in unique_constraints
        ]
        columns_cleaned = [
            self._wrap_with_quotes(self.clean_column_name(col))
            for col in columns
        ]

        condition_list = []

        for col in unique_constraints_clean:
            condition_list.append(f'{target_table_name}.{col} = {source_table_name}.{col}')

        conditions = ' AND '.join(condition_list)

        merge_commands = [f"""
            MERGE INTO {target_table_name} USING {source_table_name}
            ON ({conditions})
        """]

        if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
            set_command = ', '.join(
                [f'{col} = {source_table_name}.{col}' for col in update_columns_cleaned],
            )
            merge_commands.append(f'WHEN MATCHED THEN UPDATE SET {set_command}')

        insert_columns = ', '.join(columns_cleaned)
        merge_values = f"({', '.join([f'{source_table_name}.{col}' for col in columns_cleaned])})"
        merge_commands.append(
            f"WHEN NOT MATCHED THEN INSERT ({insert_columns}) VALUES {merge_values}",
        )
        merge_command = '\n'.join(merge_commands)
        return merge_command

    def process_queries(
        self,
        query_strings: List[str],
        record_data: List[Dict],
        stream: str,
        tags: Dict = None,
        **kwargs,
    ) -> List[List[Tuple]]:
        """
        Process and load data into Teradata using batch or default SQL insertion.

        Args:
            query_strings (List[str]): List of SQL query strings for pre-processing.
            record_data (List[Dict]): List of dictionaries containing record data.
            stream (str): The name of the data stream.
            tags (Dict, optional): Dictionary of additional tags for the operation.
            **kwargs: Additional keyword arguments.

        Returns:
            List[List[Tuple]]: A list containing results of executed queries.

        Note:

            - Make sure the `unique_constraints` and `unique_conflict_methods` are properly
              configured for batch load.
        """
        results = []

        unique_constraints = self.unique_constraints.get(stream)
        unique_conflict_method = self.unique_conflict_methods.get(stream)
        self.logger.info(f'Batch upload unique_constraints: {unique_constraints}')
        self.logger.info(f'Batch upload unique_conflict_method: {unique_conflict_method}')

        # Execute the query_strings before inserting the data, i.e., passed-in
        # query_strings including create table command or alter table command
        if query_strings and len(query_strings) > 0:
            self.logger.info(f'Executing query_strings: {query_strings}')
            results += self.build_connection().execute(query_strings, commit=True)
        else:
            self.logger.info(f'Skip executing empty query_strings: {query_strings}')

        records = [d['record'] for d in record_data]

        self.logger.info(f'Batch upload to Teradata: {len(records)} rows.')

        if not records:
            return

        database = self.config.get(self.DATABASE_CONFIG_KEY)
        table = self.config.get(self.TABLE_CONFIG_KEY)
        full_table_name = self.full_table_name(database, table)
        columns = list(records[0].keys())
        insert_columns = build_insert_columns(
            columns,
            column_identifier=self.quote,
            use_lowercase=self.use_lowercase,
            allow_reserved_words=self.allow_reserved_words,
        )

        if unique_constraints and unique_conflict_method:
            full_table_name_temp = self.full_table_name(database, table, prefix='temp_')
            drop_temp_table_command = [f'DROP TABLE {full_table_name_temp}']

            create_temp_table_command = \
                [f'CREATE VOLATILE TABLE {full_table_name_temp} AS '
                 f'(SELECT * FROM {full_table_name}) WITH NO DATA;']
            # Run commands in one Teradata session to leverage TEMP table
            teradata_connection = self.build_connection()
            connection = teradata_connection.build_connection()
            try:
                results += teradata_connection.execute(
                    drop_temp_table_command,
                    commit=False,
                    connection=connection,
                    log_exception=False,
                )
            except Exception:
                self.logger.info(f"Table {full_table_name_temp} doesn't exist")

            results += teradata_connection.execute(
                create_temp_table_command,
                commit=False,
                connection=connection,
            )

            self.write_records_to_table(
                records,
                full_table_name_temp,
                insert_columns,
                connection=connection,
            )
            self.logger.info(
                f'write_dataframe_to_table completed to: {full_table_name_temp}')

            merge_command = [self.build_merge_stage_command(
                columns,
                full_table_name,
                full_table_name_temp,
                unique_conflict_method=unique_conflict_method,
                unique_constraints=unique_constraints,
            )]

            self.logger.info(f'Merging {full_table_name_temp} into {full_table_name}')
            self.logger.info(f'Dropping temporary table: {full_table_name_temp}')
            results += teradata_connection.execute(
                merge_command + drop_temp_table_command,
                commit=True,
                connection=connection,
            )
            # Close connection after finishing running all commands
            teradata_connection.close_connection(connection)
            self.logger.info(f'Merged and dropped temporary table: {full_table_name_temp}')
        else:
            teradata_connection = self.build_connection()
            connection = teradata_connection.build_connection()
            results += self.write_records_to_table(records, full_table_name, insert_columns)
            teradata_connection.close_connection(connection)
            self.logger.info(f'write_dataframe_to_table completed to {full_table_name}')

        return results

    def write_records_to_table(
        self,
        records: List[Dict],
        full_table_name: str,
        insert_columns: List[str],
        connection=None,
    ):
        if not records:
            return
        new_connection_created = False
        teradata_connection = None
        if connection is None:
            teradata_connection = self.build_connection()
            connection = teradata_connection.build_connection()
            new_connection_created = True

        record_values = [list(r.values()) for r in records]
        column_length = len(records[0])
        value_placeholder = ','.join(['?'] * column_length)
        insert_columns_str = ','.join(insert_columns)
        with connection.cursor() as cursor:
            cursor.execute(f'INSERT INTO {full_table_name} ({insert_columns_str}) '
                           f'VALUES ({value_placeholder})', record_values)
        if new_connection_created and teradata_connection is not None:
            teradata_connection.close_connection(connection)
        num_rows = len(records)
        return [[(num_rows, num_rows)]]

    def clean_column_name(self, column_name: str):
        return clean_column_name(column_name, lower_case=self.use_lowercase)

    def column_type_mapping(self, schema: Dict) -> Dict:
        return column_type_mapping_orig(
            schema,
            convert_column_type,
            lambda item_type_converted: 'VARCHAR',
        )

    def convert_array(self, value: str, column_type_dict: Dict) -> str:
        return json.dumps(value)

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        connection = self.build_connection()
        data = connection.load('\n'.join([
            'SELECT TOP 1 TableName FROM DBC.TablesV',
            f'WHERE DatabaseName = \'{database_name}\' AND TableName = \'{table_name}\'',
        ]))

        return len(data) >= 1

    def calculate_records_inserted_and_updated(
        self,
        data: List[List[Tuple]],
        unique_constraints: List[str] = None,
        unique_conflict_method: str = None,
    ) -> Tuple:
        records_inserted = 0
        for array_of_tuples in data:
            for t in array_of_tuples:
                if len(t) >= 1 and type(t[0]) is int:
                    records_inserted += t[0]

        return records_inserted, 0

    def full_table_name(self, daabase_name: str, table_name: str, prefix: str = '') -> str:
        return f'{daabase_name}.{prefix}{table_name}'

    def string_parse_func(self, value: str, column_type_dict: Dict) -> str:
        if COLUMN_TYPE_OBJECT == column_type_dict['type']:
            return value.replace("'", "''")

        return value


if __name__ == '__main__':
    main(Teradata)
