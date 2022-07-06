from mage_ai.io.s3 import S3
from pandas import DataFrame


@data_exporter
def export_data_to_s3(df: DataFrame) -> None:
    """
    Template code for exporting data to a S3 bucket.

    This template assumes that user credentials are specified in `~/.aws`.
    If not, use `S3.with_credentials()` to manually specify AWS credentials or use
    AWS CLI to configure credentials on system.
    """
    bucket_name = 'your_s3_bucket_name'  # Specify S3 bucket name to pull data from
    object_key = 'your_object_key'  # Specify object to download from S3 bucket

    return S3(bucket_name, object_key).export(df)
