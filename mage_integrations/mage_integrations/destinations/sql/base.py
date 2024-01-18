import argparse
import sys
from typing import Dict, List, Tuple

from mage_integrations.destinations.base import Destination as BaseDestination
from mage_integrations.destinations.constants import (
    MAX_QUERY_STRING_SIZE,
    REPLICATION_METHOD_FULL_TABLE,
    REPLICATION_METHOD_INCREMENTAL,
    REPLICATION_METHOD_LOG_BASED,
)
from mage_integrations.destinations.sql.utils import clean_column_name
from mage_integrations.destinations.utils import update_record_with_internal_columns
from mage_integrations.utils.array import batch
from mage_integrations.utils.dictionary import merge_dict


class Destination(BaseDestination):
    DATABASE_CONFIG_KEY = 'database'
    SCHEMA_CONFIG_KEY = 'schema'
    TABLE_CONFIG_KEY = 'table'

    BATCH_SIZE = 25000

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.attempted_create_table = False
        self.records_affected = 0
        self.records_inserted = 0
        self.records_updated = 0

    @property
    def quote(self):
        return ''

    @property
    def use_lowercase(self) -> bool:
        return self.config.get('lower_case', True)

    def clean_column_name(self, col):
        return clean_column_name(col, lower_case=self.use_lowercase)

    def test_connection(self) -> None:
        sql_connection = self.build_connection()
        sql_connection.close_connection(sql_connection.build_connection())

    def export_batch_data(
        self,
        record_data: List[Dict],
        stream: str,
        tags: Dict = None,
    ) -> None:
        if tags is None:
            tags = {}

        database_name = self.config.get(self.DATABASE_CONFIG_KEY)
        schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
        table_name = self.config.get(self.TABLE_CONFIG_KEY)

        tags = merge_dict(tags, dict(
            database_name=database_name,
            records=len(record_data),
            schema_name=schema_name,
            stream=stream,
            table_name=table_name,
        ))

        self.logger.info('Export data started', tags=tags)

        unique_constraints = self.unique_constraints.get(stream)
        unique_conflict_method = self.unique_conflict_methods.get(stream)

        # Add _mage_created_at and _mage_updated_at columns
        for r in record_data:
            r['record'] = update_record_with_internal_columns(r['record'])

        # Create schema if not exists. Only run this command for the first batch.
        # Pass if user decides to skip it
        if tags.get('batch') == 0:
            if self.config.get("skip_schema_creation") is True:
                # User decided not to run CREATE SCHEMA command
                self.logger.info('Skipping CREATE SCHEMA command')
            else:
                create_schema_commands = self.build_create_schema_commands(
                    database_name=database_name,
                    schema_name=schema_name,
                )
                self.build_connection().execute(create_schema_commands, commit=True)

        query_strings = self.build_query_strings(
            record_data,
            stream,
            tags=tags,
        )

        self.logger.info(f'Process queries {query_strings}')

        data = self.process_queries(
            query_strings,
            record_data=record_data,
            stream=stream,
            tags=tags,
        )

        records_inserted, records_updated = self.calculate_records_inserted_and_updated(
            data,
            unique_constraints=unique_constraints,
            unique_conflict_method=unique_conflict_method,
        )

        tags.update(
            records_affected=self.records_affected,
            records_inserted=records_inserted,
            records_updated=records_updated,
        )

        self.logger.info('Export data completed.', tags=tags)

    def build_query_strings(
        self,
        record_data: List[Dict],
        stream: str,
        tags: Dict = None,
    ) -> List[str]:
        if tags is None:
            tags = {}

        # Only run the table create and alter commands for the first batch
        if tags.get('batch') > 0:
            return []

        database_name = self.config.get(self.DATABASE_CONFIG_KEY)
        schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
        table_name = self.config.get(self.TABLE_CONFIG_KEY)

        schema = self.schemas[stream]
        unique_constraints = self.unique_constraints.get(stream)

        tags = merge_dict(
            tags,
            dict(
                database_name=database_name,
                records=len(record_data),
                schema_name=schema_name,
                stream=stream,
                table_name=table_name,
            )
        )

        query_strings = []

        replication_method = self.replication_methods[stream]
        if replication_method in [
            REPLICATION_METHOD_FULL_TABLE,
            REPLICATION_METHOD_INCREMENTAL,
            REPLICATION_METHOD_LOG_BASED,
        ]:
            friendly_table_name = '.'.join([x for x in [
                database_name,
                schema_name,
                table_name,
            ] if x])

            self.logger.info(f'Checking if table {friendly_table_name} exists...', tags=tags)

            table_exists = self.does_table_exist(
                database_name=database_name,
                schema_name=schema_name,
                table_name=table_name,
            )

            if table_exists:
                self.logger.info(f'Table {friendly_table_name} already exists.', tags=tags)
                """
                Check whether any new columns are added
                """
                alter_table_commands = self.build_alter_table_commands(
                    database_name=database_name,
                    schema=schema,
                    schema_name=schema_name,
                    stream=stream,
                    table_name=table_name,
                    unique_constraints=unique_constraints,
                )
                if len(alter_table_commands) > 0:
                    query_strings += alter_table_commands
            else:
                self.logger.info(f'Table {friendly_table_name} doesn’t exists.', tags=tags)
                query_strings += self.build_create_table_commands(
                    database_name=database_name,
                    schema=schema,
                    schema_name=schema_name,
                    stream=stream,
                    table_name=table_name,
                    unique_constraints=unique_constraints,
                )
                self.attempted_create_table = True
        else:
            message = f'Replication method {replication_method} not supported.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

        return query_strings

    def _handle_insert_commands_single_batch(
        self,
        record_data: List[Dict],
        stream: str,
        idx: int = 0,
        tags: Dict = None,
    ):
        if tags is None:
            tags = {}
        database_name = self.config.get(self.DATABASE_CONFIG_KEY)
        schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
        table_name = self.config.get(self.TABLE_CONFIG_KEY)

        schema = self.schemas[stream]
        unique_constraints = self.unique_constraints.get(stream)
        unique_conflict_method = self.unique_conflict_methods.get(stream)

        records = [d['record'] for d in record_data]

        tags2 = merge_dict(tags, dict(index=idx))
        self.logger.info(f'Build insert commands for batch {idx} started.', tags=tags2)

        cmds = self.build_insert_commands(
            database_name=database_name,
            records=records,
            schema=schema,
            schema_name=schema_name,
            table_name=table_name,
            unique_conflict_method=unique_conflict_method,
            unique_constraints=unique_constraints,
        )

        self.logger.info(f'Build insert commands for batch {idx} completed.', tags=merge_dict(
            tags2,
            dict(
                insert_commands=len(cmds)
            ),
        ))
        return cmds

    def process_queries(
        self,
        query_strings: List[str],
        record_data: List[Dict],
        stream: str,
        tags: Dict = None,
    ) -> List[List[Tuple]]:
        if tags is None:
            tags = {}
        results = []

        if self.debug:
            for qs in query_strings:
                print(qs, '\n')

        results += self.build_connection().execute(query_strings, commit=True)

        query_string_size = 0
        query_strings = []
        for idx, sub_batch in enumerate(batch(record_data, self.BATCH_SIZE)):
            insert_commands = self._handle_insert_commands_single_batch(
                sub_batch,
                stream,
                idx=idx,
                tags=tags,
            )
            query_strings += insert_commands
            for c in insert_commands:
                query_string_size += len(c)
            if query_string_size >= MAX_QUERY_STRING_SIZE:
                self.logger.info(
                    f'Execute {len(query_strings)} insert commands, length: {query_string_size}',
                    tags=tags,
                )

                if self.debug:
                    for qs in query_strings:
                        try:
                            results += self.build_connection().execute([qs], commit=True)
                        except Exception as err:
                            print(qs)
                            raise err
                else:
                    results += self.build_connection().execute(query_strings, commit=True)

                query_strings = []
                query_string_size = 0

        if len(query_strings) > 0:
            self.logger.info(
                f'Execute {len(query_strings)} insert commands, length: {query_string_size}',
                tags=tags,
            )

            if self.debug:
                for qs in query_strings:
                    try:
                        results += self.build_connection().execute([qs], commit=True)
                    except Exception as err:
                        print(qs, '\n')
                        raise err
            else:
                results += self.build_connection().execute(query_strings, commit=True)

        return results

    def build_connection(self):
        raise Exception('Subclasses must implement the build_connection method.')

    def build_create_schema_commands(
        self,
        database_name: str,
        schema_name: str,
    ) -> List[str]:
        return [
            f'CREATE SCHEMA IF NOT EXISTS {self._wrap_with_quotes(schema_name)}',
        ]

    def build_create_table_commands(
        self,
        schema: Dict,
        schema_name: str,
        stream: str,
        table_name: str,
        database_name: str = None,
        unique_constraints: List[str] = None,
    ) -> List[str]:
        raise Exception('Subclasses must implement the build_create_table_commands method.')

    def build_alter_table_commands(
        self,
        schema: Dict,
        schema_name: str,
        stream: str,
        table_name: str,
        database_name: str = None,
        unique_constraints: List[str] = None,
    ) -> List[str]:
        return []

    def build_insert_commands(
        self,
        records: List[Dict],
        schema: Dict,
        schema_name: str,
        table_name: str,
        database_name: str = None,
        unique_conflict_method: str = None,
        unique_constraints: List[str] = None,
    ) -> List[str]:
        raise Exception('Subclasses must implement the build_insert_commands method.')

    def does_table_exist(
        self,
        schema_name: str,
        table_name: str,
        database_name: str = None,
    ) -> bool:
        raise Exception('Subclasses must implement the does_table_exist method.')

    def calculate_records_inserted_and_updated(
        self,
        data: List[List[Tuple]],
        unique_constraints: List[str] = None,
        unique_conflict_method: str = None,
    ) -> Tuple[int, int]:
        return self.records_inserted, self.records_updated

    def _wrap_with_quotes(self, name):
        name = name.replace('"', '')
        return f'{self.quote}{name}{self.quote}'


def main(destination_class):
    destination = destination_class(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
