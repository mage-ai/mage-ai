import re
from datetime import datetime
from typing import List, Tuple

from mage_integrations.connections.base import Connection as BaseConnection
from mage_integrations.connections.utils.sql import clean_query
from mage_integrations.utils.dictionary import merge_dict


class Connection(BaseConnection):
    def close_connection(self, connection):
        connection.close()

    def execute_with_connection(self, connection, query_strings: List[str]) -> List[Tuple]:
        with connection.cursor() as cursor:
            return self.get_data_from_query_strings(cursor, query_strings)

    def execute(
        self,
        query_strings: List[str],
        commit=False,
        connection=None,
    ) -> List[List[tuple]]:
        """
        Execute the provided SQL queries using the given connection, or create a new one if not
        provided. If a new connection is created, it'll be closed automatically at the end.

        Args:
            query_strings (List[str]): List of SQL queries to execute.
            commit (bool, optional): Whether to commit the transaction. Defaults to False.
            connection (Optional[Any], optional): An existing connection to use. If None, a new
                connection will be created. Defaults to None.

        Returns:
            List[List[Tuple]]: A list of result sets for each query executed. Each result set is
                represented as a list of tuples.

        Raises:
            Any exceptions raised during the execution process may propagate upward.
        """
        new_connection_created = False
        if connection is None:
            connection = self.build_connection()
            new_connection_created = True

        data = self.execute_with_connection(connection, query_strings)

        if commit:
            connection.commit()

        if new_connection_created:
            self.close_connection(connection)

        return data

    def get_data_from_query_strings(self, cursor, query_strings):
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
                cursor.execute(clean_query(query_string))
                description = cursor.description
                if description:
                    data.append(cursor.fetchall())
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
        data = self.execute([
            query_string,
        ])
        self.info('Load completed.', tags=merge_dict(tags, dict(count=len(data))))

        return data[0]
