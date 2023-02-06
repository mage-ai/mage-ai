from mage_ai.io.config import ConfigFileLoader, ConfigKey, EnvironmentVariableLoader
from mage_ai.tests.base_test import DBTestCase
from pathlib import Path
from unittest import mock


class ConfigLoaderTests(DBTestCase):
    def setUp(self):
        super().setUp()
        self.test_path = Path('./test')
        self.test_config_path = self.test_path / 'io_config.yaml'
        self.test_config_path_verbose = self.test_path / 'old_io_config.yaml'
        sample_yaml = """default:
  AWS_REGION: test_region
  GOOGLE_SERVICE_ACC_KEY_FILEPATH: "path/to/test/key.json"
  POSTGRES_DBNAME: my_psql_db
  REDSHIFT_TEMP_CRED_PASSWORD: a_strong_password
  REDSHIFT_PORT: 5439
  SNOWFLAKE_DEFAULT_SCHEMA: sample_schema
contains_check:
  AWS_REGION: region_test
  GOOGLE_SERVICE_ACC_KEY_FILEPATH: "a/path/to/nowhere"
  REDSHIFT_TEMP_CRED_PASSWORD: a_strong_password
  REDSHIFT_PORT: 5439
  SNOWFLAKE_DEFAULT_SCHEMA: sample_schema
a_diff_profile:
  AWS_REGION: region_test
  GOOGLE_SERVICE_ACC_KEY_FILEPATH: "a/path/to/nowhere"
  POSTGRES_DBNAME: another_psql_db
  REDSHIFT_TEMP_CRED_PASSWORD: another_strong_password
  REDSHIFT_PORT: 9453
  SNOWFLAKE_DEFAULT_SCHEMA: schema_two
template:
  REDSHIFT_CLUSTER_ID: "{{ env_var('REDSHIFT_CLUSTER') }}"
"""
        sample_yaml_verbose_format = """default:
  #  Default profile created for data IO access. Add credentials for the sources you use and
  #   remove the rest.
  BigQuery:
    credentials_mapping:
        test: 4
  AWS:
    Redshift:
      database: your_redshift_database_name
      port: your_redshift_cluster_port
    region: your_aws_region
  PostgreSQL:
    database: your_postgres_database_name
"""
        with self.test_config_path.open('w') as fout:
            fout.write(sample_yaml)
        with self.test_config_path_verbose.open('w') as fout:
            fout.write(sample_yaml_verbose_format)

    def tearDown(self):
        self.test_config_path.unlink()
        self.test_config_path_verbose.unlink()
        super().tearDown()

    def test_config_map_contains(self):
        expected_keys = [
            ConfigKey.AWS_REGION,
            ConfigKey.GOOGLE_SERVICE_ACC_KEY,
            ConfigKey.REDSHIFT_TEMP_CRED_PASSWORD,
            ConfigKey.REDSHIFT_DBUSER,
            ConfigKey.POSTGRES_DBNAME,
            ConfigKey.SNOWFLAKE_DEFAULT_SCHEMA,
            ConfigKey.REDSHIFT_CLUSTER_ID,
        ]
        default_expected_values = [True, False, True, False, False, True, False]

        config = ConfigFileLoader(self.test_config_path, profile='contains_check')
        for expected_key, expected_value in zip(expected_keys, default_expected_values):
            self.assertTrue((expected_key in config) == expected_value)

    def test_config_map_get(self):
        expected_keys = [
            ConfigKey.AWS_REGION.value,
            ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH.value,
            ConfigKey.REDSHIFT_TEMP_CRED_PASSWORD.value,
            ConfigKey.REDSHIFT_PORT.value,
            ConfigKey.POSTGRES_DBNAME.value,
            ConfigKey.SNOWFLAKE_DEFAULT_SCHEMA.value,
        ]
        default_expected_values = [
            'test_region',
            'path/to/test/key.json',
            'a_strong_password',
            5439,
            'my_psql_db',
            'sample_schema',
        ]
        diff_expected_values = [
            'region_test',
            'a/path/to/nowhere',
            'another_strong_password',
            9453,
            'another_psql_db',
            'schema_two',
        ]

        expected_keys.append(ConfigKey.REDSHIFT_CLUSTER_ID)
        default_expected_values.append(None)
        diff_expected_values.append(None)
        config = ConfigFileLoader(self.test_config_path, profile='default')
        for expected_key, expected_value in zip(expected_keys, default_expected_values):
            self.assertEqual(config[expected_key], expected_value)
        config = ConfigFileLoader(self.test_config_path, profile='a_diff_profile')
        for expected_key, expected_value in zip(expected_keys, diff_expected_values):
            self.assertEqual(config[expected_key], expected_value)

    def test_config_map_get_old(self):
        expected_keys = [
            ConfigKey.AWS_REGION,
            ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH,
            ConfigKey.REDSHIFT_CLUSTER_ID,
            ConfigKey.REDSHIFT_PORT,
            ConfigKey.POSTGRES_DBNAME,
            ConfigKey.SNOWFLAKE_DEFAULT_SCHEMA,
            'a bad key',
        ]
        default_expected_values = [
            'your_aws_region',
            None,
            None,
            'your_redshift_cluster_port',
            'your_postgres_database_name',
            None,
            None,
        ]

        config = ConfigFileLoader(self.test_config_path_verbose, profile='default')
        for expected_key, expected_value in zip(expected_keys, default_expected_values):
            self.assertEqual(config[expected_key], expected_value)

    @mock.patch('mage_ai.io.config.os')
    def test_env_map_contains(self, mock_os):
        expected_keys = [
            ConfigKey.AWS_SECRET_ACCESS_KEY,
            ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH,
            ConfigKey.REDSHIFT_DBNAME,
            ConfigKey.POSTGRES_HOST,
            ConfigKey.SNOWFLAKE_PASSWORD,
        ]
        values = [
            'aws_secret_access_key',
            'filepath',
            'test_db',
            'url_to_db',
            'a_snowflake_password',
        ]

        test_env_vars = dict(zip(expected_keys, values))
        mock_os.environ = test_env_vars

        expected_keys.append(ConfigKey.REDSHIFT_CLUSTER_ID)
        expected_keys.append(ConfigKey.SNOWFLAKE_ACCOUNT)
        expected_keys.append(ConfigKey.POSTGRES_USER)
        expected_keys.append(ConfigKey.POSTGRES_DBNAME)

        expected_values = [True] * 5 + [False] * 4

        env_loader = EnvironmentVariableLoader()
        for expected_key, expected_value in zip(expected_keys, expected_values):
            self.assertTrue((expected_key in env_loader) == expected_value)

    @mock.patch('mage_ai.io.config.os')
    def test_env_map_get(self, mock_os):
        expected_keys = [
            ConfigKey.AWS_SECRET_ACCESS_KEY,
            ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH,
            ConfigKey.REDSHIFT_DBNAME,
            ConfigKey.POSTGRES_HOST,
            ConfigKey.SNOWFLAKE_PASSWORD,
        ]
        expected_values = [
            'aws_secret_access_key',
            'filepath',
            'test_db',
            'url_to_db',
            'a_snowflake_password',
        ]

        test_env_vars = dict(zip(expected_keys, expected_values))
        mock_os.getenv = test_env_vars.get

        expected_keys.append(ConfigKey.REDSHIFT_CLUSTER_ID)
        expected_values.append(None)

        env_loader = EnvironmentVariableLoader()
        for expected_key, expected_value in zip(expected_keys, expected_values):
            self.assertEqual(env_loader[expected_key], expected_value)

    @mock.patch('mage_ai.io.config.os')
    def test_env_map_get_redshift(self, mock_os):
        test_env_vars = {'REDSHIFT_CLUSTER': 'env_var_cluster'}
        mock_os.getenv = test_env_vars.get
        config = ConfigFileLoader(self.test_config_path, profile='template')
        self.assertEqual(config[ConfigKey.REDSHIFT_CLUSTER_ID], 'env_var_cluster')
        self.assertEqual(config[ConfigKey.REDSHIFT_DBUSER], None)
