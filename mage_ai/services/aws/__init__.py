import os
from typing import Optional

AWS_REGION_NAME = 'AWS_REGION_NAME'
AWS_DEFAULT_REGION = 'AWS_DEFAULT_REGION'
AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID'
AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY'
AWS_SESSION_TOKEN = 'AWS_SESSION_TOKEN'


def get_aws_value_from_secrets(name: str) -> Optional[str]:
    try:
        from mage_ai.data_preparation.shared.secrets import get_secret_value_db_safe
        return get_secret_value_db_safe(name, suppress_warning=True)
    except Exception:
        return None


def get_aws_region_name() -> Optional[str]:
    region_name = os.getenv(AWS_REGION_NAME)
    if region_name is None:
        region_name = os.getenv(AWS_DEFAULT_REGION)
    if region_name is None:
        region_name = get_aws_value_from_secrets(AWS_REGION_NAME)
    if region_name is None:
        region_name = get_aws_value_from_secrets(AWS_DEFAULT_REGION)
    if region_name is None:
        region_name = 'us-west-2'
    return region_name


def get_aws_access_key_id() -> Optional[str]:
    aws_access_key_id = os.getenv(AWS_ACCESS_KEY_ID)
    if aws_access_key_id is None:
        aws_access_key_id = get_aws_value_from_secrets(AWS_ACCESS_KEY_ID)
    return aws_access_key_id


def get_aws_secret_access_key() -> Optional[str]:
    aws_secret_access_key = os.getenv(AWS_SECRET_ACCESS_KEY)
    if aws_secret_access_key is None:
        aws_secret_access_key = get_aws_value_from_secrets(AWS_SECRET_ACCESS_KEY)
    return aws_secret_access_key


def get_aws_session_token() -> Optional[str]:
    aws_session_token = os.getenv(AWS_SESSION_TOKEN)
    if aws_session_token is None:
        aws_session_token = get_aws_value_from_secrets(AWS_SESSION_TOKEN)
    return aws_session_token


def get_aws_boto3_client(aws_service):
    import boto3
    from botocore.config import Config

    config = Config(region_name=get_aws_region_name())
    kwargs = dict()

    aws_access_key_id = get_aws_access_key_id()
    if aws_access_key_id:
        kwargs['aws_access_key_id'] = aws_access_key_id
    aws_secret_access_key = get_aws_secret_access_key()
    if aws_secret_access_key:
        kwargs['aws_secret_access_key'] = aws_secret_access_key
    aws_session_token = get_aws_session_token()
    if aws_session_token:
        kwargs['aws_session_token'] = aws_session_token

    return boto3.client(
        aws_service,
        config=config,
        **kwargs,
    )
