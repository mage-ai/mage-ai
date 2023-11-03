import gspread
import pandas as pd
from google.oauth2 import service_account

from mage_ai.io.base import BaseFile
from mage_ai.io.config import BaseConfigLoader, ConfigKey


class GoogleSheets(BaseFile):
    """
    Handles data transfer between Google Sheet and the Mage app.
    Uses the gspread library to handle IO. Supports loading sheets from any one of:
    - Sheet ID
    - Sheet URL
    - Sheet Name

    And worksheets using any one of:
    - Worksheet Name
    - Worksheet Position

    Exporting worksheets currently requires an existing worksheet to be present.

    If GOOGLE_APPLICATION_CREDENTIALS environment is set, no further arguments are needed
    other than those specified below. Otherwise, use the factory method `with_config` to construct
    the data loader using manually specified credentials.
    """

    def __init__(
        self,
        **kwargs,
    ) -> None:
        """
        Initializes data loader from a Google Sheet. This requires the Sheets & Drive APIs
        to be enabled.

        To authenticate (and authorize) access to Google Sheets, credentials must be
        provided.

        Below are the different ways to access those credentials:
        - Define the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to a
          service account key. In this case no other no other parameters need to be
          specified.
        - Manually pass in the `google.oauth2.service_account.Credentials` object with the
        keyword argument `credentials`
        - Manually pass in the path to the credentials with the keyword argument
        `path_to_credentials`.
        - Manually define the service key key-value set to use (such as a dictionary containing
        the same parameters as a service key) with the keyword argument `credentials_mapping`

        All keyword arguments except for `path_to_credentials` and `credentials_mapping` will be
        passed to the Google Sheet client, accepting all other configuration settings there.
        """

        super().__init__(verbose=kwargs.get('verbose', True))

        if kwargs.get('verbose') is not None:
            kwargs.pop('verbose')

        scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
        ]

        credentials = kwargs.get('credentials')
        if credentials is None:
            if 'credentials_mapping' in kwargs:
                mapping_obj = kwargs.pop('credentials_mapping')
                if mapping_obj is not None:
                    credentials = service_account.Credentials.from_service_account_info(
                        mapping_obj, scopes=scopes
                    )
            if 'path_to_credentials' in kwargs:
                path = kwargs.pop('path_to_credentials')
                if path is not None:
                    credentials = service_account.Credentials.from_service_account_file(
                        path, scopes=scopes
                    )
            if 'credentials' in kwargs:
                kwargs.pop('credentials')
        with self.printer.print_msg('Opening connection to Google Sheets'):
            self.client = gspread.authorize(credentials, **kwargs)

    def fetch_sheet(
        self,
        sheet_url: str = None,
        sheet_id: str = None,
        sheet_name: str = None,
    ) -> gspread.spreadsheet.Spreadsheet:
        """Fetches a Google Sheet, given a sheet_url, sheet_id, or sheet_name.

        Args:
            sheet_url (str, optional): A sheet URL to export the dataframe to. Defaults to None
            sheet_id (str, optional): A sheet id to export the dataframe to. Defaults to None
            sheet_name (str, optional): A sheet name (title) to export the df. Defaults to None

        Raises:
            KeyError: raised if one of sheet_id, sheet_url, or sheet_name is not provided.

        Returns:
            gspread.spreadsheet.Spreadsheet: A gspread Spreadsheet object.
        """
        sheet = None

        if sheet_url:
            sheet = self.client.open_by_url(sheet_url)
        elif sheet_id:
            sheet = self.client.open_by_key(sheet_id)
        elif sheet_name:
            sheet = self.client.open(sheet_name)
        else:
            raise KeyError(
                'Please set one of sheet_url, sheet_id, or sheet_name to a valid Google Sheet.'
            )
        if sheet is not None:
            with self.printer.print_msg(
                f'Loaded Google Sheet \'{sheet.title}\' with ID \'{sheet.id}\''
            ):
                return sheet
        else:
            return None

    def fetch_worksheet(
        self,
        sheet_url: str = None,
        sheet_id: str = None,
        sheet_name: str = None,
        worksheet_name: str = None,
        worksheet_position: int = 0,
    ) -> gspread.worksheet.Worksheet:
        """Fetches a worksheet from a Google Sheet, given a sheet_url, sheet_id, or sheet_name.
        The worksheet may be fetched by name or position, but defaults to the first (0-indexed).

        Args:
            sheet_url (str, optional): A sheet URL to export the dataframe to. Defaults to None
            sheet_id (str, optional): A sheet id to export the dataframe to. Defaults to None
            sheet_name (str, optional): A sheet name (title) to export the df. Defaults to None
            worksheet_name (str, optional): A worksheet name to export the df. Defaults to None
            worksheet_position (int, optional): A worksheet position to export the df. Defaults to 0

        Raises:
            ValueError: To be raised if a sheet is not found.

        Returns:
            gspread.worksheet.Worksheet: A worksheet object.
        """
        sheet = self.fetch_sheet(
            sheet_url=sheet_url,
            sheet_id=sheet_id,
            sheet_name=sheet_name,
        )

        if sheet is None:
            raise ValueError('Sheet not found!')

        worksheet = None

        if worksheet_name is not None:
            worksheet = sheet.worksheet(worksheet_name)
        else:
            worksheet = sheet.get_worksheet(worksheet_position)

        if worksheet is not None:
            with self.printer.print_msg(
                f'Loaded worksheet \'{worksheet.title}\' at index \'{worksheet.index}\''
            ):
                return worksheet
        else:
            return None

    def load(
        self,
        sheet_url: str = None,
        sheet_id: str = None,
        sheet_name: str = None,
        worksheet_name: str = None,
        worksheet_position: int = 0,
        header_rows: int = 1,
    ) -> pd.DataFrame:
        """Loads a Google Sheet into a Pandas DataFrame, given a sheet_url, sheet_id, or sheet_name.
        A worksheet name or position can also be specified, but defaults to the
        first (0-indexed) worksheet.

        Args:
            sheet_url (str, optional): A sheet URL to export the dataframe to. Defaults to None
            sheet_id (str, optional): A sheet id to export the dataframe to. Defaults to None
            sheet_name (str, optional): A sheet name (title) to export the df. Defaults to None
            worksheet_name (str, optional): A worksheet name to export the df. Defaults to None
            worksheet_position (int, optional): A worksheet position to export the df. Defaults to 0
            header_rows (int, optional): The number of rows to use as headers. Defaults to 1

        Raises:
            KeyError: To be raised if a sheet_url, sheet_id, or sheet_name is not provided

        Returns:
            pd.DataFrame: A dataframe of the requested sheet.
        """

        worksheet = self.fetch_worksheet(
            sheet_url=sheet_url,
            sheet_id=sheet_id,
            sheet_name=sheet_name,
            worksheet_name=worksheet_name,
            worksheet_position=worksheet_position,
        )
        return pd.DataFrame(worksheet.get_all_records(head=header_rows))

    def export(
        self,
        df: pd.DataFrame,
        sheet_url: str = None,
        sheet_id: str = None,
        sheet_name: str = None,
        worksheet_name: str = None,
        worksheet_position: int = 0,
    ) -> None:
        """Exports a dataframe to an existing Worksheet within a Google Sheet.

        Args:
            df (pd.DataFrame): The dataframe to be exported.
            sheet_url (str, optional): A sheet URL to export the dataframe to. Defaults to None
            sheet_id (str, optional): A sheet id to export the dataframe to. Defaults to None
            sheet_name (str, optional): A sheet name (title) to export the df. Defaults to None
            worksheet_name (str, optional): A worksheet name to export the df. Defaults to None
            worksheet_position (int, optional): A worksheet position to export the df. Defaults to 0
        """

        worksheet = self.fetch_worksheet(
            sheet_url=sheet_url,
            sheet_id=sheet_id,
            sheet_name=sheet_name,
            worksheet_name=worksheet_name,
            worksheet_position=worksheet_position,
        )

        with self.printer.print_msg(
            f'Exporting dataframe to worksheet \'{worksheet.title}\''
            f'in sheet \'{worksheet.spreadsheet.title}\''
        ):
            worksheet.update([df.columns.values.tolist()] + df.values.tolist())

    def exists(
        self,
        sheet_url: str = None,
        sheet_id: str = None,
        sheet_name: str = None,
        worksheet_name: str = None,
        worksheet_position: int = 0,
    ) -> bool:
        """Checks if a given sheet & worksheet (optional) exists.

        Args:
            sheet_url (str, optional): A sheet URL to export the dataframe to. Defaults to None
            sheet_id (str, optional): A sheet id to export the dataframe to. Defaults to None
            sheet_name (str, optional): A sheet name (title) to export the df. Defaults to None
            worksheet_name (str, optional): A worksheet name to export the df. Defaults to None
            worksheet_position (int, optional): A worksheet position to export the df. Defaults to 0

        Raises:
            api_error: Sample responses show a 404 error not found— to be raised if sheet not found.

        Returns:
            bool: True/False if sheet exists
        """
        try:
            self.fetch_worksheet(
                sheet_url=sheet_url,
                sheet_id=sheet_id,
                sheet_name=sheet_name,
                worksheet_name=worksheet_name,
                worksheet_position=worksheet_position,
            )
            return True

        except gspread.exceptions.APIError as api_error:
            if api_error.response.status_code == 404:
                return False
            else:
                raise api_error

    @classmethod
    def with_config(
        cls,
        config: BaseConfigLoader,
        **kwargs,
    ) -> 'GoogleSheets':
        """
        Initializes Google Sheet client from configuration loader

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        if ConfigKey.GOOGLE_SERVICE_ACC_KEY in config:
            kwargs['credentials_mapping'] = config[ConfigKey.GOOGLE_SERVICE_ACC_KEY]
        elif ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH in config:
            kwargs['path_to_credentials'] = config[
                ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH
            ]
        else:
            raise ValueError(
                'No valid configuration settings found for Google Drive. You must specify '
                'either your service account key or the filepath to your service account key.'
            )
        return cls(**kwargs)
