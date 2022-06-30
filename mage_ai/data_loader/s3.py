from io import BytesIO
from mage_ai.data_loader.base import BaseFile, FileFormat
from pandas import DataFrame
import boto3


class S3(BaseFile):
    """
    Loads data from a S3 bucket into a Pandas data frame. Supports loading files
    of any of the following types:
    - ".csv"
    - ".json"
    - ".parquet"
    - ".hdf5"
    """

    def __init__(
        self,
        bucket_name: str,
        object_key: str,
        format: FileFormat = None,
        **kwargs,
    ) -> None:
        """
        Initializes data loader from an S3 bucket. If profile is stored on
        file (in `~/.aws`), no further arguments are needed other than those
        specified below. Otherwise, use the factory method `with_credentials` to construct
        the data loader using manually specified credentials.

        Args:
            bucket_name (str): Bucket to load resource from
            object_key (str): Object key of resource to load
            format (FileFormat, optional): File format of object. Defaults to None, in which
            case the format is inferred.
            **kwargs: all other keyword arguments to pass to the client
        """
        super().__init__(object_key, format)
        self.bucket_name = bucket_name
        self.client = boto3.client('s3', **kwargs)

    def load(self, **kwargs) -> DataFrame:
        """
        Loads data from S3 into a Pandas data frame.

        Returns:
            DataFrame: The data frame constructed from the file in the S3 bucket
        """
        response = self.client.get_object(Bucket=self.bucket_name, Key=self.filepath)
        buffer = BytesIO(response['Body'].read())
        return self.reader(buffer, **kwargs)

    @classmethod
    def with_credentials(
        cls,
        bucket_name: str,
        object_key: str,
        access_key_id: str,
        secret_access_key: str,
        region: str,
        format: FileFormat = None,
    ) -> 'S3':
        """
        Initializes data loader from an S3 bucket using manually specified credentials.
        If credentials are stored on file under `~/.aws/`, do not use this
        factory method, the default constructor will automatically load the credentials.

        Args:
            bucket_name (str): Bucket to load resource from
            object_key (str): Object key of resource to load
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
            object_key=object_key,
            format=format,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region,
        )
