from google.cloud.storage import Client
from google.oauth2 import service_account

from mage_integrations.connections.sql.base import Connection
from mage_integrations.connections.utils.google import CredentialsInfoType


class GoogleCloudStorage(Connection):
    def __init__(
        self,
        credentials_info: CredentialsInfoType = None,
        path_to_credentials_json_file: str = None,
        project_id: str = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.credentials_info = credentials_info
        self.path_to_credentials_json_file = path_to_credentials_json_file
        self.project_id = project_id

        if self.credentials_info is not None:
            if isinstance(self.credentials_info, dict):
                self.credentials_info = service_account.Credentials.from_service_account_info(
                    self.credentials_info,
                )
        elif self.path_to_credentials_json_file is not None:
            self.credentials_info = service_account.Credentials.from_service_account_file(
                self.path_to_credentials_json_file,
            )
        self.client = Client(credentials=self.credentials_info, project=self.project_id)

    def build_connection(self):
        return self.client
