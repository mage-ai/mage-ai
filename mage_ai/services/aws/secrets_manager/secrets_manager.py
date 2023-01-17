from aws_secretsmanager_caching import SecretCache, SecretCacheConfig 
from botocore.config import Config
import boto3
import os


region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
config = Config(region_name=region_name)
client = boto3.client('secretsmanager', config=config)
cache_config = SecretCacheConfig()
cache = SecretCache(config=cache_config, client=client)


def get_secret(secret_id: str, cached=True) -> str:
    if cached:
        return cache.get_secret_string(secret_id)
    else:
        return get_secret_force(secret_id)


def get_secret_force(secret_id: str) -> str:
    region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
    config = Config(region_name=region_name)
    client = boto3.client('secretsmanager', config=config)

    return client.get_secret_value(
        SecretId=secret_id,
    ).get('SecretString')

