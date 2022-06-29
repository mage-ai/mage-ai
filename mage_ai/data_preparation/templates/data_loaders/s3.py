from mage_ai.data_loader.s3 import S3
from pandas import DataFrame


def load_from_s3_bucket() -> DataFrame:
    bucket_name = 'your s3 bucket name'
    object_name = 'your object name'

    return S3(bucket_name, object_name).load()
