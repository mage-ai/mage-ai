import os

from mage_ai.data_preparation.shared.secrets import get_secret_value

__aws_region_name__ = "AWS_REGION_NAME"
__aws_default_region__ = "AWS_DEFAULT_REGION"
__aws_access_key_id__ = "AWS_ACCESS_KEY_ID"
__aws_secret_access_key__ = "AWS_SECRET_ACCESS_KEY"


def get_aws_region_name():
    region_name = os.getenv(__aws_region_name__)
    if region_name is None:
        region_name = os.getenv(__aws_default_region__)
    if region_name is None:
        region_name = get_secret_value(__aws_region_name__)
    if region_name is None:
        region_name = get_secret_value(__aws_default_region__)
    if region_name is None:
        region_name = 'us-west-2'
    return region_name


def get_aws_access_key_id():
    aws_access_key_id = os.getenv(__aws_access_key_id__)
    if aws_access_key_id is None:
        aws_access_key_id = get_secret_value(__aws_access_key_id__)
    return aws_access_key_id


def get_aws_secret_access_key():
    aws_secret_access_key = os.getenv(__aws_secret_access_key__)
    if aws_secret_access_key is None:
        aws_secret_access_key = get_secret_value(__aws_secret_access_key__)
    return aws_secret_access_key
