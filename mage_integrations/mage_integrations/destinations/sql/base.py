from mage_integrations.destinations.base import Destination as BaseDestination
from mage_integrations.destinations.constants import (
    REPLICATION_METHOD_FULL_TABLE,
    REPLICATION_METHOD_INCREMENTAL,
)
from mage_integrations.utils.array import batch
from typing import Dict, List, Tuple
import argparse
import sys


class Destination(BaseDestination):
    DATABASE_CONFIG_KEY = 'database'
    SCHEMA_CONFIG_KEY = 'schema'

    BATCH_SIZE = 1000

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
        tags = dict(records=len(record_data), stream=stream)

        self.logger.info('Export data started', tags=tags)

        database_name = self.config.get(self.DATABASE_CONFIG_KEY)
        schema_name = self.config.get(self.SCHEMA_CONFIG_KEY)
        table_name = self.config.get('table')

        schema = self.schemas[stream]
        unique_constraints = self.unique_constraints.get(stream)
        unique_conflict_method = self.unique_conflict_methods.get(stream)

        query_strings = self.build_create_schema_commands(
            database_name=database_name,
            schema_name=schema_name,
        )

        replication_method = self.replication_methods[stream]
        if replication_method in [
            REPLICATION_METHOD_FULL_TABLE,
            REPLICATION_METHOD_INCREMENTAL,
        ]:
            if not self.does_table_exist(
                database_name=database_name,
                schema_name=schema_name,
                table_name=table_name,
            ):
                query_strings += self.build_create_table_commands(
                    database_name=database_name,
                    schema=schema,
                    schema_name=schema_name,
                    stream=stream,
                    table_name=table_name,
                    unique_constraints=unique_constraints,
                )
        else:
            message = f'Replication method {replication_method} not supported.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

        for sub_batch in batch(record_data, self.BATCH_SIZE):
            records = [d['record'] for d in sub_batch]

            for insert_command in self.build_insert_commands(
                database_name=database_name,
                records=records,
                schema=schema,
                schema_name=schema_name,
                table_name=table_name,
                unique_conflict_method=unique_conflict_method,
                unique_constraints=unique_constraints,
            ):
                query_strings.append(insert_command)

        if self.debug:
            for qs in query_strings:
                print(qs, '\n')

        connection = self.build_connection()
        data = connection.execute(query_strings, commit=True)

        records_inserted, records_updated = self.calculate_records_inserted_and_updated(
            data,
            unique_constraints=unique_constraints,
            unique_conflict_method=unique_conflict_method,
        )
        if records_inserted is not None:
            tags.update(records_inserted=records_inserted)
        if records_updated is not None:
            tags.update(records_updated=records_updated)

        self.logger.info('Export data completed.', tags=tags)

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
    ) -> Tuple:
        return None, None


def main(destination_class):
    destination = destination_class(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
