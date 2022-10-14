from connections.base import Connection
from connections.utils.sql import clean_query
from psycopg2 import connect
from typing import List
from utils.dictionary import merge_dict


class PostgreSQL(Connection):
    def __init__(
        self,
        database: str,
        host: str,
        password: str,
        username: str,
        port: int = 5432,
    ):
        super().__init__()
        self.database = database
        self.host = host
        self.password = password
        self.port = port
        self.username = username

    def execute(self, query_strings: List[str], commit=False) -> List[List[tuple]]:
        connection = self.build_connection()

        data = []

        with connection.cursor() as cursor:
            for query_string in query_strings:
                cursor.execute(clean_query(query_string))
                if not commit:
                    data.append(cursor.fetchall())

        if commit:
            connection.commit()
        connection.close()

        return data

    def load(self, query_string: str) -> List[List[tuple]]:
        tags = self.build_tags()
        self.info('Load started.', tags=tags)
        data = self.execute([
            query_string,
        ])
        self.info('Load completed.', tags=merge_dict(tags, dict(count=len(data))))

        return data[0]

    def build_connection(self):
        return connect(
            dbname=self.database,
            host=self.host,
            password=self.password,
            port=self.port,
            user=self.username,
        )
