from unittest.mock import Mock, patch

import requests

from mage_ai.streaming.sources.kafka_oauth import ClientCredentialsTokenProvider
from mage_ai.tests.base_test import TestCase


class ClientCredentialsTokenProviderTests(TestCase):
    def test_init(self):
        """Test token provider initialization"""
        provider = ClientCredentialsTokenProvider(
            token_url='https://auth.example.com/token',
            client_id='test_client',
            client_secret='test_secret',
            scope='kafka',
        )

        self.assertEqual(provider.token_url, 'https://auth.example.com/token')
        self.assertEqual(provider.client_id, 'test_client')
        self.assertEqual(provider.client_secret, 'test_secret')
        self.assertEqual(provider.scope, 'kafka')
        self.assertIsNone(provider._access_token)
        self.assertIsNone(provider._token_expiry_time)

    @patch('mage_ai.streaming.sources.kafka_oauth.requests.post')
    def test_token_fetch(self, mock_post):
        """Test successful token fetch"""
        mock_response = Mock()
        mock_response.json.return_value = {
            'access_token': 'test_token_123',
            'expires_in': 3600,
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        provider = ClientCredentialsTokenProvider(
            token_url='https://auth.example.com/token',
            client_id='test_client',
            client_secret='test_secret',
        )

        token = provider.token()

        self.assertEqual(token, 'test_token_123')
        mock_post.assert_called_once_with(
            'https://auth.example.com/token',
            data={
                'grant_type': 'client_credentials',
                'client_id': 'test_client',
                'client_secret': 'test_secret',
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=10,
        )

    @patch('mage_ai.streaming.sources.kafka_oauth.requests.post')
    def test_token_fetch_with_scope(self, mock_post):
        """Test token fetch with scope parameter"""
        mock_response = Mock()
        mock_response.json.return_value = {
            'access_token': 'test_token_123',
            'expires_in': 3600,
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        provider = ClientCredentialsTokenProvider(
            token_url='https://auth.example.com/token',
            client_id='test_client',
            client_secret='test_secret',
            scope='kafka',
        )

        token = provider.token()

        self.assertEqual(token, 'test_token_123')
        mock_post.assert_called_once_with(
            'https://auth.example.com/token',
            data={
                'grant_type': 'client_credentials',
                'client_id': 'test_client',
                'client_secret': 'test_secret',
                'scope': 'kafka',
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=10,
        )

    @patch('mage_ai.streaming.sources.kafka_oauth.requests.post')
    def test_token_reuse(self, mock_post):
        """Test that token is reused when not expired"""
        mock_response = Mock()
        mock_response.json.return_value = {
            'access_token': 'test_token_123',
            'expires_in': 3600,
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        provider = ClientCredentialsTokenProvider(
            token_url='https://auth.example.com/token',
            client_id='test_client',
            client_secret='test_secret',
        )

        # First call should fetch token
        token1 = provider.token()
        self.assertEqual(token1, 'test_token_123')
        self.assertEqual(mock_post.call_count, 1)

        # Second call should reuse token
        token2 = provider.token()
        self.assertEqual(token2, 'test_token_123')
        self.assertEqual(mock_post.call_count, 1)

    @patch('mage_ai.streaming.sources.kafka_oauth.requests.post')
    @patch('mage_ai.streaming.sources.kafka_oauth.time.time')
    def test_token_refresh_on_expiry(self, mock_time, mock_post):
        """Test that token is refreshed when expired"""
        mock_response = Mock()
        mock_response.json.return_value = {
            'access_token': 'test_token_123',
            'expires_in': 120,
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        # Start time
        mock_time.return_value = 1000.0

        provider = ClientCredentialsTokenProvider(
            token_url='https://auth.example.com/token',
            client_id='test_client',
            client_secret='test_secret',
            token_expiry_buffer=60,
        )

        # First call should fetch token
        token1 = provider.token()
        self.assertEqual(token1, 'test_token_123')
        self.assertEqual(mock_post.call_count, 1)

        # Move time forward but not past expiry buffer
        mock_time.return_value = 1030.0
        token2 = provider.token()
        self.assertEqual(token2, 'test_token_123')
        self.assertEqual(mock_post.call_count, 1)

        # Move time forward past expiry buffer
        # Token expires at 1000 + 120 = 1120, buffer is 60, so refresh at 1060
        mock_response.json.return_value = {
            'access_token': 'test_token_456',
            'expires_in': 120,
        }
        mock_time.return_value = 1070.0
        token3 = provider.token()
        self.assertEqual(token3, 'test_token_456')
        self.assertEqual(mock_post.call_count, 2)

    @patch('mage_ai.streaming.sources.kafka_oauth.requests.post')
    def test_token_fetch_failure(self, mock_post):
        """Test handling of token fetch failure"""
        mock_post.side_effect = requests.exceptions.RequestException('Network error')

        provider = ClientCredentialsTokenProvider(
            token_url='https://auth.example.com/token',
            client_id='test_client',
            client_secret='test_secret',
        )

        with self.assertRaises(RuntimeError) as context:
            provider.token()

        self.assertIn('Failed to fetch OAuth token', str(context.exception))

    @patch('mage_ai.streaming.sources.kafka_oauth.requests.post')
    def test_token_invalid_response(self, mock_post):
        """Test handling of invalid token response"""
        mock_response = Mock()
        mock_response.json.return_value = {
            'invalid': 'response',
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        provider = ClientCredentialsTokenProvider(
            token_url='https://auth.example.com/token',
            client_id='test_client',
            client_secret='test_secret',
        )

        with self.assertRaises(RuntimeError) as context:
            provider.token()

        self.assertIn('Invalid token response format', str(context.exception))
        self.assertIn('missing', str(context.exception))

    def test_extensions(self):
        """Test that extensions returns empty dict"""
        provider = ClientCredentialsTokenProvider(
            token_url='https://auth.example.com/token',
            client_id='test_client',
            client_secret='test_secret',
        )

        extensions = provider.extensions()
        self.assertEqual(extensions, {})
