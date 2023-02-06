from azure.identity import DefaultAzureCredential, ClientSecretCredential
from azure.storage.blob import BlobServiceClient
from io import BytesIO
from mage_ai.io.base import BaseFile, FileFormat, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey
from mage_ai.shared.hash import extract, merge_dict
from pandas import DataFrame
from typing import Union


class AzureBlobStorage(BaseFile):
    """
    Handles data transfer between a Azure Blob Storage container and the Mage app. Supports
    loading files of any of the following types:
    - ".csv"
    - ".json"
    - ".parquet"
    """
    AUTHENTICATION_KEYS = [
        ConfigKey.AZURE_CLIENT_ID,
        ConfigKey.AZURE_CLIENT_SECRET,
        ConfigKey.AZURE_TENANT_ID,
    ]

    def __init__(
        self,
        verbose: bool = False,
        **kwargs,
    ) -> None:
        """
        Initializes data loader from an Azure Blob Storage container.
        """

        super().__init__(verbose=kwargs.get('verbose', True))

        if all(key in kwargs for key in self.AUTHENTICATION_KEYS):
            self.creds = ClientSecretCredential(
                kwargs[ConfigKey.AZURE_TENANT_ID],
                kwargs[ConfigKey.AZURE_CLIENT_ID],
                kwargs[ConfigKey.AZURE_CLIENT_SECRET],
            )
        else:
            self.creds = DefaultAzureCredential()
        self.service_client = BlobServiceClient(
            account_url=f'https://{kwargs["storage_account_name"]}.blob.core.windows.net',
            credential=self.creds,
        )

    def load(
        self,
        container_name: str,
        blob_path: str,
        format: Union[FileFormat, str, None] = None,
        limit: int = QUERY_ROW_LIMIT,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from Azure Blob Storage into a Pandas data frame. This function will load at
        maximum 10,000,000 rows of data from the specified file.

        Returns:
            DataFrame: The data frame constructed from the file in the Azure Blob Storage container.
        """
        if format is None:
            format = self._get_file_format(blob_path)
        with self.printer.print_msg(
            f'Loading data frame from container \'{container_name}\' at path \'{blob_path}\''
        ):
            blob_client = self.service_client.get_blob_client(
                container_name,
                blob_path,
            )
            if not blob_client.exists():
                return DataFrame()
            blob_data = blob_client.download_blob()
            buffer = BytesIO(blob_data.readall())
            return self._read(buffer, format, limit, **kwargs)

    def export(
        self,
        df: DataFrame,
        container_name: str,
        blob_path: str,
        format: Union[FileFormat, str, None] = None,
        **kwargs,
    ) -> None:
        """
        Exports data frame to an Azure Blob Storage container.
        """
        if format is None:
            format = self._get_file_format(blob_path)

        with self.printer.print_msg(
            f'Exporting data frame to container \'{container_name}\' at path \'{blob_path}\''
        ):
            blob_client = self.service_client.get_blob_client(
                container_name,
                blob_path,
            )
            buffer = BytesIO()
            self._write(df, format, buffer, **kwargs)
            buffer.seek(0)
            blob_client.upload_blob(buffer.read())

    def exists(
        self,
        container_name: str,
        prefix: str,
    ) -> bool:
        """
        Checks if content exists at a certain path in an Azure Blob Storage container.
        """
        blob_client = self.service_client.get_blob_client(
            container_name,
            prefix,
        )
        return blob_client.exists()

    @classmethod
    def with_config(
        cls,
        config: BaseConfigLoader,
        **kwargs,
    ) -> 'AzureBlobStorage':
        """
        Initializes Azure Blob Storage client from configuration loader

        Args:
            config (BaseConfigLoader): Configuration loader object
        """
        if ConfigKey.AZURE_STORAGE_ACCOUNT_NAME not in config:
            raise ValueError(
                'Require AZURE_STORAGE_ACCOUNT_NAME to be specified for Azure Blob Storage.'
            )

        return cls(
            storage_account_name=config[ConfigKey.AZURE_STORAGE_ACCOUNT_NAME],
            **merge_dict(
                extract(config, cls.AUTHENTICATION_KEYS),
                kwargs,
            ),
        )
