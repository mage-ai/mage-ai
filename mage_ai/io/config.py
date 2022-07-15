from abc import ABC, abstractmethod
from botocore.exceptions import ClientError
from enum import Enum
from pathlib import Path
from typing import Any, Tuple, Union
import boto3
import os
import re
import yaml


class ConfigKey(str, Enum):
    """
    List of configuration settings for use with data IO clients.
    """

    AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID'
    AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY'
    AWS_SESSION_TOKEN = 'AWS_SESSION_TOKEN'
    AWS_REGION = 'AWS_REGION'
    GOOGLE_SERVICE_ACC_CREDENTIALS = 'GOOGLE_SERVICE_ACC_CREDENTIALS'
    GOOGLE_ACCOUNT_CREDENTIALS = 'GOOGLE_ACCOUNT_CREDENTIALS'
    POSTGRES_DBNAME = 'POSTGRES_DB'
    POSTGRES_USER = 'POSTGRES_USER'
    POSTGRES_PASSWORD = 'POSTGRES_PASSWORD'
    POSTGRES_HOST = 'POSTGRES_HOST'
    POSTGRES_PORT = 'POSTGRES_PORT'
    REDSHIFT_DBNAME = 'REDSHIFT_DB'
    REDSHIFT_HOST = 'REDSHIFT_HOST'
    REDSHIFT_PORT = 'REDSHIFT_PORT'
    REDSHIFT_TEMP_CRED_USER = 'REDSHIFT_TEMP_CRED_USER'
    REDSHIFT_TEMP_CRED_PASSWORD = 'REDSHIFT_TEMP_CRED_PASSWORD'
    REDSHIFT_DBUSER = 'REDSHIFT_DB_USER'
    REDSHIFT_CLUSTER_ID = 'REDSHIFT_CLUSTER_ID'
    SNOWFLAKE_USER = 'SNOWFLAKE_USER'
    SNOWFLAKE_PASSWORD = 'SNOWFLAKE_PASSWORD'
    SNOWFLAKE_ACCOUNT = 'SNOWFLAKE_ACCOUNT'
    SNOWFLAKE_DEFAULT_WH = 'SNOWFLAKE_DEFAULT_WH'
    SNOWFLAKE_DEFAULT_DB = 'SNOWFLAKE_DEFAULT_DB'
    SNOWFLAKE_DEFAULT_SCHEMA = 'SNOWFLAKE_DEFAULT_SCHEMA'


class BaseConfigLoader(ABC):
    """
    Base configuration loader class. A configuration loader is a read-only storage of configuration
    settings. The source of the configuration settings is dependent on the specific loader.
    """

    @abstractmethod
    def get(self, key: Union[ConfigKey, str], **kwargs) -> Any:
        """
        Loads the configuration setting stored under `key`.

        Args:
            key (str): Key name of the configuration setting to load

        Returns:
            Any: The configuration setting stored under `key` in the configuration manager. If key
                 doesn't exist, return None
        """
        pass

    def __getitem__(self, key: str) -> Any:
        return self.get(key)


class AWSSecretLoader(BaseConfigLoader):
    def __init__(self, **kwargs):
        self.client = boto3.client('secretsmanager', **kwargs)

    def get(
        self, secret_id: Union[ConfigKey, str], version_id=None, version_stage_label=None
    ) -> Union[bytes, str]:
        """
        Loads the secret stored under `secret_id`. Can also specify the version of the
        secret to fetch. If
        - both `version_id` and `version_stage_label` are specified, both must agree on the secret version
        - neither of `version_id` or `version_stage_label` are specified, the current version is loaded
        - one of `version_id` and `version_stage_label` are specified, the associated version is loaded

        Args:
            secret_id (str): ID of the secret to load
            version_id (str, Optional): ID of the version of the secret to load. Defaults to None.
            version_stage_label (str, Optional): Staging label of the version of the secret to load. Defaults to None.

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
            if error.response['Error']['Code'] == 'InternalServiceError':
                print(f'Error loading config: server error - {error.response["Error"]["Message"]}')
            return None

        if 'SecretBinary' in response:
            return response['SecretBinary']
        else:
            return response['SecretString']


class EnvironmentVariableLoader(BaseConfigLoader):
    def get(self, env_var: Union[ConfigKey, str]) -> Any:
        """
        Loads the config setting stored under the environment variable
        `env_var`.

        Args:
            env_var (str): Name of the environment variable to load configuration setting from

        Returns:
            Any: The configuration setting stored under `env_var`
        """
        return os.getenv(env_var)


class ConfigFileLoader(BaseConfigLoader):
    KEY_PARENT = re.compile(r'^\S+_')

    def __init__(
        self, filepath: os.PathLike = './default_repo/io_config.yaml', profile='default'
    ) -> None:
        """
        Initializes IO Configuration loader

        Args:
            filepath (os.PathLike): Path to IO configuration file.
        """
        self.filepath = Path(filepath)
        self.profile = profile

    def map_keys(self, key: Union[ConfigKey, str]) -> Tuple[str, str]:
        """
        Maps ConfigKey string to the (parent, child) key pair format used
        by IOConfig.

        Args:
            key (str): Input configuration setting key to convert.

        Raises:
            ValueError: Raised if unable to separate key into (parent, child) format, indicating
            that the key is improperly formatted.

        Returns:
            Tuple[str, str]: The mapped (parent, child) key pair to use with configuration file.
        """
        parts = key.split('_', maxsplit=1)
        try:
            return parts[0].lower(), parts[1].lower()
        except:
            raise ValueError(f'Error loading config: key \'{key}\' is improperly formatted')

    def get(self, key: Union[ConfigKey, str]) -> Any:
        """
        Loads the configuration setting stored under `key`.

        Args:
            key (str): Key name of the configuration setting to load
            profile (str, optional): Profile to load the configuration setting from. Defaults to 'default'.
        """
        try:
            with self.filepath.open('r') as fin:
                config = yaml.full_load(fin.read())[self.profile]
        except FileNotFoundError:
            print(f'Error loading config: configuration file not found at \'{self.filepath}\'')
        parent, child = self.map_keys(key)
        loader_settings = config.get(parent)
        if loader_settings is None:
            return None
        return loader_settings.get(child)
