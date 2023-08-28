import io
import os

from azure.identity import ClientSecretCredential, DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
from mage_ai.io.config import ConfigKey


class Client:
    """
    Handles data transfer between an Azure Blob Storage container and the Mage app. Supports
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
        Initializes the client for Azure Blob Storage.
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

    def download_blob_to_file(
        self,
        container_name: str,
        blob_path: str,
        file_path: str,
        file_name: str,
    ) -> None:
        """
        Downloads data from Azure Blob Storage into a local file

        Returns:
            None
        """
        blob_client = self.service_client.get_blob_client(
            container_name,
            blob_path,
        )
        if not blob_client.exists():
            return None
        with open(file=os.path.join(file_path, file_name), mode="wb") as sample_blob:
            download_stream = blob_client.download_blob()
            sample_blob.write(download_stream.readall())


    def download_blob_to_stream(
        self,
        container_name: str,
        blob_path: str,
    ) -> io.BytesIO:
        blob_client = self.service_client.get_blob_client(
            container_name,
            blob_path,
        )
        if not blob_client.exists():
            return None
        stream = io.BytesIO()
        num_bytes = blob_client.download_blob().readinto(stream)
        print(f"Number of bytes: {num_bytes}")
        return stream


    def download_blob_to_string(
        self,
        container_name: str,
        blob_path: str,
    ) -> str:
        blob_client = self.service_client.get_blob_client(
            container_name,
            blob_path,
        )
        if not blob_client.exists():
            return None
        downloader = blob_client.download_blob(max_concurrency=1, encoding='UTF-8')
        blob_text = downloader.readall()
        print(f"Blob contents: {blob_text}")
        return blob_text
