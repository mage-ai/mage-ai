import os
from mage_ai.data_preparation.shared.secrets import get_secret_value


def get_aws_region_name():
    return os.getenv(
        'AWS_REGION_NAME',
        os.getenv('AWS_DEFAULT_REGION', os.getenv(
                    get_secret_value('AWS_REGION_NAME') or get_secret_value('AWS_DEFAULT_REGION'),
                    'us-west-2'
                )
        ),
    )


def get_aws_access_key_id():
    return os.getenv(
        'AWS_ACCESS_KEY_ID', get_secret_value('AWS_ACCESS_KEY_ID')
    )


def get_aws_secret_access_key():
    return os.getenv(
        'AWS_ACCESS_KEY_ID', get_secret_value('AWS_SECRET_ACCESS_KEY')
    )
