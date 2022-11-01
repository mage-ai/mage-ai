from google.cloud.bigquery import Client, dbapi
from google.oauth2 import service_account
from mage_integrations.connections.sql.base import Connection
from mage_integrations.connections.utils.google import CredentialsInfoType
from mage_integrations.connections.utils.sql import clean_query
from typing import List


class BigQuery(Connection):
    def __init__(
        self,
        credentials_info: CredentialsInfoType = None,
        path_to_credentials_json_file: str = None,
        **kwargs,
    ):
        if not credentials_info and not path_to_credentials_json_file:
            raise Exception('BigQuery connection requires credentials_info '
                            'or path_to_credentials_json_file.')
        super().__init__(**kwargs)
        self.credentials_info = credentials_info
        self.path_to_credentials_json_file = path_to_credentials_json_file

    def build_connection(self):
        if self.credentials_info is None:
            if self.path_to_credentials_json_file is None:
                raise Exception('No valid crendentials provided.')
            self.credentials_info = service_account.Credentials.from_service_account_file(
                self.path_to_credentials_json_file,
            )
        client = Client(credentials=self.credentials_info)
        return dbapi.Connection(client)

    def execute(
        self,
        query_strings: List[str],
        commit=False,
    ) -> List[List[tuple]]:
        connection = self.build_connection()

        data = []

        cursor = connection.cursor()
        for query_string in query_strings:
            cursor.execute(clean_query(query_string))
            description = cursor.description
            if description:
                data.append(cursor.fetchall())

        if commit:
            connection.commit()
        connection.close()

        return data
