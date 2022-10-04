
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobClient, BlobServiceClient
from io import BytesIO
from mage_ai.io.base import BaseFile, FileFormat, QUERY_ROW_LIMIT
from mage_ai.io.config import BaseConfigLoader, ConfigKey

from pandas import DataFrame


class AzureBlobStorage(BaseFile):
    """
    Handles data transfer between a Azure Blob Storage container and the Mage app. Supports loading files
    of any of the following types:
    - ".csv"
    - ".json"
    - ".parquet"
    """

    def __init__(
        self,
        verbose=False,
        **kwargs,
    ) -> None:
        """
        Initializes data loader from an Azure Blob Storage container.
        """

        super().__init__(verbose=kwargs.get('verbose', True))

        self.creds = DefaultAzureCredential()
        self.service_client = BlobServiceClient(
            account_url=kwargs['account_url'],
            credential=self.creds,
        )

    def load(
        self,
        container_name: str,
        blob_path: str,
        format: FileFormat = None,
        limit: int = QUERY_ROW_LIMIT,
        **kwargs,
    ) -> DataFrame:
        """
        Loads data from Azure Blob Storage into a Pandas data frame. This function will load at
        maximum 100,000 rows of data from the specified file.

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
        format: FileFormat = None,
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
        if ConfigKey.AZURE_BLOB_ACCOUNT_URL not in config:
            raise ValueError(
                'Require AZURE_BLOB_ACCOUNT_URL to be specified for Azure Blob Storage.'
            )

        return cls(
            account_url=config[ConfigKey.AZURE_BLOB_ACCOUNT_URL],
            **kwargs,
        )
