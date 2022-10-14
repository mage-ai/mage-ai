from connections.postgresql import PostgreSQL as PostgreSQLConnection
from destinations.base import Destination
from destinations.constants import REPLICATION_METHOD_FULL_TABLE, REPLICATION_METHOD_INCREMENTAL
from destinations.postgresql.utils import build_create_table_command, build_insert_command
from typing import List
import argparse
import sys


class PostgreSQL(Destination):
    def export_data(
        self,
        stream: str,
        schema: dict,
        record: dict,
        records_count: int,
        tags: dict = {},
        **kwargs,
    ) -> None:
        self.logger.info('Export data started', tags=tags)

        schema_name = self.config['schema']
        table_name = self.config['table']
        full_table_name = f'{schema_name}.{table_name}'
        does_table_exist = self.__does_table_exist(schema_name, table_name)

        unique_constraints = self.unique_constraints.get(stream)

        query_strings = [
            f'CREATE SCHEMA IF NOT EXISTS {schema_name}',
        ]
        create_table_command = build_create_table_command(
            schema_name,
            table_name,
            schema,
            unique_constraints=unique_constraints,
        )

        replication_method = self.replication_methods[stream]
        if REPLICATION_METHOD_INCREMENTAL == replication_method:
            if not does_table_exist:
                query_strings.append(create_table_command)
        elif REPLICATION_METHOD_FULL_TABLE == replication_method:
            if does_table_exist and records_count == 0:
                query_strings.append(f'DROP TABLE {full_table_name}')
                query_strings.append(create_table_command)
        else:
            message = f'Replication method {replication_method} not supported.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

        query_strings.append(build_insert_command(
            schema_name,
            table_name,
            schema,
            record,
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
    destination = PostgreSQL(argument_parser=argparse.ArgumentParser())
    destination.process(sys.stdin.buffer)

if __name__ == '__main__':
    main()
