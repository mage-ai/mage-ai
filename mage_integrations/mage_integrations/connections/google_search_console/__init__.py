from google.oauth2 import service_account
from googleapiclient.discovery import build
from mage_integrations.connections.base import Connection
from mage_integrations.connections.utils.google import CredentialsInfoType
from typing import Dict


class GoogleSearchConsole(Connection):
    def __init__(
        self,
        credentials_info: CredentialsInfoType = None,
        email: str = None,
        path_to_credentials_json_file: str = None,
    ):
        if not credentials_info and not path_to_credentials_json_file:
            raise Exception('GoogleSearchConsole connection requires credentials_info '
                            'or path_to_credentials_json_file.')

        super().__init__()
        self.credentials_info = credentials_info
        self.email = email
        self.path_to_credentials_json_file = path_to_credentials_json_file

    def connect(self):
        """Create a connection to the Google Search Console API and return service object.
        
        Returns:
            service (object): Google Search Console service object.
        """
        
        scope = ['https://www.googleapis.com/auth/webmasters']
        if self.credentials_info is None:
            credentials = service_account.Credentials.from_service_account_file(
                self.path_to_credentials_json_file,
                scopes=scope,
            )
        else:
            credentials = self.credentials_info

        if self.email:
            credentials = credentials.with_subject(self.email)
        return build(
            'webmasters',
            'v3',
            credentials=credentials
        )

    def load(
        self,
        site_url: str,
        payload: Dict,
    ):
        service = self.connect()
        response = service.searchanalytics().query(siteUrl=site_url, body=payload).execute()

        if response is None:
            return None
        return response.get('rows')
