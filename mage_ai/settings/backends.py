import base64
import logging
import os
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class BackendType(str, Enum):
    """
    Enum for the different types of settings backends.
    """
    AWS_SECRETS_MANAGER = 'aws_secrets_manager'


class SettingsBackend:
    """
    Base settings backend class. A settings backend is a read-only storage of Mage settings.
    The source of the configuration settings is dependent on the specific loader. The default source
    are environment variables.
    """
    backend_type = None

    def get(self, key: str, **kwargs) -> Optional[str]:
        """
        Loads the configuration setting stored under `key`.

        Args:
            key (str): Name of the setting to load

        Returns:
            Any: The setting value stored under `key` in the configuration manager. If key
                 doesn't exist, returns None.
        """
        value = self._get(key, **kwargs)  # noqa: E1128
        if value is None:
            value = os.getenv(key)
        if value is None:
            value = kwargs.get('default')
        return value

    def _get(self, key: str, **kwargs) -> Optional[str]:
        """
        Loads the configuration setting stored under `key`.

        Args:
            key (str): Name of the setting to load

        Returns:
            Any: The setting value stored under `key` in the configuration manager. If key
                 doesn't exist, returns None.
        """
        return None


class AWSSecretsManagerBackend(SettingsBackend):
    """
    Settings backend that loads configuration settings from AWS Secrets Manager.
    """
    backend_type = BackendType.AWS_SECRETS_MANAGER

    def __init__(self, **kwargs) -> None:
        import boto3

        self.client = boto3.client('secretsmanager')
        self.prefix = kwargs.get('prefix', '')
        self.use_cache = kwargs.get('use_cache', False)
        self.cache = None
        if self.use_cache:
            from aws_secretsmanager_caching import SecretCache, SecretCacheConfig
            cache_config_arg = kwargs.get('cache_config', {})
            cache_config = SecretCacheConfig(**cache_config_arg)
            self.cache = SecretCache(config=cache_config, client=self.client)

    def _get(self, key: str, **kwargs) -> Optional[str]:
        from botocore.exceptions import ClientError
        if self.prefix:
            key = f'{self.prefix}{key}'
        try:
            if self.cache is not None:
                return self.cache.get_secret_string(key)
            else:
                secret_response = self.client.get_secret_value(
                    SecretId=key,
                )
                if 'SecretBinary' in secret_response:
                    binary = secret_response['SecretBinary']
                    return base64.b64decode(binary)
                else:
                    return secret_response['SecretString']
        except ClientError as error:
            if error.response['Error']['Code'] != 'ResourceNotFoundException':
                logger.exception('Failed to get secret %s from AWS Secrets Manager.', key)
            return None
