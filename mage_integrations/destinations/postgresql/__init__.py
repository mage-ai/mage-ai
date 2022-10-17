from mage_integrations.connections.postgresql import PostgreSQL as PostgreSQLConnection
from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.constants import REPLICATION_METHOD_FULL_TABLE, REPLICATION_METHOD_INCREMENTAL
from mage_integrations.destinations.postgresql.utils import build_create_table_command, build_insert_command
from mage_integrations.utils.array import batch
from typing import Dict, List
import argparse
import sys


class PostgreSQL(Destination):
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
        )])

    def export_batch_data(self, record_data: List[Dict]) -> None:
        data = record_data[0]
        schema = data['schema']
        stream = data['stream']
        tags = data['tags']

        self.logger.info('Export data started', tags=tags)

        schema_name = self.config['schema']
        table_name = self.config['table']
        full_table_name = f'{schema_name}.{table_name}'
        does_table_exist = self.__does_table_exist(schema_name, table_name)

        unique_constraints = self.unique_constraints.get(stream)

        query_strings = [
            f'CREATE SCHEMA IF NOT EXISTS {schema_name}',
        ]

        replication_method = self.replication_methods[stream]
        if replication_method in [
            REPLICATION_METHOD_FULL_TABLE,
            REPLICATION_METHOD_INCREMENTAL,
        ]:
            if not does_table_exist:
                create_table_command = build_create_table_command(
                    schema_name,
                    table_name,
                    schema,
                    unique_constraints=unique_constraints,
                )
                query_strings.append(create_table_command)
        else:
            message = f'Replication method {replication_method} not supported.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)


        for sub_batch in batch(record_data, 1000):
            query_strings.append(build_insert_command(
                schema_name,
                table_name,
                schema,
                [d['record'] for d in sub_batch],
                unique_conflict_method=self.unique_conflict_methods.get(stream),
                unique_constraints=unique_constraints,
            ))

        connection = self.__build_connection()
        connection.execute(query_strings, commit=True)

        self.logger.info('Export data completed.', tags=tags)

    def __does_table_exist(self, schema_name, table_name) -> bool:
        connection = self.__build_connection().build_connection()
        with connection.cursor() as cursor:
            cursor.execute(
                f'SELECT * FROM pg_tables WHERE schemaname = \'{schema_name}\' AND tablename = \'{table_name}\'',
            )
            count = cursor.rowcount

            return bool(count)

    def __build_connection(self) -> PostgreSQLConnection:
        return PostgreSQLConnection(
            database=self.config['database'],
            host=self.config['host'],
            password=self.config['password'],
            port=self.config['port'],
            username=self.config['username'],
        )


def main():
    destination = PostgreSQL(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)

if __name__ == '__main__':
    main()
