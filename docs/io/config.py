from abc import ABC, abstractmethod
from enum import Enum
from jinja2 import Template
from mage_ai.data_preparation.shared.constants import REPO_PATH_ENV_VAR
from pathlib import Path
from typing import Any, Dict, Union
import os
import yaml


class ConfigKey(str, Enum):
    """
    List of configuration settings for use with data IO clients.
    """

    AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID'
    AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY'
    AWS_SESSION_TOKEN = 'AWS_SESSION_TOKEN'
    AWS_REGION = 'AWS_REGION'
    AZURE_CLIENT_ID = 'AZURE_CLIENT_ID'
    AZURE_CLIENT_SECRET = 'AZURE_CLIENT_SECRET'
    AZURE_STORAGE_ACCOUNT_NAME = 'AZURE_STORAGE_ACCOUNT_NAME'
    AZURE_TENANT_ID = 'AZURE_TENANT_ID'
    GOOGLE_SERVICE_ACC_KEY = 'GOOGLE_SERVICE_ACC_KEY'
    GOOGLE_SERVICE_ACC_KEY_FILEPATH = 'GOOGLE_SERVICE_ACC_KEY_FILEPATH'
    POSTGRES_DBNAME = 'POSTGRES_DBNAME'
    POSTGRES_USER = 'POSTGRES_USER'
    POSTGRES_PASSWORD = 'POSTGRES_PASSWORD'
    POSTGRES_HOST = 'POSTGRES_HOST'
    POSTGRES_PORT = 'POSTGRES_PORT'
    REDSHIFT_DBNAME = 'REDSHIFT_DBNAME'
    REDSHIFT_HOST = 'REDSHIFT_HOST'
    REDSHIFT_PORT = 'REDSHIFT_PORT'
    REDSHIFT_TEMP_CRED_USER = 'REDSHIFT_TEMP_CRED_USER'
    REDSHIFT_TEMP_CRED_PASSWORD = 'REDSHIFT_TEMP_CRED_PASSWORD'
    REDSHIFT_DBUSER = 'REDSHIFT_DBUSER'
    REDSHIFT_CLUSTER_ID = 'REDSHIFT_CLUSTER_ID'
    REDSHIFT_IAM_PROFILE = 'REDSHIFT_IAM_PROFILE'
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
    def contains(self, key: Union[ConfigKey, str], **kwargs) -> bool:
        """
        Checks if the configuration setting stored under `key` is contained.
        Args:
            key (Union[ConfigKey, str]): Name of the configuration setting to check existence of.

        Returns:
            bool: Returns true if configuration setting exists, otherwise returns false.
        """
        pass

    @abstractmethod
    def get(self, key: Union[ConfigKey, str], **kwargs) -> Any:
        """
        Loads the configuration setting stored under `key`.

        Args:
            key (Union[ConfigKey, str]): Name of the configuration setting to load

        Returns:
            Any: The configuration setting stored under `key` in the configuration manager. If key
                 doesn't exist, returns None.
        """
        pass

    def __contains__(self, key: Union[ConfigKey, str]) -> bool:
        return self.contains(key)

    def __getitem__(self, key: str) -> Any:
        return self.get(key)


