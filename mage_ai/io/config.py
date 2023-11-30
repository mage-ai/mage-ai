import os
from abc import ABC, abstractmethod
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Union

import yaml
from jinja2 import Template

from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.settings.repo import get_repo_path


class ConfigKey(str, Enum):
    """
    List of configuration settings for use with data IO clients.
    """

    AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID'
    AWS_ENDPOINT = 'AWS_ENDPOINT'
    AWS_REGION = 'AWS_REGION'
    AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY'
    AWS_SESSION_TOKEN = 'AWS_SESSION_TOKEN'

    AZURE_CLIENT_ID = 'AZURE_CLIENT_ID'
    AZURE_CLIENT_SECRET = 'AZURE_CLIENT_SECRET'
    AZURE_STORAGE_ACCOUNT_NAME = 'AZURE_STORAGE_ACCOUNT_NAME'
    AZURE_TENANT_ID = 'AZURE_TENANT_ID'

    CHROMA_COLLECTION = 'CHROMA_COLLECTION'
    CHROMA_PATH = 'CHROMA_PATH'

    CLICKHOUSE_DATABASE = 'CLICKHOUSE_DATABASE'
    CLICKHOUSE_HOST = 'CLICKHOUSE_HOST'
    CLICKHOUSE_INTERFACE = 'CLICKHOUSE_INTERFACE'
    CLICKHOUSE_PASSWORD = 'CLICKHOUSE_PASSWORD'
    CLICKHOUSE_PORT = 'CLICKHOUSE_PORT'
    CLICKHOUSE_USERNAME = 'CLICKHOUSE_USERNAME'

    DRUID_HOST = 'DRUID_HOST'
    DRUID_PASSWORD = 'DRUID_PASSWORD'
    DRUID_PATH = 'DRUID_PATH'
    DRUID_PORT = 'DRUID_PORT'
    DRUID_SCHEME = 'DRUID_SCHEME'
    DRUID_USER = 'DRUID_USER'

    DUCKDB_DATABASE = 'DUCKDB_DATABASE'
    DUCKDB_SCHEMA = 'DUCKDB_SCHEMA'

    GOOGLE_LOCATION = 'GOOGLE_LOCATION'
    GOOGLE_SERVICE_ACC_KEY = 'GOOGLE_SERVICE_ACC_KEY'
    GOOGLE_SERVICE_ACC_KEY_FILEPATH = 'GOOGLE_SERVICE_ACC_KEY_FILEPATH'

    MONGODB_COLLECTION = 'MONGODB_COLLECTION'
    MONGODB_CONNECTION_STRING = "MONGODB_CONNECTION_STRING"
    MONGODB_DATABASE = 'MONGODB_DATABASE'
    MONGODB_HOST = 'MONGODB_HOST'
    MONGODB_PASSWORD = 'MONGODB_PASSWORD'
    MONGODB_PORT = 'MONGODB_PORT'
    MONGODB_USER = 'MONGODB_USER'

    MSSQL_DATABASE = 'MSSQL_DATABASE'
    MSSQL_DRIVER = 'MSSQL_DRIVER'
    MSSQL_HOST = 'MSSQL_HOST'
    MSSQL_PASSWORD = 'MSSQL_PASSWORD'
    MSSQL_PORT = 'MSSQL_PORT'
    MSSQL_SCHEMA = 'MSSQL_SCHEMA'
    MSSQL_USER = 'MSSQL_USER'

    MYSQL_CONNECTION_METHOD = 'MYSQL_CONNECTION_METHOD'
    MYSQL_DATABASE = 'MYSQL_DATABASE'
    MYSQL_HOST = 'MYSQL_HOST'
    MYSQL_PASSWORD = 'MYSQL_PASSWORD'
    MYSQL_PORT = 'MYSQL_PORT'
    MYSQL_USER = 'MYSQL_USER'

    ORACLEDB_USER = 'ORACLEDB_USER'
    ORACLEDB_PASSWORD = 'ORACLEDB_PASSWORD'
    ORACLEDB_HOST = 'ORACLEDB_HOST'
    ORACLEDB_PORT = 'ORACLEDB_PORT'
    ORACLEDB_SERVICE = 'ORACLEDB_SERVICE'

    PINOT_HOST = 'PINOT_HOST'
    PINOT_PASSWORD = 'PINOT_PASSWORD'
    PINOT_PATH = 'PINOT_PATH'
    PINOT_PORT = 'PINOT_PORT'
    PINOT_SCHEME = 'PINOT_SCHEME'
    PINOT_USER = 'PINOT_USER'

    POSTGRES_CONNECTION_METHOD = 'POSTGRES_CONNECTION_METHOD'
    POSTGRES_CONNECT_TIMEOUT = 'POSTGRES_CONNECT_TIMEOUT'
    POSTGRES_DBNAME = 'POSTGRES_DBNAME'
    POSTGRES_HOST = 'POSTGRES_HOST'
    POSTGRES_PASSWORD = 'POSTGRES_PASSWORD'
    POSTGRES_PORT = 'POSTGRES_PORT'
    POSTGRES_SCHEMA = 'POSTGRES_SCHEMA'
    POSTGRES_SSH_HOST = 'POSTGRES_SSH_HOST'
    POSTGRES_SSH_PASSWORD = 'POSTGRES_SSH_PASSWORD'
    POSTGRES_SSH_PKEY = 'POSTGRES_SSH_PKEY'
    POSTGRES_SSH_PORT = 'POSTGRES_SSH_PORT'
    POSTGRES_SSH_USERNAME = 'POSTGRES_SSH_USERNAME'
    POSTGRES_USER = 'POSTGRES_USER'

    REDSHIFT_CLUSTER_ID = 'REDSHIFT_CLUSTER_ID'
    REDSHIFT_DBNAME = 'REDSHIFT_DBNAME'
    REDSHIFT_DBUSER = 'REDSHIFT_DBUSER'
    REDSHIFT_HOST = 'REDSHIFT_HOST'
    REDSHIFT_IAM_PROFILE = 'REDSHIFT_IAM_PROFILE'
    REDSHIFT_PORT = 'REDSHIFT_PORT'
    REDSHIFT_SCHEMA = 'REDSHIFT_SCHEMA'
    REDSHIFT_TEMP_CRED_PASSWORD = 'REDSHIFT_TEMP_CRED_PASSWORD'
    REDSHIFT_TEMP_CRED_USER = 'REDSHIFT_TEMP_CRED_USER'

    SNOWFLAKE_ACCOUNT = 'SNOWFLAKE_ACCOUNT'
    SNOWFLAKE_DEFAULT_DB = 'SNOWFLAKE_DEFAULT_DB'
    SNOWFLAKE_DEFAULT_SCHEMA = 'SNOWFLAKE_DEFAULT_SCHEMA'
    SNOWFLAKE_DEFAULT_WH = 'SNOWFLAKE_DEFAULT_WH'
    SNOWFLAKE_PASSWORD = 'SNOWFLAKE_PASSWORD'
    SNOWFLAKE_PRIVATE_KEY_PASSPHRASE = 'SNOWFLAKE_PRIVATE_KEY_PASSPHRASE'
    SNOWFLAKE_PRIVATE_KEY_PATH = 'SNOWFLAKE_PRIVATE_KEY_PATH'
    SNOWFLAKE_ROLE = 'SNOWFLAKE_ROLE'
    SNOWFLAKE_TIMEOUT = 'SNOWFLAKE_TIMEOUT'
    SNOWFLAKE_USER = 'SNOWFLAKE_USER'

    SPARK_CLUSTER = 'SPARK_CLUSTER'
    SPARK_DRIVER = 'SPARK_DRIVER'
    SPARK_ENDPOINT = 'SPARK_ENDPOINT'
    SPARK_HOST = 'SPARK_HOST'
    SPARK_METHOD = 'SPARK_METHOD'
    SPARK_ORGANIZATION = 'SPARK_ORGANIZATION'
    SPARK_PORT = 'SPARK_PORT'
    SPARK_SCHEMA = 'SPARK_SCHEMA'
    SPARK_SERVER_SIDE_PARAMETERS = 'SPARK_SERVER_SIDE_PARAMETERS'
    SPARK_TOKEN = 'SPARK_TOKEN'
    SPARK_USER = 'SPARK_USER'

    TRINO_CATALOG = 'TRINO_CATALOG'
    TRINO_HOST = 'TRINO_HOST'
    TRINO_PASSWORD = 'TRINO_PASSWORD'
    TRINO_PORT = 'TRINO_PORT'
    TRINO_SCHEMA = 'TRINO_SCHEMA'
    TRINO_USER = 'TRINO_USER'


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
    def __init__(self, **kwargs) -> None:
        import boto3

        self.client = boto3.client('secretsmanager', **kwargs)

    def contains(
        self,
        secret_id: Union[ConfigKey, str],
        version_id: Union[str, None] = None,
        version_stage_label: Union[str, None] = None,
    ) -> bool:
        """
        Check if there is a secret with ID `secret_id` contained. Can also specify the version of
        the secret to check. If
        - both `version_id` and `version_stage_label` are specified, both must agree on the secret
            version
        - neither of `version_id` or `version_stage_label` are specified, any version is checked
        - one of `version_id` and `version_stage_label` are specified, the associated version is
            checked

        Args:
            secret_id (str): ID of the secret to load
            version_id (str, Optional): ID of the version of the secret to load. Defaults to None.
            version_stage_label (str, Optional): Staging label of the version of the secret to load.
                                                    Defaults to None.

        Returns: bool: Returns true if secret exists, otherwise returns false.
        """
        return self.__get_secret(
            secret_id,
            version_id,
            version_stage_label) is not None

    def get(
        self,
        secret_id: Union[ConfigKey, str],
        version_id: Union[str, None] = None,
        version_stage_label: Union[str, None] = None,
    ) -> Union[bytes, str]:
        """
        Loads the secret stored under `secret_id`. Can also specify the version of the
        secret to fetch. If
        - both `version_id` and `version_stage_label` are specified, both must agree on the secret
            version
        - neither of `version_id` or `version_stage_label` are specified, the current version is
            loaded
        - one of `version_id` and `version_stage_label` are specified, the associated version is
            loaded

        Args:
            secret_id (str): ID of the secret to load
            version_id (str, Optional): ID of the version of the secret to load. Defaults to None.
            version_stage_label (str, Optional): Staging label of the version of the secret to load.
                                                    Defaults to None.

        Returns:
            Union(bytes, str): The secret stored under `secret_id` in AWS secret manager. If secret
            is:
            - a binary value, returns a `bytes` object
            - a string value, returns a `string` object
        """
        response = self.__get_secret(
            secret_id, version_id, version_stage_label)
        if 'SecretBinary' in response:
            return response['SecretBinary']
        else:
            return response['SecretString']

    def __get_secret(
        self,
        secret_id: Union[ConfigKey, str],
        version_id: Union[str, None] = None,
        version_stage_label: Union[str, None] = None,
    ) -> Union[Dict, None]:
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
            raise RuntimeError(
                f'Error loading config: {error.response["Error"]["Message"]}')


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
    CHROMA = 'Chroma'
    CLICKHOUSE = 'ClickHouse'
    DRUID = 'Druid'
    DUCKDB = 'Duck DB'
    PINOT = 'Pinot'
    POSTGRES = 'PostgreSQL'
    REDSHIFT = 'Redshift'
    SNOWFLAKE = 'Snowflake'
    SPARK = 'Spark'


