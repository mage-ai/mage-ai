from abc import ABC, abstractmethod
from botocore.exceptions import ClientError
from enum import Enum
from typing import Any, Union
import boto3
import os


class ConfigKeys(str, Enum):
    """
    List of configuration settings for use with data IO clients.
    """

    AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID'
    AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY'
    AWS_SESSION_TOKEN = 'AWS_SESSION_TOKEN'
    AWS_REGION = 'AWS_REGION'
    FILE_PATH = 'FILE_PATH'
    FILE_FORMAT = 'FILE_FORMAT'
    GOOGLE_SERVICE_ACC_CREDENTIALS = 'GOOGLE_SERVICE_ACC_CREDENTIALS'
    GOOGLE_ACCOUNT_CREDENTIALS = 'GOOGLE_ACCOUNT_CREDENTIALS'
    POSTGRES_DB = 'POSTGRES_DB'
    POSTGRES_USER = 'POSTGRES_USER'
    POSTGRES_PASSWORD = 'POSTGRES_PASSWORD'
    POSTGRES_HOST = 'POSTGRES_HOST'
    POSTGRES_PORT = 'POSTGRES_PORT'
    REDSHIFT_DB = 'REDSHIFT_DB'
    REDSHIFT_HOST = 'REDSHIFT_HOST'
    REDSHIFT_PORT = 'REDSHIFT_PORT'
    REDSHIFT_TEMP_CRED_USER = 'REDSHIFT_TEMP_CRED_USER'
    REDSHIFT_TEMP_CRED_PASSWORD = 'REDSHIFT_TEMP_CRED_PASSWORD'
    REDSHIFT_DB_USER = 'REDSHIFT_DB_USER'
    REDSHIFT_CLUSTER_ID = 'REDSHIFT_CLUSTER_ID'
    SNOWFLAKE_USER = 'SNOWFLAKE_USER'
    SNOWFLAKE_PASSWORD = 'SNOWFLAKE_PASSWORD'
    SNOWFLAKE_ACCOUNT = 'SNOWFLAKE_ACCOUNT'
    SNOWFLAKE_DEFAULT_WH = 'SNOWFLAKE_DEFAULT_WH'
    SNOWFLAKE_DEFAULT_DB = 'SNOWFLAKE_DEFAULT_DB'
    SNOWFLAKE_DEFAULT_SCHEMA = 'SNOWFLAKE_DEFAULT_SCHEMA'


class BaseConfigLoader(ABC):
    """
    Base configuration loader class. This base class is no more than a read-only
    mapping that defines an interface for reading configuration settings.
    """

    @abstractmethod
    def get(self, key: str, **kwargs) -> Any:
        """
        Loads the secret stored under `key`.

        Args:
            key (str): The key value of the secret to load

        Returns:
            Any: The secret stored under `key` in the secret manager
        """
        pass

    def __getitem__(self, key: str) -> Any:
        return self.get(key)


class AWSSecretLoader(BaseConfigLoader):
    def __init__(self, **kwargs):
        self.client = boto3.client('secretsmanager', **kwargs)

    def get(self, secret_id: str, version_id=None, version_stage_label=None) -> Union[bytes, str]:
        """
        Loads the secret stored under `secret_id`. Can also specify the version of the
        secret to fetch. If
        - both `version_id` and `version_stage_label` are specified, both must agree on the secret version
        - neither of `version_id` or `version_stage_label` are specified, the current version is loaded
        - one of `version_id` and `version_stage_label` are specified, the associated version is loaded

        Args:
            secret_id (str): ID of the secret to load
            version_id (str, Optional): ID of the version of the secret to load. Defaults to None.
            version_stage_label (str, Optional): Staging label of the version of the secret to load. Defaults to None.s

        Returns:
            Union(bytes, str): The secret stored under `secret_id` in AWS secret manager. If secret is:
            - a binary value, returns a `bytes` object
            - a string value, returns a `string` object
        """
        try:
            response = self.client.get_secret_value(
                SecretID=secret_id,
                VersionId=version_id,
                VersionStage=version_stage_label,
            )
        except ClientError as error:
            if error.response['Error']['Code'] == 'ResourceNotFoundException':
                raise KeyError(f'Unable to load config:  secret \'{secret_id}\' not found')
            elif error.response['Error']['Code'] == 'InternalServiceError':
                raise RuntimeError(f'Unable to load config: {error.response["Error"]["Message"]}')
            else:
                raise ClientError(error.response['Error']['Message'])

        if 'SecretBinary' in response:
            return response['SecretBinary']
        else:
            return response['SecretString']


class EnvironmentVariableLoader(BaseConfigLoader):
    def get(self, env_var: str) -> Any:
        """
        Loads the config setting stored under the environment variable
        `env_var`.

        Args:
            env_var (str): Name of the environment variable to load configuration setting from

        Returns:
            Any: The configuration setting stored under `env_var`
        """
        try:
            return os.environ[env_var]
        except KeyError:
            raise KeyError(f'Unable to load config:  environment variable \'{env_var}\' not found')


class ConfigFileLoader(BaseConfigLoader):
    def get(self, key: str, **kwargs) -> Any:
        """
        Loads the secret stored under `key`.

        Args:
            key (str): The key value of the secret to load

        Returns:
            Any: The secret stored under `key` in the secret manager
        """
        pass