class AWSSecretLoader(BaseConfigLoader):
    def __init__(self, **kwargs):
        import boto3

        self.client = boto3.client('secretsmanager', **kwargs)

    def contains(
        self, secret_id: Union[ConfigKey, str], version_id=None, version_stage_label=None
    ) -> bool:
        """
        Check if there is a secret with ID `secret_id` contained. Can also specify the version of the
        secret to check. If
        - both `version_id` and `version_stage_label` are specified, both must agree on the secret version
        - neither of `version_id` or `version_stage_label` are specified, any version is checked
        - one of `version_id` and `version_stage_label` are specified, the associated version is checked

        Args:
            secret_id (str): ID of the secret to load
            version_id (str, Optional): ID of the version of the secret to load. Defaults to None.
            version_stage_label (str, Optional): Staging label of the version of the secret to load. Defaults to None.

        Returns: bool: Returns true if secret exists, otherwise returns false.
        """
        return self.__get_secret(secret_id, version_id, version_stage_label) is not None

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
        response = self.__get_secret(secret_id, version_id, version_stage_label)
        if 'SecretBinary' in response:
            return response['SecretBinary']
        else:
            return response['SecretString']

    def __get_secret(
        self, secret_id: Union[ConfigKey, str], version_id=None, version_stage_label=None
    ) -> Dict:
        """
        Get secret with ID `secret_id`. Can also specify the version of the secret to get.
        If
        - both `version_id` and `version_stage_label` are specified, both must agree on the
          secret version
        - neither of `version_id` or `version_stage_label` are specified, a check is made for
          the current version
        - one of `version_id` and `version_stage_label` are specified, the associated version
          is loaded

        Args:
            secret_id (str): ID of the secret to load
            version_id (str, Optional): ID of the version of the secret to load. Defaults to None.
            version_stage_label (str, Optional): Staging label of the version of the secret to load.
            Defaults to None.

        Returns:
            Dict: response object returned by AWS Secrets Manager API
        """
        from botocore.exceptions import ClientError

        secret_kwargs = dict(SecretId=secret_id)

        if version_id is not None:
            secret_kwargs['VersionId'] = version_id
        if version_stage_label is not None:
            secret_kwargs['VersionStage'] = version_stage_label

        try:
            return self.client.get_secret_value(**secret_kwargs)
        except ClientError as error:
            if error.response['Error']['Code'] == 'ResourceNotFoundException':
                return None
            raise RuntimeError(f'Error loading config: {error.response["Error"]["Message"]}')


class EnvironmentVariableLoader(BaseConfigLoader):
    def contains(self, env_var: Union[ConfigKey, str]) -> bool:
        """
        Checks if the environment variable is defined.
        Args:
            key (Union[ConfigKey, str]): Name of the configuration setting to check existence of.

        Returns:
            bool: Returns true if configuration setting exists, otherwise returns false.
        """
        return env_var in os.environ

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


class VerboseConfigKey(str, Enum):
    """
    Config key headers for the verbose configuration file format.
    """

    AWS = 'AWS'
    BIGQUERY = 'BigQuery'
    POSTGRES = 'PostgreSQL'
    REDSHIFT = 'Redshift'
    SNOWFLAKE = 'Snowflake'


