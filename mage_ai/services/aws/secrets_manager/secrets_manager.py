import os


class SecretsManager:
    def __init__(self):
        from aws_secretsmanager_caching import SecretCache, SecretCacheConfig 
        from botocore.config import Config
        import boto3

        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        client = boto3.client('secretsmanager', config=config)
        cache_config = SecretCacheConfig()
        self.cache = SecretCache(config=cache_config, client=client)

secrets_manager = SecretsManager()


def get_secret(secret_id: str, cached=True) -> str:
    if cached:
        return secrets_manager.cache.get_secret_string(secret_id)
    else:
        return get_secret_force(secret_id)


def get_secret_force(secret_id: str) -> str:
    from botocore.config import Config
    import boto3
    
    region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
    config = Config(region_name=region_name)
    client = boto3.client('secretsmanager', config=config)

    return client.get_secret_value(
        SecretId=secret_id,
    ).get('SecretString')

