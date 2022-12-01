from google.cloud import bigquery
from google.cloud.bigquery import Client, dbapi
from google.oauth2 import service_account
from mage_integrations.connections.bigquery import BigQuery as BigQueryConnection
from mage_integrations.destinations.bigquery.constants import (
    MAX_QUERY_PARAMETERS,
    MAX_QUERY_PARAMETERS_SIZE,
    MAX_QUERY_STRING_SIZE,
    QUERY_JOB_MAX_TIMEOUT_SECONDS,
)
from mage_integrations.destinations.bigquery.utils import (
    convert_array,
    convert_column_to_type,
    convert_column_type,
    convert_converted_type_to_parameter_type,
    convert_datetime,
    convert_json_or_string,
)
from mage_integrations.destinations.constants import KEY_VALUE, UNIQUE_CONFLICT_METHOD_UPDATE
from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.sql.utils import (
    build_alter_table_command,
    build_create_table_command,
    build_insert_command,
    column_type_mapping,
)
from mage_integrations.destinations.utils import clean_column_name
from mage_integrations.utils.dictionary import merge_dict
from typing import Any, Dict, List, Tuple
import sys
import uuid


class BigQuery(Destination):
    DATABASE_CONFIG_KEY = 'project_id'
    SCHEMA_CONFIG_KEY = 'dataset'

    BATCH_SIZE = 500

    def build_connection(self) -> BigQueryConnection:
        return BigQueryConnection(
            path_to_credentials_json_file=self.config['path_to_credentials_json_file'],
        )

    def build_create_table_commands(
        self,
        schema: Dict,
        schema_name: str,
        stream: str,
        table_name: str,
        database_name: str = None,
        unique_constraints: List[str] = None,
        create_temporary_table: bool = False,
    ) -> List[str]:
        type_mapping = column_type_mapping(
            schema,
            convert_column_type,
            lambda item_type_converted: f'ARRAY<{item_type_converted}>',
            number_type='FLOAT64',
            string_type='STRING',
        )

        if create_temporary_table:
            full_table_name = table_name
        else:
            full_table_name = f'{schema_name}.{table_name}'

        create_table_command = \
            build_create_table_command(
                column_type_mapping=type_mapping,
                columns=schema['properties'].keys(),
                full_table_name=full_table_name,
                # BigQuery doesn't support unique constraints
                unique_constraints=None,
                create_temporary_table=create_temporary_table,
            )

        stream_partition_keys = self.partition_keys.get(stream, [])
        if len(stream_partition_keys) > 0 and not create_temporary_table:
            partition_col = stream_partition_keys[0]
            create_table_command = f'''
{create_table_command}
PARTITION BY
  DATE({partition_col})
            '''

        return [
            create_table_command,
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
    column_name
    , data_type
FROM {schema_name}.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = '{table_name}'
        """)
        current_columns = [r[0].lower() for r in results]
        schema_columns = schema['properties'].keys()
        new_columns = [c for c in schema_columns if clean_column_name(c) not in current_columns]

        if not new_columns:
            return []

        # TODO: Support alter column types
        return [
            build_alter_table_command(
                column_type_mapping=column_type_mapping(
                    schema,
                    convert_column_type,
                    lambda item_type_converted: f'ARRAY<{item_type_converted}>',
                    number_type='FLOAT64',
                    string_type='STRING',
                ),
                columns=new_columns,
                full_table_name=f'{schema_name}.{table_name}',
            ),
        ]

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        data = self.build_connection().execute([f"""
SELECT 1
FROM `{database_name}.{schema_name}.__TABLES_SUMMARY__`
WHERE table_id = '{table_name}'
"""])
        return len(data[0]) >= 1

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

    def handle_insert_commands(
        self,
        record_data: List[Dict],
        stream: str,
        tags: Dict = {},
    ) -> List[str]:
        return []

    def process_queries(
        self,
        query_strings: List[str],
        record_data: List[Dict],
        stream: str,
    ) -> List[List[Tuple]]:
        connection = self.build_connection()

        try:
            connection.execute(query_strings, commit=True)

            credentials = service_account.Credentials.from_service_account_file(
                self.config['path_to_credentials_json_file'],
            )
            client = Client(credentials=credentials)

            job = client.query(
                'SELECT 1',
                job_config=bigquery.QueryJobConfig(create_session=True),
            )
            session_id = job.session_info.session_id
            job.result()

            session_id_property = bigquery.query.ConnectionProperty(key='session_id', value=session_id)
            query_job_config = dict(
                create_session=False,
                connection_properties=[session_id_property],
            )

            job = client.query(
                'BEGIN TRANSACTION',
                job_config=bigquery.QueryJobConfig(**query_job_config),
            )
            job.result()

            results, jobs = self.__insert(client, record_data, stream, query_job_config=query_job_config)

            job = client.query(
                'COMMIT TRANSACTION',
                job_config=bigquery.QueryJobConfig(**query_job_config),
            )
            job.result()

            for job in jobs:
                if job.num_dml_affected_rows:
                    self.records_affected += job.num_dml_affected_rows

            return results
        except Exception as err:
            database_name = self.config.get(self.DATABASE_CONFIG_KEY)
            schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
            table_name = self.config.get('table')

            if self.attempted_create_table:
                connection.execute([
                    f'DROP TABLE {database_name}.{schema_name}.{table_name}',
                ], commit=True)
                self.process_state(
                    row={
                        KEY_VALUE: dict(bookmarks={}),
                    },
                    tags=dict(
                        database_name=database_name,
                        schema_name=schema_name,
                        stream=stream,
                        table_name=table_name,
                    ),
                )

            raise err

    def __insert(
        self,
        client,
        record_data: List[Dict],
        stream: str,
        query_job_config: Dict = {},
    ) -> Tuple[List[List[Tuple]], List[Any]]:
        records = [d['record'] for d in record_data]

        database_name = self.config.get(self.DATABASE_CONFIG_KEY)
        schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
        table_name = self.config.get('table')

        schema = self.schemas[stream]
        unique_constraints = self.unique_constraints.get(stream)
        unique_conflict_method = self.unique_conflict_methods.get(stream)

        full_table_name = f'{database_name}.{schema_name}.{table_name}'

        columns = list(schema['properties'].keys())
        mapping = column_type_mapping(
            schema,
            convert_column_type,
            lambda item_type_converted: 'ARRAY',
            number_type='FLOAT64',
            string_type='STRING',
        )
        insert_columns, insert_values = build_insert_command(
            column_type_mapping=mapping,
            columns=columns,
            convert_array_func=convert_array,
            convert_column_to_type_func=convert_column_to_type,
            convert_datetime_func=convert_datetime,
            records=records,
            string_parse_func=convert_json_or_string,
            stringify_values=False,
            convert_column_types=False,
        )
        insert_columns = ', '.join(insert_columns)

        tags = dict(
            database_name=database_name,
            records=len(record_data),
            schema_name=schema_name,
            stream=stream,
            table_name=table_name,
        )

        if unique_constraints and unique_conflict_method:
            temp_table_name = f'{table_name}_{uuid.uuid4().hex}'

            commands = self.build_create_table_commands(
                schema=schema,
                schema_name=schema_name,
                stream=None,
                table_name=temp_table_name,
                database_name=database_name,
                unique_constraints=unique_constraints,
                create_temporary_table=True,
            )

            jobs = []
            for query in commands:
                job = client.query(
                    query,
                    job_config=bigquery.QueryJobConfig(**query_job_config),
                )
                job.result()

            job_results, jobs_from_insert = self.__insert_with_limits(
                client=client,
                columns=columns,
                full_table_name=temp_table_name,
                insert_columns=insert_columns,
                insert_values=insert_values,
                mapping=mapping,
                count_rows=False,
                query_job_config=query_job_config,
                tags=tags,
            )

            unique_constraints = [clean_column_name(col) for col in unique_constraints]
            columns_cleaned = [clean_column_name(col) for col in columns]

            merge_commands = [
                f'MERGE INTO {full_table_name} AS a',
                f'USING (SELECT * FROM {temp_table_name}) AS b',
                f"ON {' AND '.join([f'a.{col} = b.{col}' for col in unique_constraints])}",
            ]

            if UNIQUE_CONFLICT_METHOD_UPDATE == unique_conflict_method:
                set_command = ', '.join(
                    [f'a.{col} = b.{col}' for col in columns_cleaned],
                )
                merge_commands.append(f'WHEN MATCHED THEN UPDATE SET {set_command}')

            merge_values = f"({', '.join([f'b.{col}' for col in columns_cleaned])})"
            merge_commands.append(
                f'WHEN NOT MATCHED THEN INSERT ({insert_columns}) VALUES {merge_values}',
            )
            merge_command = '\n'.join(merge_commands)

            job = client.query(
                merge_command,
                job_config=bigquery.QueryJobConfig(**query_job_config),
            )
            jobs.append(job)
            job.result()
        else:
            job_results, jobs = self.__insert_with_limits(
                client=client,
                columns=columns,
                full_table_name=full_table_name,
                insert_columns=insert_columns,
                insert_values=insert_values,
                mapping=mapping,
                count_rows=True,
                query_job_config=query_job_config,
                tags=tags,
            )

        return [[row.values() for row in row_iterator] for row_iterator in job_results], jobs

    def __insert_with_limits(
        self,
        client: Any,
        columns: List[str],
        full_table_name: str,
        insert_columns: str,
        insert_values: List[Any],
        mapping: Dict,
        count_rows: bool = True,
        query_job_config: Dict = {},
        tags: Dict = {},
    ) -> Tuple[List[Any], List[Any]]:
        jobs = []
        job_results = []

        while len(insert_values) >= 1:
            query_payload_size = 0
            query_parameters = []

            row_values = []
            row_idx = -1

            while query_payload_size < (MAX_QUERY_PARAMETERS_SIZE * 0.75) and \
                len(query_parameters) < (MAX_QUERY_PARAMETERS * 0.75) and \
                row_idx + 1 < len(insert_values):

                row_idx += 1

                values_for_row = insert_values[row_idx]
                arr = []
                for col_idx, column in enumerate(columns):
                    type_converted = mapping[column]['type_converted']
                    value = values_for_row[col_idx]

                    if type_converted in [
                        'ARRAY',
                        'BOOLEAN',
                        'DATETIME',
                        'JSON',
                        'TEXT',
                    ]:
                        arr.append(value)
                    else:
                        variable_name = f'r{row_idx}_{col_idx}'

                        query_param = bigquery.ScalarQueryParameter(
                            variable_name,
                            convert_converted_type_to_parameter_type(type_converted),
                            None if 'NULL' in value else value,
                        )
                        query_parameters.append(query_param)
                        arr.append(f'@{variable_name}')

                        query_payload_size += sys.getsizeof(value)

                row_values.append(f'({",".join(arr)})')

            query_arr = [
                f"INSERT INTO {full_table_name} ({insert_columns}) VALUES {','.join(row_values)};",
            ]

            if count_rows:
                query_arr.append('SELECT @@row_count;')
            query = '\n'.join(query_arr)

            if row_idx + 1 >= len(insert_values):
                insert_values = []
            else:
                insert_values = insert_values[(row_idx + 1):]

            tags2 = merge_dict(tags, dict(
                batch_size=len(row_values),
                records_remaining=len(insert_values),
            ))

            # Documentation https://cloud.google.com/bigquery/quotas
            self.logger.info(f'Unresolved Standard SQL query length: {sys.getsizeof(query) / 1000} kbs.', tags=tags2)
            self.logger.info(f'Number of Standard SQL query parameters: {len(query_parameters)}.', tags=tags2)
            self.logger.info(f'Request payload size: {query_payload_size / 1000} kbs.', tags=tags2)

            job = client.query(
                query,
                job_config=bigquery.QueryJobConfig(**merge_dict(query_job_config, dict(
                    query_parameters=query_parameters,
                ))),
            )
            jobs.append(job)
            result = job.result(timeout=QUERY_JOB_MAX_TIMEOUT_SECONDS)
            job_results.append(result)

        return job_results, jobs

if __name__ == '__main__':
    main(BigQuery)