class ConfigFileLoader(BaseConfigLoader):
    KEY_MAP = {
        ConfigKey.AWS_ACCESS_KEY_ID: (VerboseConfigKey.AWS, 'access_key_id'),
        ConfigKey.AWS_REGION: (VerboseConfigKey.AWS, 'region'),
        ConfigKey.AWS_SECRET_ACCESS_KEY: (VerboseConfigKey.AWS, 'secret_access_key'),
        ConfigKey.AWS_SESSION_TOKEN: (VerboseConfigKey.AWS, 'session_token'),
        ConfigKey.GOOGLE_SERVICE_ACC_KEY: (VerboseConfigKey.BIGQUERY, 'credentials_mapping'),
        ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH: (
            VerboseConfigKey.BIGQUERY,
            'path_to_credentials',
        ),
        ConfigKey.REDSHIFT_CLUSTER_ID: (
            VerboseConfigKey.AWS,
            VerboseConfigKey.REDSHIFT,
            'cluster_identifier',
        ),
        ConfigKey.REDSHIFT_DBNAME: (VerboseConfigKey.AWS, VerboseConfigKey.REDSHIFT, 'database'),
        ConfigKey.REDSHIFT_DBUSER: (VerboseConfigKey.AWS, VerboseConfigKey.REDSHIFT, 'db_user'),
        ConfigKey.REDSHIFT_HOST: (VerboseConfigKey.AWS, VerboseConfigKey.REDSHIFT, 'host'),
        ConfigKey.REDSHIFT_IAM_PROFILE: (
            VerboseConfigKey.AWS,
            VerboseConfigKey.REDSHIFT,
            'profile',
        ),
        ConfigKey.REDSHIFT_PORT: (VerboseConfigKey.AWS, VerboseConfigKey.REDSHIFT, 'port'),
        ConfigKey.REDSHIFT_TEMP_CRED_PASSWORD: (
            VerboseConfigKey.AWS,
            VerboseConfigKey.REDSHIFT,
            'password',
        ),
        ConfigKey.REDSHIFT_TEMP_CRED_USER: (
            VerboseConfigKey.AWS,
            VerboseConfigKey.REDSHIFT,
            'user',
        ),
        ConfigKey.POSTGRES_DBNAME: (VerboseConfigKey.POSTGRES, 'database'),
        ConfigKey.POSTGRES_HOST: (VerboseConfigKey.POSTGRES, 'host'),
        ConfigKey.POSTGRES_PASSWORD: (VerboseConfigKey.POSTGRES, 'password'),
        ConfigKey.POSTGRES_PORT: (VerboseConfigKey.POSTGRES, 'port'),
        ConfigKey.POSTGRES_USER: (VerboseConfigKey.POSTGRES, 'user'),
        ConfigKey.SNOWFLAKE_ACCOUNT: (VerboseConfigKey.SNOWFLAKE, 'account'),
        ConfigKey.SNOWFLAKE_DEFAULT_DB: (VerboseConfigKey.SNOWFLAKE, 'database'),
        ConfigKey.SNOWFLAKE_DEFAULT_SCHEMA: (VerboseConfigKey.SNOWFLAKE, 'schema'),
        ConfigKey.SNOWFLAKE_DEFAULT_WH: (VerboseConfigKey.SNOWFLAKE, 'warehouse'),
        ConfigKey.SNOWFLAKE_PASSWORD: (VerboseConfigKey.SNOWFLAKE, 'password'),
        ConfigKey.SNOWFLAKE_USER: (VerboseConfigKey.SNOWFLAKE, 'user'),
    }

    def __init__(
        self,
        filepath: os.PathLike = None,
        profile='default',
        config: Dict = None,
    ) -> None:
        """
        Initializes IO Configuration loader. Input configuration file can have two formats:
        - Standard: contains a subset of the configuration keys specified in `ConfigKey`. This
          is the default and recommended format
        - Verbose: Instead of configuration keys, each profile stores an object of settings associated with
          each data migration client. This format was used in previous versions of this tool, and exists
          for backwards compatibility.

        Args:
            filepath (os.PathLike, optional): Path to IO configuration file.
            Defaults to '[repo_path]/io_config.yaml'
            profile (str, optional): Profile to load configuration settings from. Defaults to 'default'.
        """
        if config:
            self.config = config
        else:
            if filepath is None:
                filepath = os.environ[REPO_PATH_ENV_VAR] / 'io_config.yaml'
            self.filepath = Path(filepath)
            self.profile = profile
            with self.filepath.open('r') as fin:
                config_file = Template(fin.read()).render(env_var=os.getenv)
                self.config = yaml.full_load(config_file)[profile]

        self.use_verbose_format = any(source in self.config.keys() for source in VerboseConfigKey)

    def contains(self, key: Union[ConfigKey, str]) -> Any:
        """
        Checks if the configuration setting stored under `key` is contained.

        Args:
            key (str): Name of the configuration setting to check.

        Returns:
            (bool) Returns true if configuration setting exists, otherwise returns false
        """
        if self.use_verbose_format:
            return self.__traverse_verbose_config(key) is not None
        return key in self.config

    def get(self, key: Union[ConfigKey, str]) -> Any:
        """
        Loads the configuration setting stored under `key`.

        Args:
            key (str): Key name of the configuration setting to load

        Returns:
            (Any) Configuration setting corresponding to the given key.
        """
        if self.use_verbose_format:
            return self.__traverse_verbose_config(key)
        return self.config.get(key)

    def __traverse_verbose_config(self, key: Union[ConfigKey, str]) -> Any:
        """
        Traverses a configuration file in verbose format to fetch the
        value if exists; else returns None.
        """
        keys = self.KEY_MAP.get(key)
        if keys is None:
            return None
        branch = self.config
        for key in keys:
            if branch is None:
                return None
            branch = branch.get(key)
        return branch
