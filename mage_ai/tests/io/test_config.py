from mage_ai.io.config import ConfigFileLoader, ConfigKey
from mage_ai.tests.base_test import TestCase


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
