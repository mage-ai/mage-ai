import sys
import uuid
from ast import literal_eval
from functools import reduce
from typing import Any, Dict, List, Tuple

import google
import pandas as pd
from google.api_core.exceptions import BadRequest
from google.cloud import bigquery

from mage_integrations.connections.bigquery import BigQuery as BigQueryConnection
from mage_integrations.destinations.bigquery.constants import (
    MAX_QUERY_BUFFER,
    MAX_QUERY_PARAMETERS,
    MAX_QUERY_PARAMETERS_SIZE,
    MAX_QUERY_STRING_SIZE,
    MAX_SUBQUERY_COUNT,
    QUERY_JOB_MAX_TIMEOUT_SECONDS,
)
from mage_integrations.destinations.bigquery.utils import (
    convert_array,
    convert_array_for_batch_load,
    convert_column_type,
    convert_converted_type_to_parameter_type,
    convert_datetime,
    convert_datetime_for_batch_load,
    convert_json_or_string,
    convert_json_or_string_for_batch_load,
    remove_duplicate_rows,
)
from mage_integrations.destinations.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_ARRAY,
    KEY_VALUE,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.sql.utils import (
    build_alter_table_command,
    build_create_table_command,
    build_insert_columns,
    build_insert_command,
    column_type_mapping,
)
from mage_integrations.utils.dictionary import merge_dict


def convert_column_if_json(value, column_type):
    if column_type == 'JSON' and 'TO_JSON' not in value:
        return f"TO_JSON('{value}')"

    return value


