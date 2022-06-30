from mage_ai.data_loader.s3 import S3
from pandas import DataFrame


@data_loader
def load_from_s3_bucket() -> DataFrame:
    """
    Template code for loading data from S3 bucket.

    This template assumes that user credentials are specified in `~/.aws`.
    If not, use `S3.with_credentials()` to manually specify AWS credentials or use
    AWS CLI to configure credentials on system.
    """
    bucket_name = 'your_s3_bucket_name'  # Specify S3 bucket name to pull data from
    object_key = 'your_object_key'  # Specify object to download from S3 bucket

    return S3(bucket_name, object_key).load()
