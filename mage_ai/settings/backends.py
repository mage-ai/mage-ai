import base64
import os
from typing import Optional


class SettingsBackend:
    """
    Base settings backend class. A settings backend is a read-only storage of Mage settings.
    The source of the configuration settings is dependent on the specific loader. The default source
    are environment variables.
    """
    backend_type = None

    def __init__(self, **kwargs):
        self.config = kwargs

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
    backend_type = 'aws_secrets_manager'

    def __init__(self, **kwargs) -> None:
        import boto3

        self.client = boto3.client('secretsmanager')
        self.prefix = kwargs.get('prefix', '')

    def _get(self, key: str, **kwargs) -> Optional[str]:
        from botocore.exceptions import ClientError
        if self.prefix:
            key = f'{self.prefix}{key}'
        try:
            secret_response = self.client.get_secret_value(
                SecretId=key,
            )
        except ClientError as error:
            if error.response['Error']['Code'] == 'ResourceNotFoundException':
                return None
            raise
        if 'SecretBinary' in secret_response:
            binary = secret_response['SecretBinary']
            return base64.b64decode(binary)
        else:
            return secret_response['SecretString']
