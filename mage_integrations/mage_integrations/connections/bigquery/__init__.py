from typing import List, Tuple

from google.cloud.bigquery import Client, dbapi
from google.oauth2 import service_account

from mage_integrations.connections.sql.base import Connection
from mage_integrations.connections.utils.google import CredentialsInfoType


class BigQuery(Connection):
    def __init__(
        self,
        credentials_info: CredentialsInfoType = None,
        path_to_credentials_json_file: str = None,
        location: str = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.credentials_info = credentials_info
        self.path_to_credentials_json_file = path_to_credentials_json_file
        self.location = location

        if self.credentials_info is not None:
            if isinstance(self.credentials_info, dict):
                self.credentials_info = service_account.Credentials.from_service_account_info(
                    self.credentials_info,
                )
        elif self.path_to_credentials_json_file is not None:
            self.credentials_info = service_account.Credentials.from_service_account_file(
                self.path_to_credentials_json_file,
            )
        self.client = Client(credentials=self.credentials_info, location=self.location)

    def build_connection(self):
        return dbapi.Connection(self.client)

    def execute_with_connection(self, connection, query_strings: List[str]) -> List[Tuple]:
        cursor = connection.cursor()

        return self.get_data_from_query_strings(cursor, query_strings)
