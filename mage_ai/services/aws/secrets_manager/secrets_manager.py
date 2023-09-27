from mage_ai.services.aws import (
    get_aws_region_name,
    get_aws_access_key_id,
    get_aws_secret_access_key
)


class SecretsManager:
    def __init__(self):
        import boto3
        from aws_secretsmanager_caching import SecretCache, SecretCacheConfig
        from botocore.config import Config
        from botocore.credentials import Credentials

        region_name = get_aws_region_name()
        aws_access_key = get_aws_access_key_id()
        aws_secret_key = get_aws_secret_access_key()

        config = Config(region_name=region_name)
        credentials = Credentials(access_key=aws_access_key, secret_key=aws_secret_key)
        client = boto3.client('secretsmanager', config=config, credentials=credentials)
        cache_config = SecretCacheConfig()
        self.cache = SecretCache(config=cache_config, client=client)


secrets_manager = SecretsManager()


def get_secret(secret_id: str, cached=True) -> str:
    if cached:
        return secrets_manager.cache.get_secret_string(secret_id)
    else:
        return get_secret_force(secret_id)


def get_secret_force(secret_id: str) -> str:
    import boto3
    from botocore.config import Config
    from botocore.credentials import Credentials

    region_name = get_aws_region_name()
    aws_access_key = get_aws_access_key_id()
    aws_secret_key = get_aws_secret_access_key()

    config = Config(region_name=region_name)
    credentials = Credentials(access_key=aws_access_key, secret_key=aws_secret_key)
    config = Config(region_name=region_name)
    client = boto3.client('secretsmanager', config=config, credentials=credentials)

    return client.get_secret_value(
        SecretId=secret_id,
    ).get('SecretString')
