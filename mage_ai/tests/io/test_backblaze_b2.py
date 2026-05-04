from unittest import mock

from mage_ai.io.backblaze_b2 import DEFAULT_B2_ENDPOINT_URL, BackblazeB2
from mage_ai.io.config import BaseConfigLoader, ConfigKey, VerboseConfigKey
from mage_ai.tests.base_test import TestCase


class _DictConfigLoader(BaseConfigLoader):
    """Minimal in-memory config loader for testing ``with_config``."""

    def __init__(self, values):
        self._values = values

    def contains(self, key, **kwargs):
        return key in self._values and self._values[key] is not None

    def get(self, key, **kwargs):
        return self._values.get(key)


class BackblazeB2ConfigKeyTests(TestCase):
    def test_b2_config_keys_exist_with_expected_values(self):
        self.assertEqual(ConfigKey.B2_APPLICATION_KEY_ID.value, 'B2_APPLICATION_KEY_ID')
        self.assertEqual(ConfigKey.B2_APPLICATION_KEY.value, 'B2_APPLICATION_KEY')
        self.assertEqual(ConfigKey.B2_ENDPOINT_URL.value, 'B2_ENDPOINT_URL')

    def test_backblaze_b2_verbose_config_key_exists(self):
        self.assertEqual(VerboseConfigKey.BACKBLAZE_B2.value, 'Backblaze B2')


class BackblazeB2ConstructorTests(TestCase):
    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_default_endpoint_url_is_b2(self, mock_boto_client):
        BackblazeB2()
        mock_boto_client.assert_called_once()
        args, kwargs = mock_boto_client.call_args
        self.assertEqual(args[0], 's3')
        self.assertEqual(kwargs.get('endpoint_url'), DEFAULT_B2_ENDPOINT_URL)
        self.assertEqual(
            kwargs.get('endpoint_url'),
            'https://s3.us-west-004.backblazeb2.com',
        )

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_custom_endpoint_url_overrides_default(self, mock_boto_client):
        custom_endpoint = 'https://s3.us-east-005.backblazeb2.com'
        BackblazeB2(endpoint_url=custom_endpoint)
        _, kwargs = mock_boto_client.call_args
        self.assertEqual(kwargs.get('endpoint_url'), custom_endpoint)

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_extra_kwargs_forwarded_to_boto_client(self, mock_boto_client):
        BackblazeB2(
            aws_access_key_id='id',
            aws_secret_access_key='secret',
            region_name='us-west-004',
        )
        _, kwargs = mock_boto_client.call_args
        self.assertEqual(kwargs.get('aws_access_key_id'), 'id')
        self.assertEqual(kwargs.get('aws_secret_access_key'), 'secret')
        self.assertEqual(kwargs.get('region_name'), 'us-west-004')
        self.assertEqual(kwargs.get('endpoint_url'), DEFAULT_B2_ENDPOINT_URL)


