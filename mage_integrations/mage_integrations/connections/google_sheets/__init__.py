from typing import Dict

import backoff
import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build

from mage_integrations.connections.base import Connection
from mage_integrations.connections.utils.google import CredentialsInfoType
from mage_integrations.utils.dictionary import merge_dict


class GoogleSheets(Connection):
    def __init__(
        self,
        credentials_info: CredentialsInfoType = None,
        path_to_credentials_json_file: str = None,
    ):
        if not credentials_info and not path_to_credentials_json_file:
            raise Exception('GoogleSheets connection requires credentials_info '
                            'or path_to_credentials_json_file.')

        super().__init__()
        self.credentials_info = credentials_info
        self.path_to_credentials_json_file = path_to_credentials_json_file

    def connect(self):
        """Create a connection to the Google Search Console API and return service object.

        Returns:
            service (object): Google Search Console service object.
        """

        scope = ['https://www.googleapis.com/auth/spreadsheets.readonly']
        if self.credentials_info is None:
            credentials = service_account.Credentials.from_service_account_file(
                self.path_to_credentials_json_file,
                scopes=scope,
            )
        else:
            credentials = self.credentials_info
        return build(
            'sheets',
            'v4',
            credentials=credentials
        )

    @backoff.on_exception(
        backoff.expo,
        requests.exceptions.HTTPError,
        max_tries=5,
        factor=2,
    )
    def load(
        self,
        spreadsheet_id: str,
        value_range: str = None,
        opts: Dict = None,
    ):
        if opts is None:
            opts = dict()
        service = self.connect()
        kwargs = dict(
            spreadsheetId=spreadsheet_id,
        )
        if value_range is not None:
            kwargs['range'] = value_range
        if opts is not None:
            kwargs = merge_dict(kwargs, opts)

        response = service.spreadsheets().values().get(**kwargs).execute()

        return response.get('values', [])

    @backoff.on_exception(
        backoff.expo,
        requests.exceptions.HTTPError,
        max_tries=5,
        factor=2,
    )
    def get_spreadsheet_metadata(
        self,
        spreadsheet_id: str,
        sheet_title: str = None,
    ):
        service = self.connect()

        sheet_kwargs = dict()
        if sheet_title is not None:
            sheet_kwargs['includeGridData'] = True
            sheet_kwargs['ranges'] = f"'{sheet_title}'!1:2"
        response = service.spreadsheets().get(
            spreadsheetId=spreadsheet_id,
            **sheet_kwargs,
        ).execute()
        return response
