import os

from mage_ai.data_preparation.shared.secrets import get_secret_value

AWS_REGION_NAME = 'AWS_REGION_NAME'
AWS_DEFAULT_REGION = 'AWS_DEFAULT_REGION'
AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID'
AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY'


def get_aws_region_name():
    region_name = os.getenv(AWS_REGION_NAME)
    if region_name is None:
        region_name = os.getenv(AWS_DEFAULT_REGION)
    if region_name is None:
        region_name = get_secret_value(AWS_REGION_NAME)
    if region_name is None:
        region_name = get_secret_value(AWS_DEFAULT_REGION)
    if region_name is None:
        region_name = 'us-west-2'
    return region_name


def get_aws_access_key_id():
    aws_access_key_id = os.getenv(AWS_ACCESS_KEY_ID)
    if aws_access_key_id is None:
        aws_access_key_id = get_secret_value(AWS_ACCESS_KEY_ID)
    return aws_access_key_id


def get_aws_secret_access_key():
    aws_secret_access_key = os.getenv(AWS_SECRET_ACCESS_KEY)
    if aws_secret_access_key is None:
        aws_secret_access_key = get_secret_value(AWS_SECRET_ACCESS_KEY)
    return aws_secret_access_key
