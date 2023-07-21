import json
import os
import requests
from contextlib import contextmanager
from io import BytesIO
from pathlib import Path
from typing import Union
from requests_toolbelt import MultipartEncoder


from pandas import DataFrame, json_normalize

from mage_ai.io.base import QUERY_ROW_LIMIT, BaseFile, FileFormat
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.data_preparation.shared.secrets import get_secret_value


class FileIngestionService(BaseFile):
    """
    Handles data transfer between a file in SystemLink FIS and the Mage app. Supports loading files
    of any of the following types:
    - ".csv"
    - ".json"
    - ".parquet"
    - ".hdf5"
    """

    def __init__(
        self,
        verbose: bool = False,
        **kwargs,
    ) -> None:
        """
        Initializes data loader from an S3 bucket. If IAM profile is stored on
        file (in `~/.aws`), no further arguments are needed other than those
        specified below. Otherwise, specify:
        - `systemlink_http_uri` - SystemLink Server URI
        - `systemlink_api_key` - SystemLink API key
        """
        super().__init__(verbose=verbose)
        self.systemlink_http_uri = kwargs['systemlink_http_uri']
        self.systemlink_api_key = kwargs['systemlink_api_key']
        self.api_headers = { 'X-NI-API-KEY': self.systemlink_api_key } # auth header

    def _get_workpace_id(self, workspace):
        # get workspace id
        get_workspaces_resp = requests.get(f'{self.systemlink_http_uri}/niuser/v1/workspaces', params={'name': workspace}, headers=self.api_headers)
        # Expect a 200 code on success, raise an exception if there is an error response
        get_workspaces_resp.raise_for_status()

        workspaces = get_workspaces_resp.json()['workspaces']
        workspace_id = workspaces[0]['id']

        return workspace_id

    def _download_file(self, file_id):
        download_resp = requests.get(f'{self.systemlink_http_uri}/nifile/v1/service-groups/Default/files/{file_id}/data', headers=self.api_headers)
        download_resp.raise_for_status()
        filename = download_resp.headers['content-disposition'].split('"')[1::-1][0]

        with open(filename, 'wb') as file:
            file.write(download_resp.content)
        return filename

    def _upload_file(self, filename, workspace):
        with open(filename, 'r') as f:
            content = f.read()

        download_resp = requests.post(f'{self.systemlink_http_uri}/nifile/v1/service-groups/Default/upload-files', files = {filename : content}, data = {'workspace' : self._get_workpace_id(workspace)}, headers=self.api_headers)
        download_resp.raise_for_status()
        return

    def load(
        self,
        file_id: str,
        format: Union[FileFormat, str, None] = None,
        limit: int = QUERY_ROW_LIMIT,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from a file in FIS into a Pandas data frame. This function will load at
        maximum 10,000,000 rows of data from the specified file.

        Args:
            import_config (Mapping, optional): Configuration settings for importing file from
            S3. Defaults to None.
            limit (int, Optional): The number of rows to limit the loaded dataframe to.
                                    Defaults to 10,000,000.
            read_config (Mapping, optional): Configuration settings for reading file into data
            frame. Defaults to None.

        Returns:
            DataFrame: The data frame constructed from the file in FIS.
        """

        # Download File From File Ingestion Service
        filename = self._download_file(file_id)

        if format is None:
            format = self._get_file_format(filename)
        with self.printer.print_msg(
            f'Loading data frame from FileIngestionService \'{filename}\''
        ):
            if 'normalize' in kwargs:
                if kwargs['normalize']:
                    kwargs.pop('normalize')
                    with open(filename, 'r') as f:
                        data = json.load(f)

                    return json_normalize(data, **kwargs)
                kwargs.pop('normalize')

            return self._read(filename, format, limit, **kwargs)

    def export(
        self,
        df: DataFrame,
        filename: str,
        workspace: str,
        format: Union[FileFormat, str],
        **kwargs,
    ) -> None:
        """
        Exports data frame to SystemLink FIS.

        Args:
            df (DataFrame): Data frame to export
            filename: Name of the file to be created
            workspace: Name of the SystemLink Workspace where the file will be uploaded
        """
        with self.printer.print_msg(
            f'Exporting data frame to file \'{filename}\''
        ):
            self._write(df, format, filename, **kwargs)
            self._upload_file(filename, workspace)

    def exists(
        self, filename: str, workspace: str
    ) -> bool:
        """
        Checks if content exists at a certain path in SystemLink FIS.
        """
        query = {
                'propertiesQuery': [
                    {
                        'key': 'Name',
                        'operation': 'EQUAL',
                        'value': filename
                    }
                ]
            }
        response = requests.post(f'{self.systemlink_http_uri}/nifile/v1/service-groups/Default/query-files', headers=self.api_headers, json = query, params = {'workspace' :  self._get_workpace_id(workspace)})
        response.raise_for_status()
        return len(response.json()['availableFiles']) > 0

    @contextmanager
    def open_temporary_directory(self):
        temp_dir = Path.cwd() / '.tmp'
        temp_dir.mkdir(parents=True, exist_ok=True)
        yield temp_dir
        for file in temp_dir.iterdir():
            file.unlink()
        temp_dir.rmdir()

    @classmethod
    def with_config(
        cls,
        config: BaseConfigLoader,
        **kwargs,
    ) -> 'S3':
        """
        Initializes S3 client from configuration loader. This client accepts the following AWS
        IAM credential secrets:
        - Access Key ID
        - Secret Access Key
        - Region Name

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        return cls(
            systemlink_http_uri=config[ConfigKey.SYSTEMLINK_HTTP_URI],
            systemlink_api_key=config[ConfigKey.SYSTEMLINK_API_KEY],
            **kwargs,
        )
