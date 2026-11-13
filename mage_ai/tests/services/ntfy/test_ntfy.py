from unittest import TestCase
from unittest.mock import MagicMock, patch

import requests

from mage_ai.services.ntfy.config import NtfyConfig
from mage_ai.services.ntfy.ntfy import send_ntfy_message


class SendNtfyMessageTests(TestCase):
    def setUp(self):
        self.config = NtfyConfig.load(config={
            'base_url': 'https://ntfy.example.com',
            'topic': 'mage-alerts',
        })

    @patch('mage_ai.services.ntfy.ntfy.requests.post')
    def test_send_message_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        send_ntfy_message(self.config, 'Pipeline failed', 'Alert')

        mock_post.assert_called_once_with(
            url='https://ntfy.example.com',
            json={
                'topic': 'mage-alerts',
                'message': 'Pipeline failed',
                'title': 'Alert',
            },
            timeout=10,
        )
        mock_response.raise_for_status.assert_called_once()

    @patch('mage_ai.services.ntfy.ntfy.logger')
    @patch('mage_ai.services.ntfy.ntfy.requests.post')
    def test_send_message_http_error_is_logged(self, mock_post, mock_logger):
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
            '403 Forbidden',
        )
        mock_post.return_value = mock_response

        send_ntfy_message(self.config, 'Pipeline failed', 'Alert')

        mock_logger.exception.assert_called_once_with('Failed to send ntfy message')
