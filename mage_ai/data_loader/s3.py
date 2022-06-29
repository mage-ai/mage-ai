from mage_ai.data_loader.base import BaseFile, FileFormat
from pandas import DataFrame
from io import BytesIO
import boto3


class S3(BaseFile):
    """
    Loads data from a S3 bucket. Supports loading files of any of the following types:
    - ".csv"
    - ".json"
    - ".parquet"
    - ".hdf5"
    """

    def __init__(
        self, bucket_name: str, object_name: str, format: FileFormat = None, **kwargs
    ) -> None:
        """
        Initializes data loader from an S3 bucket. If IAM credentials are stored on file, no further arguments are needed.
        Otherwise, the access credentials must also be passed as keyword arguments.

        Args:
            bucket_name (str): Bucket to load resource from
            object_name (str): Object key name within bucket given
            format (FileFormat, optional): File format of object. Defaults to None, in which case the format is inferred.
        """
        super().__init__(object_name, format)
        self.bucket_name = bucket_name
        self.client = boto3.resource('s3', **kwargs)

    def load(self) -> DataFrame:
        """
        Loads data from S3 into a Pandas data frame.

        Returns:
            DataFrame: The data frame specified by the bucket name and object name
        """
        buffer = BytesIO()
        self.client.download_fileobj(self.bucket_name, self.filepath, buffer)
        return self.opener(buffer)
