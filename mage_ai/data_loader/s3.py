from mage_ai.data_loader.base import BaseFile, FileFormat
from pandas import DataFrame
from io import BytesIO
import boto3
import os


class S3(BaseFile):
    """
    Loads data from a S3 bucket. Supports loading files of any of the following types:
    - ".csv"
    - ".json"
    - ".parquet"
    - ".hdf5"
    """

    @classmethod
    def with_credentials(
        cls,
        bucket_name: str,
        object_name: str,
        access_key_id: str,
        secret_access_key: str,
        region: str,
        format: FileFormat = None,
    ) -> 'S3':
        """
        Initializes data loader from an S3 bucket using manually specified credentials.
        If credentials are stored on file under `~/.aws`, do not use this factory method;
        the default constructor will automatically recognize the credentials.

        Args:
            bucket_name (str): Bucket to load resource from
            object_name (str): Object key name within bucket given
            format (FileFormat, optional): File format of object. Defaults to None,
            in which case the format is inferred.
            access_key_id (str, optional): AWS Access Key ID credential. Specify if IAM
            credentials are not configured. Defaults to None.
            secret_access_key (str, optional): AWS Secret Access Key credential. Specify
            if IAM credentials are not configured. Defaults to None.
            region (str, optional): AWS Region. Specify if IAM credentials are not configured.
            Defaults to None.
        """
        return cls(
            bucket_name=bucket_name,
            object_name=object_name,
            format=format,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region,
        )

    def __init__(
        self,
        bucket_name: str,
        object_name: str,
        format: FileFormat = None,
        **kwargs,
    ) -> None:
        """
        Initializes data loader from an S3 bucket. If credentials are stored on
        file, no further arguments are needed. Otherwise, use the factory method to construct
        the data loader using manually specified credentials.

        Args:
            bucket_name (str): Bucket to load resource from
            object_name (str): Object key name within bucket given
            format (FileFormat, optional): File format of object. Defaults to None, in which
            case the format is inferred.
            **kwargs: all other keyword arguments to pass to the client
        """
        super().__init__(object_name, format)
        self.bucket_name = bucket_name
        self.client = boto3.client('s3', **kwargs)

    def load(self, **kwargs) -> DataFrame:
        """
        Loads data from S3 into a Pandas data frame.

        Returns:
            DataFrame: The data frame specified by the bucket name and object name
        """
        buffer = BytesIO()
        self.client.download_fileobj(self.bucket_name, self.filepath, buffer)
        buffer.seek(0)
        return self.reader(buffer, **kwargs)
