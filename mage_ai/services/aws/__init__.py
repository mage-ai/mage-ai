import os


def get_aws_region_name():
    return os.getenv(
        'AWS_REGION_NAME',
        os.getenv('AWS_DEFAULT_REGION', 'us-west-2'),
    )
