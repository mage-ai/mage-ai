from mage_integrations.connections.base import Connection as BaseConnection
from mage_integrations.connections.utils.sql import clean_query
from mage_integrations.utils.dictionary import merge_dict
from typing import List


class Connection(BaseConnection):
    def close_connection(self, connection):
        connection.close()

    def execute(
        self,
        query_strings: List[str],
        commit=False,
    ) -> List[List[tuple]]:
        connection = self.build_connection()

        data = []

        with connection.cursor() as cursor:
            for query_string in query_strings:
                cursor.execute(clean_query(query_string))
                description = cursor.description
                if description:
                    data.append(cursor.fetchall())

        if commit:
            connection.commit()

        self.close_connection(connection)

        return data

    def load(self, query_string: str) -> List[List[tuple]]:
        tags = self.build_tags()
        self.info('Load started.', tags=tags)
        data = self.execute([
            query_string,
        ])
        self.info('Load completed.', tags=merge_dict(tags, dict(count=len(data))))

        return data[0]
