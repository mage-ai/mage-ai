from datetime import datetime
from mage_integrations.connections.base import Connection as BaseConnection
from mage_integrations.connections.utils.sql import clean_query
from mage_integrations.utils.dictionary import merge_dict
from typing import List, Tuple
import re


class Connection(BaseConnection):
    def close_connection(self, connection):
        connection.close()

    def execute_with_connection(self, connection, query_strings: List[str]) -> List[Tuple]:
        with connection.cursor() as cursor:
            return self.get_data_from_query_strings(cursor, query_strings, connection)

    def execute(
        self,
        query_strings: List[str],
        commit=False,
    ) -> List[List[tuple]]:
        self.logger.info("Testing connection data 1111")
        connection = self.build_connection()

        data = self.execute_with_connection(connection, query_strings)
        self.logger.info(f"Testing connection data 2222: {data}")

        if commit:
            connection.commit()

        self.close_connection(connection)

        return data

    def get_data_from_query_strings(self, cursor, query_strings, connection):
        data = []

        for query_string in query_strings:
            qs = query_string.strip().upper()
            message = 'Execute generic command'
            if re.match('^CREATE[ ]+TABLE', qs):
                message = 'Execute create table command'
            elif re.match('^CREATE[ ]+SCHEMA', qs):
                message = 'Execute create schema command'
            elif re.match('^INSERT', qs):
                message = 'Execute insert command'
            elif re.match('^ALTER[ ]+TABLE', qs):
                message = 'Execute alter table command'

            self.logger.info(f'{message} started.')
            now1 = datetime.utcnow().timestamp()

            try:
                self.logger.info(f"Testing base connection clean_query: {query_string}")

                cursor.execute(clean_query(query_string))
                description = cursor.description
                if description:
                    fetch_result = cursor.fetchall()
                    self.logger.info(f"Testing base connection fetch_result: {fetch_result}")
                    data.append(fetch_result)
            except Exception as err:
                self.logger.error(f'Error while executing query: {str(err)}. '
                                  f'Query string: {query_string[:1000]}')
                raise err

            now2 = datetime.utcnow().timestamp()
            self.logger.info(f'{message} completed.', tags=dict(
                time=now2 - now1,
            ))

        return data

    def load(self, query_string: str) -> List[List[tuple]]:
        tags = merge_dict(self.build_tags(), dict(query=query_string))
        self.info('Load started.', tags=tags)
        self.logger.info(f"Testing connection base: {query_string}")
        data = self.execute([
            query_string,
        ])
        self.logger.info(f"Testing connection data: {data}")

        self.info('Load completed.', tags=merge_dict(tags, dict(count=len(data))))

        return data[0]
