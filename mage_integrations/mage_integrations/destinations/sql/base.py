from mage_integrations.destinations.base import Destination as BaseDestination
from mage_integrations.destinations.constants import (
    REPLICATION_METHOD_FULL_TABLE,
    REPLICATION_METHOD_INCREMENTAL,
)
from mage_integrations.utils.array import batch
from mage_integrations.utils.dictionary import merge_dict
from typing import Dict, List, Tuple
import argparse
import sys


class Destination(BaseDestination):
    DATABASE_CONFIG_KEY = 'database'
    SCHEMA_CONFIG_KEY = 'schema'

    BATCH_SIZE = 1000

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.attempted_create_table = False
        self.records_affected = 0
        self.records_inserted = 0
        self.records_updated = 0

    def test_connection(self) -> None:
        self.build_connection().build_connection()

    def export_data(
        self,
        stream: str,
        schema: dict,
        record: dict,
        tags: dict = {},
        **kwargs,
    ) -> None:
        self.export_batch_data([dict(
            record=record,
            schema=schema,
            stream=stream,
            tags=tags,
        )], stream)

    def export_batch_data(
        self,
        record_data: List[Dict],
        stream: str,
    ) -> None:
        database_name = self.config.get(self.DATABASE_CONFIG_KEY)
        schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
        table_name = self.config.get('table')

        tags = dict(
            database_name=database_name,
            records=len(record_data),
            schema_name=schema_name,
            stream=stream,
            table_name=table_name,
        )

        self.logger.info('Export data started', tags=tags)

        unique_constraints = self.unique_constraints.get(stream)
        unique_conflict_method = self.unique_conflict_methods.get(stream)

        query_strings = self.build_query_strings(record_data, stream)

        data = self.process_queries(
            query_strings,
            record_data=record_data,
            stream=stream,
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
    ) -> List[str]:
        database_name = self.config.get(self.DATABASE_CONFIG_KEY)
        schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
        table_name = self.config.get('table')

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

        query_strings = self.build_create_schema_commands(
            database_name=database_name,
            schema_name=schema_name,
        )

        replication_method = self.replication_methods[stream]
        if replication_method in [
            REPLICATION_METHOD_FULL_TABLE,
            REPLICATION_METHOD_INCREMENTAL,
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

        query_strings += self.handle_insert_commands(record_data, stream, tags=tags)

        if self.debug:
            for qs in query_strings:
                print(qs, '\n')

        return query_strings

    def handle_insert_commands(
        self,
        record_data: List[Dict],
        stream: str,
        tags: Dict = {},
    ) -> List[str]:
        database_name = self.config.get(self.DATABASE_CONFIG_KEY)
        schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
        table_name = self.config.get('table')

        schema = self.schemas[stream]
        unique_constraints = self.unique_constraints.get(stream)
        unique_conflict_method = self.unique_conflict_methods.get(stream)

        query_strings = []

        for idx, sub_batch in enumerate(batch(record_data, self.BATCH_SIZE)):
            records = [d['record'] for d in sub_batch]

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

            for insert_command in cmds:
                query_strings.append(insert_command)

            self.logger.info(f'Build insert commands for batch {idx} completed.', tags=merge_dict(tags2, dict(
                insert_commands=len(cmds)
            )))

        return query_strings

    def process_queries(
        self,
        query_strings: List[str],
        record_data: List[Dict],
        stream: str,
    ) -> List[List[Tuple]]:
        connection = self.build_connection()
        return connection.execute(query_strings, commit=True)

    def build_connection(self):
        raise Exception('Subclasses must implement the build_connection method.')

    def build_create_schema_commands(
        self,
        database_name: str,
        schema_name: str,
    ) -> List[str]:
        return [
            f'CREATE SCHEMA IF NOT EXISTS {schema_name}',
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


def main(destination_class):
    destination = destination_class(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