class BackblazeB2WithConfigTests(TestCase):
    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_with_config_uses_b2_keys(self, mock_boto_client):
        config = _DictConfigLoader({
            ConfigKey.B2_APPLICATION_KEY_ID: 'b2-key-id',
            ConfigKey.B2_APPLICATION_KEY: 'b2-secret',
            ConfigKey.B2_ENDPOINT_URL: None,
            ConfigKey.AWS_ACCESS_KEY_ID: 'aws-key-id',
            ConfigKey.AWS_SECRET_ACCESS_KEY: 'aws-secret',
            ConfigKey.AWS_ENDPOINT: None,
        })

        BackblazeB2.with_config(config)

        _, kwargs = mock_boto_client.call_args
        self.assertEqual(kwargs.get('aws_access_key_id'), 'b2-key-id')
        self.assertEqual(kwargs.get('aws_secret_access_key'), 'b2-secret')
        self.assertEqual(kwargs.get('endpoint_url'), DEFAULT_B2_ENDPOINT_URL)

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_with_config_falls_back_to_aws_keys(self, mock_boto_client):
        config = _DictConfigLoader({
            ConfigKey.B2_APPLICATION_KEY_ID: None,
            ConfigKey.B2_APPLICATION_KEY: None,
            ConfigKey.B2_ENDPOINT_URL: None,
            ConfigKey.AWS_ACCESS_KEY_ID: 'aws-key-id',
            ConfigKey.AWS_SECRET_ACCESS_KEY: 'aws-secret',
            ConfigKey.AWS_ENDPOINT: None,
        })

        BackblazeB2.with_config(config)

        _, kwargs = mock_boto_client.call_args
        self.assertEqual(kwargs.get('aws_access_key_id'), 'aws-key-id')
        self.assertEqual(kwargs.get('aws_secret_access_key'), 'aws-secret')
        self.assertEqual(kwargs.get('endpoint_url'), DEFAULT_B2_ENDPOINT_URL)

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_with_config_uses_aws_endpoint_when_present(self, mock_boto_client):
        custom_endpoint = 'https://s3.eu-central-003.backblazeb2.com'
        config = _DictConfigLoader({
            ConfigKey.B2_APPLICATION_KEY_ID: 'b2-key-id',
            ConfigKey.B2_APPLICATION_KEY: 'b2-secret',
            ConfigKey.B2_ENDPOINT_URL: None,
            ConfigKey.AWS_ACCESS_KEY_ID: None,
            ConfigKey.AWS_SECRET_ACCESS_KEY: None,
            ConfigKey.AWS_ENDPOINT: custom_endpoint,
        })

        BackblazeB2.with_config(config)

        _, kwargs = mock_boto_client.call_args
        self.assertEqual(kwargs.get('endpoint_url'), custom_endpoint)

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_with_config_b2_endpoint_url_takes_precedence_over_aws_endpoint(
        self, mock_boto_client,
    ):
        b2_endpoint = 'https://s3.us-west-001.backblazeb2.com'
        config = _DictConfigLoader({
            ConfigKey.B2_APPLICATION_KEY_ID: 'b2-key-id',
            ConfigKey.B2_APPLICATION_KEY: 'b2-secret',
            ConfigKey.B2_ENDPOINT_URL: b2_endpoint,
            ConfigKey.AWS_ENDPOINT: 'https://s3.us-east-005.backblazeb2.com',
        })

        BackblazeB2.with_config(config)

        _, kwargs = mock_boto_client.call_args
        self.assertEqual(kwargs.get('endpoint_url'), b2_endpoint)

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_with_config_b2_keys_take_precedence_over_aws(self, mock_boto_client):
        config = _DictConfigLoader({
            ConfigKey.B2_APPLICATION_KEY_ID: 'b2-key-id',
            ConfigKey.B2_APPLICATION_KEY: 'b2-secret',
            ConfigKey.B2_ENDPOINT_URL: None,
            ConfigKey.AWS_ACCESS_KEY_ID: 'aws-key-id',
            ConfigKey.AWS_SECRET_ACCESS_KEY: 'aws-secret',
            ConfigKey.AWS_ENDPOINT: None,
        })

        BackblazeB2.with_config(config)

        _, kwargs = mock_boto_client.call_args
        self.assertEqual(kwargs.get('aws_access_key_id'), 'b2-key-id')
        self.assertEqual(kwargs.get('aws_secret_access_key'), 'b2-secret')

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_with_config_forwards_aws_region_and_session_token(self, mock_boto_client):
        config = _DictConfigLoader({
            ConfigKey.B2_APPLICATION_KEY_ID: 'b2-key-id',
            ConfigKey.B2_APPLICATION_KEY: 'b2-secret',
            ConfigKey.AWS_REGION: 'us-east-1',
            ConfigKey.AWS_SESSION_TOKEN: 'session-token-value',
        })

        BackblazeB2.with_config(config)

        _, kwargs = mock_boto_client.call_args
        self.assertEqual(kwargs.get('region_name'), 'us-east-1')
        self.assertEqual(kwargs.get('aws_session_token'), 'session-token-value')
