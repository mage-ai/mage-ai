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

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_user_agent_extra_is_versioned(self, mock_boto_client):
        BackblazeB2()
        _, kwargs = mock_boto_client.call_args
        user_agent_extra = kwargs['config'].user_agent_extra
        self.assertTrue(user_agent_extra.startswith('b2ai-mage-ai/'))

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_user_agent_extra_appends_caller_value(self, mock_boto_client):
        BackblazeB2(user_agent_extra='custom-app/1.0')
        _, kwargs = mock_boto_client.call_args
        user_agent_extra = kwargs['config'].user_agent_extra
        # Base UA is preserved and the caller's value is appended, not replaced.
        self.assertTrue(user_agent_extra.startswith('b2ai-mage-ai/'))
        self.assertTrue(user_agent_extra.endswith(' custom-app/1.0'))

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_caller_config_user_agent_appended_and_other_settings_kept(
        self, mock_boto_client,
    ):
        from botocore.config import Config

        BackblazeB2(config=Config(user_agent_extra='custom-app/2.0', read_timeout=42))
        _, kwargs = mock_boto_client.call_args
        config = kwargs['config']
        self.assertTrue(config.user_agent_extra.startswith('b2ai-mage-ai/'))
        self.assertIn('custom-app/2.0', config.user_agent_extra)
        # The caller's other Config settings survive the merge.
        self.assertEqual(config.read_timeout, 42)

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_user_agent_extra_appends_both_kwarg_and_config(self, mock_boto_client):
        from botocore.config import Config

        BackblazeB2(
            user_agent_extra='kwarg-app/1.0',
            config=Config(user_agent_extra='config-app/2.0'),
        )
        _, kwargs = mock_boto_client.call_args
        user_agent_extra = kwargs['config'].user_agent_extra
        # When both channels are used, the base UA and both extras are present.
        self.assertTrue(user_agent_extra.startswith('b2ai-mage-ai/'))
        self.assertIn('config-app/2.0', user_agent_extra)
        self.assertIn('kwarg-app/1.0', user_agent_extra)

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
    def test_with_config_forwards_region_but_not_config_session_token(
        self, mock_boto_client,
    ):
        config = _DictConfigLoader({
            ConfigKey.B2_APPLICATION_KEY_ID: 'b2-key-id',
            ConfigKey.B2_APPLICATION_KEY: 'b2-secret',
            ConfigKey.AWS_REGION: 'us-east-1',
            ConfigKey.AWS_SESSION_TOKEN: 'session-token-value',
        })

        BackblazeB2.with_config(config)

        _, kwargs = mock_boto_client.call_args
        self.assertEqual(kwargs.get('region_name'), 'us-east-1')
        # B2 does not support session tokens; AWS_SESSION_TOKEN from config is ignored.
        self.assertIsNone(kwargs.get('aws_session_token'))

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_with_config_forwards_explicit_session_token(self, mock_boto_client):
        config = _DictConfigLoader({
            ConfigKey.B2_APPLICATION_KEY_ID: 'b2-key-id',
            ConfigKey.B2_APPLICATION_KEY: 'b2-secret',
            ConfigKey.AWS_SESSION_TOKEN: 'config-token-ignored',
        })

        BackblazeB2.with_config(config, aws_session_token='explicit-token')

        _, kwargs = mock_boto_client.call_args
        self.assertEqual(kwargs.get('aws_session_token'), 'explicit-token')

    @mock.patch('mage_ai.io.s3.boto3.client')
    def test_with_config_kwargs_override_config(self, mock_boto_client):
        config = _DictConfigLoader({
            ConfigKey.B2_APPLICATION_KEY_ID: 'b2-key-id',
            ConfigKey.B2_APPLICATION_KEY: 'b2-secret',
            ConfigKey.B2_ENDPOINT_URL: 'https://s3.us-west-004.backblazeb2.com',
        })

        # Passing a known key explicitly must override config, not raise TypeError.
        BackblazeB2.with_config(
            config,
            endpoint_url='https://s3.eu-central-003.backblazeb2.com',
            aws_access_key_id='override-id',
        )

        _, kwargs = mock_boto_client.call_args
        self.assertEqual(
            kwargs.get('endpoint_url'),
            'https://s3.eu-central-003.backblazeb2.com',
        )
        self.assertEqual(kwargs.get('aws_access_key_id'), 'override-id')
