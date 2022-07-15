from mage_ai.io.config import ConfigFileLoader, ConfigKey, EnvironmentVariableLoader
from mage_ai.tests.base_test import TestCase
from pathlib import Path
from unittest import mock


class ConfigLoaderTests(TestCase):
    def test_config_file_map(self):
        input_keys = [
            ConfigKey.AWS_ACCESS_KEY_ID,
            ConfigKey.GOOGLE_SERVICE_ACC_KEY,
            ConfigKey.POSTGRES_PASSWORD,
            ConfigKey.REDSHIFT_CLUSTER_ID,
            ConfigKey.SNOWFLAKE_DEFAULT_DB,
        ]
        expected_keys = [
            ('aws', 'access_key_id'),
            ('google', 'service_acc_key'),
            ('postgres', 'password'),
            ('redshift', 'cluster_id'),
            ('snowflake', 'default_db'),
        ]
        config = ConfigFileLoader('./test')
        for input_key, expected_key in zip(input_keys, expected_keys):
            expected_parent, expected_child = expected_key
            actual_parent, actual_child = config.map_keys(input_key)
            self.assertEqual(expected_parent, actual_parent)
            self.assertEqual(expected_child, actual_child)

    def test_config_map(self):

        test_path = Path('./test')
        test_path.mkdir(parents=True)
        test_config_path = test_path / 'io_config.yaml'

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
        sample_yaml = """default:
  aws:
    region: test_region
  google:
    service_acc_key_filepath: path/to/test/key.json
  postgres:
    dbname: my_psql_db
  redshift:
    temp_cred_password: a_strong_password
    port: 5439
  snowflake:
    default_schema: sample_schema
a_diff_profile:
  aws:
    region: region_test
  google:
    service_acc_key_filepath: a/path/to/nowhere
  postgres:
    dbname: another_psql_db
  redshift:
    temp_cred_password: another_strong_password
    port: 9453
  snowflake:
    default_schema: schema_two
"""

        with test_config_path.open('w') as fout:
            fout.write(sample_yaml)

        expected_keys.append(ConfigKey.REDSHIFT_CLUSTER_ID)
        default_expected_values.append(None)
        diff_expected_values.append(None)
        config = ConfigFileLoader(test_config_path, profile='default')
        for expected_key, expected_value in zip(expected_keys, default_expected_values):
            self.assertEqual(config[expected_key], expected_value)
        config = ConfigFileLoader(test_config_path, profile='a_diff_profile')
        for expected_key, expected_value in zip(expected_keys, diff_expected_values):
            self.assertEqual(config[expected_key], expected_value)

        test_config_path.unlink()
        test_path.rmdir()

    @mock.patch('mage_ai.io.config.os')
    def test_env_map(self, mock_os):
        expected_keys = [
            ConfigKey.AWS_SECRET_ACCESS_KEY.value,
            ConfigKey.GOOGLE_SERVICE_ACC_KEY_FILEPATH.value,
            ConfigKey.REDSHIFT_DBNAME.value,
            ConfigKey.POSTGRES_HOST.value,
            ConfigKey.SNOWFLAKE_PASSWORD.value,
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