class ConfigFileLoader(BaseConfigLoader):
    KEY_MAP = {
        ConfigKey.AWS_ACCESS_KEY_ID: (VerboseConfigKey.AWS, 'access_key_id'),
        ConfigKey.AWS_REGION: (VerboseConfigKey.AWS, 'region'),
        ConfigKey.AWS_SECRET_ACCESS_KEY: (VerboseConfigKey.AWS, 'secret_access_key'),
        ConfigKey.AWS_SESSION_TOKEN: (VerboseConfigKey.AWS, 'session_token'),
        ConfigKey.GOOGLE_LOCATION: (VerboseConfigKey.BIGQUERY, 'location'),
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
        ConfigKey.REDSHIFT_SCHEMA: (VerboseConfigKey.AWS, VerboseConfigKey.REDSHIFT, 'schema'),
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
        ConfigKey.CHROMA_COLLECTION: (
            VerboseConfigKey.CHROMA, 'collection'),
        ConfigKey.CHROMA_PATH: (
            VerboseConfigKey.CHROMA, 'path'),
        ConfigKey.CLICKHOUSE_DATABASE: (
            VerboseConfigKey.CLICKHOUSE, 'database'),
        ConfigKey.CLICKHOUSE_HOST: (
            VerboseConfigKey.CLICKHOUSE, 'host'),
        ConfigKey.CLICKHOUSE_INTERFACE: (
            VerboseConfigKey.CLICKHOUSE, 'interface'),
        ConfigKey.CLICKHOUSE_PASSWORD: (
            VerboseConfigKey.CLICKHOUSE, 'password'),
        ConfigKey.CLICKHOUSE_PORT: (
            VerboseConfigKey.CLICKHOUSE, 'port'),
        ConfigKey.CLICKHOUSE_USERNAME: (
            VerboseConfigKey.CLICKHOUSE, 'username'),
        ConfigKey.DRUID_HOST: (VerboseConfigKey.DRUID, 'host'),
        ConfigKey.DRUID_PASSWORD: (VerboseConfigKey.DRUID, 'password'),
        ConfigKey.DRUID_PATH: (VerboseConfigKey.DRUID, 'path'),
        ConfigKey.DRUID_PORT: (VerboseConfigKey.DRUID, 'port'),
        ConfigKey.DRUID_SCHEME: (VerboseConfigKey.DRUID, 'scheme'),
        ConfigKey.DRUID_USER: (VerboseConfigKey.DRUID, 'user'),
        ConfigKey.DUCKDB_DATABASE: (VerboseConfigKey.DUCKDB, 'database'),
        ConfigKey.DUCKDB_SCHEMA: (VerboseConfigKey.DUCKDB, 'schema'),
        ConfigKey.PINOT_HOST: (VerboseConfigKey.PINOT, 'host'),
        ConfigKey.PINOT_USER: (VerboseConfigKey.PINOT, 'password'),
        ConfigKey.PINOT_PATH: (VerboseConfigKey.PINOT, 'path'),
        ConfigKey.PINOT_PORT: (VerboseConfigKey.PINOT, 'port'),
        ConfigKey.PINOT_SCHEME: (VerboseConfigKey.PINOT, 'scheme'),
        ConfigKey.PINOT_USER: (VerboseConfigKey.PINOT, 'user'),
        ConfigKey.POSTGRES_DBNAME: (VerboseConfigKey.POSTGRES, 'database'),
        ConfigKey.POSTGRES_HOST: (VerboseConfigKey.POSTGRES, 'host'),
        ConfigKey.POSTGRES_PASSWORD: (VerboseConfigKey.POSTGRES, 'password'),
        ConfigKey.POSTGRES_PORT: (VerboseConfigKey.POSTGRES, 'port'),
        ConfigKey.POSTGRES_SCHEMA: (VerboseConfigKey.POSTGRES, 'schema'),
        ConfigKey.POSTGRES_USER: (VerboseConfigKey.POSTGRES, 'user'),
        ConfigKey.SNOWFLAKE_ACCOUNT: (VerboseConfigKey.SNOWFLAKE, 'account'),
        ConfigKey.SNOWFLAKE_DEFAULT_DB: (VerboseConfigKey.SNOWFLAKE, 'database'),
        ConfigKey.SNOWFLAKE_DEFAULT_SCHEMA: (VerboseConfigKey.SNOWFLAKE, 'schema'),
        ConfigKey.SNOWFLAKE_DEFAULT_WH: (VerboseConfigKey.SNOWFLAKE, 'warehouse'),
        ConfigKey.SNOWFLAKE_PASSWORD: (VerboseConfigKey.SNOWFLAKE, 'password'),
        ConfigKey.SNOWFLAKE_PRIVATE_KEY_PASSPHRASE: (
            VerboseConfigKey.SNOWFLAKE, 'private_key_passphrase'),
        ConfigKey.SNOWFLAKE_PRIVATE_KEY_PATH: (VerboseConfigKey.SNOWFLAKE, 'private_key_path'),
        ConfigKey.SNOWFLAKE_ROLE: (VerboseConfigKey.SNOWFLAKE, 'role'),
        ConfigKey.SNOWFLAKE_TIMEOUT: (VerboseConfigKey.SNOWFLAKE, 'timeout'),
        ConfigKey.SNOWFLAKE_USER: (VerboseConfigKey.SNOWFLAKE, 'user'),
        ConfigKey.SPARK_CLUSTER: (VerboseConfigKey.SPARK, 'cluster'),
        ConfigKey.SPARK_DRIVER: (VerboseConfigKey.SPARK, 'driver'),
        ConfigKey.SPARK_ENDPOINT: (VerboseConfigKey.SPARK, 'endpoint'),
        ConfigKey.SPARK_HOST: (VerboseConfigKey.SPARK, 'host'),
        ConfigKey.SPARK_METHOD: (VerboseConfigKey.SPARK, 'method'),
        ConfigKey.SPARK_ORGANIZATION: (VerboseConfigKey.SPARK, 'organization'),
        ConfigKey.SPARK_PORT: (VerboseConfigKey.SPARK, 'port'),
        ConfigKey.SPARK_SCHEMA: (VerboseConfigKey.SPARK, 'schema'),
        ConfigKey.SPARK_SERVER_SIDE_PARAMETERS: (
            VerboseConfigKey.SPARK, 'server_side_parameters'),
        ConfigKey.SPARK_TOKEN: (VerboseConfigKey.SPARK, 'token'),
        ConfigKey.SPARK_USER: (VerboseConfigKey.SPARK, 'user'),
    }

    def __init__(
        self,
        filepath: Union[os.PathLike, None] = None,
        profile: str = 'default',
        config: Union[Dict, None] = None,
    ) -> None:
        """
        Initializes IO Configuration loader. Input configuration file can have two formats:
        - Standard: contains a subset of the configuration keys specified in `ConfigKey`. This
          is the default and recommended format
        - Verbose: Instead of configuration keys, each profile stores an object of settings
          associated with each data migration client. This format was used in previous versions
          of this tool, and exists for backwards compatibility.

        Args:
            filepath (os.PathLike, optional): Path to IO configuration file.
            Defaults to '[repo_path]/io_config.yaml'
            profile (str, optional): Profile to load configuration settings from. Defaults to
                                        'default'.
        """
        self.version = None

        if config:
            self.config = config
        else:
            if filepath is None:
                filepath = os.path.join(get_repo_path(), 'io_config.yaml')
            self.filepath = Path(filepath)
            self.profile = profile
            with self.filepath.open('r') as fin:
                config_file = Template(fin.read()).render(
                    **get_template_vars(),
                )
                config = yaml.full_load(config_file)
                self.config = config[profile]
                self.version = config.get('version')

        self.use_verbose_format = any(
            source in self.config.keys() for source in VerboseConfigKey)

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