class BigQuery(Destination):
    DATABASE_CONFIG_KEY = 'project_id'
    SCHEMA_CONFIG_KEY = 'dataset'

    BATCH_SIZE = 500

    @property
    def quote(self) -> str:
        return '`'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.use_batch_load = self.config.get('use_batch_load')

    def build_connection(self) -> BigQueryConnection:
        return BigQueryConnection(
            credentials_info=self.config.get('credentials_info'),
            path_to_credentials_json_file=self.config.get('path_to_credentials_json_file'),
            location=self.config.get('location'),
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
                column_identifier=self.quote,
                use_lowercase=self.use_lowercase
            )

        stream_partition_keys = self.partition_keys.get(stream, [])
        if len(stream_partition_keys) > 0 and not create_temporary_table:
            partition_col = stream_partition_keys[0]
            create_table_command = f'''
{create_table_command}
PARTITION BY
  DATE(`{self.clean_column_name(partition_col)}`)
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

        schema_columns = schema['properties'].keys()

        current_mapping = reduce(
            lambda obj, tup: merge_dict(obj, {
                self.clean_column_name(tup[0]): tup[1],
            }),
            results,
            {},
        )
        current_columns = list(current_mapping.keys())
        new_mapping = column_type_mapping(
            schema,
            convert_column_type,
            lambda item_type_converted: f'ARRAY<{item_type_converted}>',
            number_type='FLOAT64',
            string_type='STRING',
        )

        new_mapping_column_types = {}
        for col, obj in new_mapping.items():
            new_mapping_column_types[
                self.clean_column_name(col)
            ] = obj['type_converted']

        new_column_types = {}
        for col, col_type in current_mapping.items():
            if col not in new_mapping_column_types:
                continue

            new_col_type = new_mapping_column_types[col]
            if col_type != new_col_type:
                new_column_types[col] = new_col_type

        full_table_name = f'{schema_name}.{table_name}'
        alter_table_commands = []

        # Check to see if column data types have changed
        if not self.config.get('disable_update_column_types') and len(new_column_types) >= 1:
            cmds = []
            for col, new_col_type in new_column_types.items():
                cmds.append(f'ALTER COLUMN {col} SET DATA TYPE {new_col_type}')
            alter_table_commands.append('\n'.join([
                f'ALTER TABLE {full_table_name}',
                ', '.join(cmds),
            ]))

        new_columns = [c for c in schema_columns if
                       self.clean_column_name(c)
                       not in current_columns]
        if new_columns:
            alter_table_commands.append(build_alter_table_command(
                column_type_mapping=new_mapping,
                columns=new_columns,
                full_table_name=full_table_name,
                column_identifier=self.quote,
                use_lowercase=self.use_lowercase,
            ))

        return alter_table_commands

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

    def process_queries(
        self,
        query_strings: List[str],
        record_data: List[Dict],
        stream: str,
        tags: Dict = None,
        **kwargs,
    ) -> List[List[Tuple]]:
        if tags is None:
            tags = {}

        tries = kwargs.get('tries', 0)

        try:
            return self.__process_queries(
                query_strings=query_strings,
                record_data=record_data,
                stream=stream,
                tags=tags,
            )
        except google.api_core.exceptions.BadRequest as err:
            if 'Transaction is aborted due to concurrent update against table' in str(err):
                if tries < 2:
                    tries += 1

                    tags2 = merge_dict(tags, dict(tries=tries))

                    self.logger.info(
                        f'Transaction is aborted due to concurrent update, retry {tries}.',
                        tags=tags2,
                    )
                    self.__recreate_table(tags=tags2)

                    return self.process_queries(
                        query_strings=query_strings,
                        record_data=record_data,
                        stream=stream,
                        tags=tags,
                        tries=tries,
                    )
                else:
                    raise err
            else:
                raise err

    def remove_duplicate_rows(self, row_data: List[Dict], stream: str) -> List[Dict]:
        unique_constraints = self.unique_constraints.get(stream)

        return remove_duplicate_rows(
            row_data,
            unique_constraints,
            logger=self.logger,
            tags=dict(stream=stream),
        )

    def __recreate_table(self, tags: Dict = None):
        if tags is None:
            tags = {}

        self.logger.info('Recreating table started.', tags)

        database_name = self.config.get(self.DATABASE_CONFIG_KEY)
        schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
        table_name = self.config.get(self.TABLE_CONFIG_KEY)

        full_table_name = f'`{database_name}.{schema_name}.{table_name}`'
        table_name_delete = f'_delete_{table_name}'
        full_table_name_delete = f'`{database_name}.{schema_name}.{table_name_delete}`'

        connection = self.build_connection()
        client = connection.client

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

        commands = [
            f'ALTER TABLE {full_table_name} RENAME TO {table_name_delete}',
            f'CREATE TABLE {full_table_name} AS (SELECT * FROM {full_table_name_delete})',
            f'DROP TABLE {full_table_name_delete}',
        ]

        for query in commands:
            job = client.query(
                query,
                job_config=bigquery.QueryJobConfig(**query_job_config),
            )
            job.result()

        self.logger.info('Recreating table completed.', tags)

    def __process_queries(
        self,
        query_strings: List[str],
        record_data: List[Dict],
        stream: str,
        tags: Dict = None,
    ) -> List[List[Tuple]]:
        if tags is None:
            tags = {}

        connection = self.build_connection()

        try:
            connection.execute(query_strings, commit=True)

            client = connection.client

            job = client.query(
                'SELECT 1',
                job_config=bigquery.QueryJobConfig(create_session=True),
            )
            session_id = job.session_info.session_id
            job.result()

            session_id_property = bigquery.query.ConnectionProperty(
                key='session_id',
                value=session_id,
            )
            query_job_config = dict(
                create_session=False,
                connection_properties=[session_id_property],
            )

            job = client.query(
                'BEGIN TRANSACTION',
                job_config=bigquery.QueryJobConfig(**query_job_config),
            )
            job.result()

            results, jobs = self.__insert(
                client,
                record_data,
                stream,
                query_job_config=query_job_config,
            )

            job = client.query(
                'COMMIT TRANSACTION',
                job_config=bigquery.QueryJobConfig(**query_job_config),
            )
            job.result()

            for job in jobs:
                try:
                    if job.num_dml_affected_rows:
                        self.records_affected += job.num_dml_affected_rows
                except Exception:
                    pass

            return results
        except Exception as err:
            database_name = self.config.get(self.DATABASE_CONFIG_KEY)
            schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
            table_name = self.config.get(self.TABLE_CONFIG_KEY)

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
        query_job_config: Dict = None,
    ) -> Tuple[List[List[Tuple]], List[Any]]:
        if query_job_config is None:
            query_job_config = {}

        database_name = self.config.get(self.DATABASE_CONFIG_KEY)
        schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
        table_name = self.config.get(self.TABLE_CONFIG_KEY)

        schema = self.schemas[stream]
        unique_constraints = self.unique_constraints.get(stream)
        unique_conflict_method = self.unique_conflict_methods.get(stream)

        tags = dict(
            database_name=database_name,
            records=len(record_data),
            schema_name=schema_name,
            stream=stream,
            table_name=table_name,
        )

        full_table_name = f'{database_name}.{schema_name}.{table_name}'

        columns = list(schema['properties'].keys())
        mapping = column_type_mapping(
            schema,
            convert_column_type,
            lambda item_type_converted: 'ARRAY',
            number_type='FLOAT64',
            string_type='STRING',
        )
        insert_columns = build_insert_columns(
            columns=columns,
            column_identifier=self.quote,
            use_lowercase=self.use_lowercase,
        )
        insert_columns = ', '.join(insert_columns)

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
                # The temp table created by the create table command is created in a new
                # dataset, so we need to get the full table name by checking the job results.
                try:
                    destination_table = \
                        job._properties['configuration']['query']['destinationTable']
                    temp_project_id = destination_table['projectId']
                    temp_dataset_id = destination_table['datasetId']
                    temp_table_id = destination_table['tableId']
                    temp_table_name = f'{temp_project_id}.{temp_dataset_id}.{temp_table_id}'
                except Exception:
                    pass
                job.result()

            job_results, jobs_from_insert = self.__insert_with_limits(
                client=client,
                columns=columns,
                full_table_name=temp_table_name,
                mapping=mapping,
                count_rows=False,
                query_job_config=query_job_config,
                record_data=record_data,
                tags=tags,
            )

            unique_constraints = [self.clean_column_name(col)
                                  for col in unique_constraints]
            columns_cleaned = [self.clean_column_name(col)
                               for col in columns]

            on_conditions = []
            for col in unique_constraints:
                on_conditions.append(
                    f'((a.{col} IS NULL AND b.{col} IS NULL) OR a.{col} = b.{col})',
                )

            merge_commands = [
                f'MERGE INTO `{full_table_name}` AS a',
                f'USING (SELECT * FROM `{temp_table_name}`) AS b',
                f"ON {' AND '.join(on_conditions)}",
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
                mapping=mapping,
                count_rows=True,
                query_job_config=query_job_config,
                record_data=record_data,
                tags=tags,
            )

        if self.use_batch_load:
            return [[] for _ in job_results], jobs
        else:
            return [[row.values() for row in row_iterator] for row_iterator in job_results], jobs

    def __insert_with_limits(
        self,
        client: Any,
        columns: List[str],
        full_table_name: str,
        mapping: Dict,
        record_data: List[Dict],
        count_rows: bool = True,
        query_job_config: Dict = None,
        tags: Dict = None,
    ) -> Tuple[List[Any], List[Any]]:
        if query_job_config is None:
            query_job_config = {}
        if tags is None:
            tags = {}

        jobs = []
        job_results = []

        if self.use_batch_load:
            self.logger.info('Using batch load method for BigQuery...')
            job_results, jobs = self.__run_load_job(
                client,
                record_data,
                mapping,
                columns,
                full_table_name,
            )
        else:
            insert_columns, insert_values = build_insert_command(
                column_type_mapping=mapping,
                columns=columns,
                convert_array_func=convert_array,
                convert_column_to_type_func=convert_column_if_json,
                convert_datetime_func=convert_datetime,
                records=[d['record'] for d in record_data],
                string_parse_func=convert_json_or_string,
                stringify_values=False,
                convert_column_types=True,
                column_identifier=self.quote,
                use_lowercase=self.use_lowercase,
            )
            insert_columns = ', '.join(insert_columns)

            max_subquery_count = self.config.get('max_subquery_count', MAX_SUBQUERY_COUNT)

            insert_statement = f"INSERT INTO `{full_table_name}` ({insert_columns}) VALUES"

            while len(insert_values) >= 1:
                query_size = len(insert_statement)
                query_payload_size = 0
                query_parameters = []

                row_values = []
                row_idx = -1

                while query_payload_size < (MAX_QUERY_PARAMETERS_SIZE * MAX_QUERY_BUFFER) and \
                        len(query_parameters) < (MAX_QUERY_PARAMETERS * MAX_QUERY_BUFFER) and \
                        query_size < (MAX_QUERY_STRING_SIZE * MAX_QUERY_BUFFER) and \
                        row_idx + 1 < len(insert_values) and \
                        len(row_values) < max_subquery_count:

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

                    row_value = f'({",".join(arr)})'
                    query_size += len(row_value)
                    row_values.append(row_value)

                query_arr = [
                    f"{insert_statement} {','.join(row_values)};",
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
                self.logger.info(
                    f'Unresolved Standard SQL query length: {sys.getsizeof(query) / 1000} kbs.',
                    tags=tags2,
                )
                self.logger.info(
                    f'Number of Standard SQL query parameters: {len(query_parameters)}.',
                    tags=tags2,
                )
                self.logger.info(
                    f'Request payload size: {query_payload_size / 1000} kbs.',
                    tags=tags2,
                )

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

    def __run_load_job(
        self,
        client,
        record_data: List[Dict],
        mapping: Dict,
        columns: List[str],
        full_table_name: str,
    ):
        """
        Run a BigQuery load job using the provided parameters.

        Args:
            client: The BigQuery client instance.
            record_data: List of dictionaries containing record data.
            mapping: Dictionary specifying the mapping of columns to their type configs.
            columns: List of column names.
            full_table_name: Full name of the target table.

        Returns:
            Tuple containing lists of JobResult and LoadJob instances.

        Raises:
            BadRequest: If there is an error in the BigQuery batch load process.
        """
        job_results = []
        jobs = []

        records = [d['record'] for d in record_data]
        values = []

        load_method = 'load_from_dataframe'
        schema_fields = []
        source_format = bigquery.SourceFormat.PARQUET

        # Map column to clean_name
        column_name_mapping = {col: self.clean_column_name(col) for col in columns}

        for col, obj in mapping.items():
            item_type_converted = obj['item_type_converted']
            type_converted = obj['type_converted']
            if type_converted == 'JSON':
                # JSON format is not supported in PARQUET
                source_format = bigquery.SourceFormat.CSV
            is_array_type = COLUMN_TYPE_ARRAY == obj['type']
            if is_array_type:
                load_method = 'load_from_json'

            schema_field = bigquery.SchemaField(
                # Use clean name in schema
                name=column_name_mapping[col],
                field_type=item_type_converted if is_array_type else type_converted,
                mode='REPEATED' if is_array_type else 'NULLABLE',
            )
            schema_fields.append(schema_field)

        if load_method == 'load_from_dataframe':
            convert_json_to_dict = False
        else:
            convert_json_to_dict = True

        for row in records:
            vals = dict()
            for column in columns:
                v = row.get(column, None)

                column_type_dict = mapping[column]
                column_type = column_type_dict['type']
                column_settings = column_type_dict['column_settings']

                value_final = v
                if v is None and COLUMN_TYPE_ARRAY == column_type:
                    value_final = []
                if v is not None:
                    if COLUMN_TYPE_ARRAY == column_type:
                        if type(v) is str:
                            v = literal_eval(v)
                        value_final = convert_array_for_batch_load(v, column_type_dict)
                    elif load_method == 'load_from_json' and \
                            COLUMN_FORMAT_DATETIME == column_settings.get('format'):
                        value_final = convert_datetime_for_batch_load(v)
                    else:
                        value_final = convert_json_or_string_for_batch_load(
                            v,
                            column_type_dict,
                            convert_json_to_dict=convert_json_to_dict,
                        )
                # Use clean name in values
                vals[column_name_mapping[column]] = value_final
            values.append(vals)

        job_config = bigquery.LoadJobConfig(
            schema=schema_fields,
        )
        if load_method == 'load_from_dataframe':
            job_config.source_format = source_format

            # Convert the records to dataframe to speed up the BigQuery load job
            df = pd.DataFrame.from_records(values)
            for column in columns:
                column_cleaned = column_name_mapping[column]
                column_type_dict = mapping[column]
                column_settings = column_type_dict['column_settings']
                if COLUMN_FORMAT_DATETIME == column_settings.get('format'):
                    df[column_cleaned] = pd.to_datetime(df[column_cleaned])
            job = client.load_table_from_dataframe(
                df,
                full_table_name,
                job_config=job_config,
            )
        else:
            job = client.load_table_from_json(
                values,
                full_table_name,
                job_config=job_config,
            )

        try:
            job_result = job.result()
        except BadRequest:
            for err in job.errors:
                self.logger.exception('BigQuery batch load error:', err)
            raise

        job_results.append(job_result)
        jobs.append(job)
        return job_results, jobs


if __name__ == '__main__':
    main(BigQuery)
