from mage_ai.services.aws import get_aws_boto3_client


class SecretsManager:
    def __init__(self):
        from aws_secretsmanager_caching import SecretCache, SecretCacheConfig

        client = get_aws_boto3_client('secretsmanager')

        cache_config = SecretCacheConfig()
        self.cache = SecretCache(config=cache_config, client=client)


secrets_manager = SecretsManager()


def get_secret(secret_id: str, cached=True) -> str:
    if cached:
        return secrets_manager.cache.get_secret_string(secret_id)
    else:
        return get_secret_force(secret_id)


def get_secret_force(secret_id: str) -> str:
    client = get_aws_boto3_client('secretsmanager')

    return client.get_secret_value(
        SecretId=secret_id,
    ).get('SecretString')
