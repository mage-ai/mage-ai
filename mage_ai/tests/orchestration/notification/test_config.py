from mage_ai.orchestration.notification.config import NotificationConfig
from mage_ai.tests.base_test import TestCase
from mage_ai.tests.orchestration.notification.constants import (
    EMAIL_NOTIFICATION_CONFIG,
    SLACK_NOTIFICATION_CONFIG,
    TEAMS_NOTIFICATION_CONFIG,
    GOOGLE_CHAT_NOTIFICATION_CONFIG,
    OPSGENIE_NOTIFICATION_CONFIG
)


class NotificationConfigTests(TestCase):

    def test_load_config(self):
        notification_config_empty = dict()
        notification_config_email = EMAIL_NOTIFICATION_CONFIG
        notification_config_slack = SLACK_NOTIFICATION_CONFIG
        notification_config_teams = TEAMS_NOTIFICATION_CONFIG
        notification_config_google_chat = GOOGLE_CHAT_NOTIFICATION_CONFIG
        notification_config_opsgenie = OPSGENIE_NOTIFICATION_CONFIG
        config1 = NotificationConfig.load(config=notification_config_empty)
        config2 = NotificationConfig.load(config=notification_config_email)
        config3 = NotificationConfig.load(config=notification_config_slack)
        config4 = NotificationConfig.load(config=notification_config_teams)
        config5 = NotificationConfig.load(config=notification_config_google_chat)
        config6 = NotificationConfig.load(config=notification_config_opsgenie)

        self.assertIsNone(config1.email_config)
        self.assertIsNone(config1.slack_config)
        self.assertIsNone(config1.teams_config)
        self.assertIsNone(config1.google_chat_config)

        self.assertEqual(config2.email_config.smtp_host, 'test_host')
        self.assertEqual(config2.email_config.smtp_mail_from, 'test_from@abc.com')
        self.assertEqual(config2.email_config.smtp_user, 'test_user')
        self.assertEqual(config2.email_config.smtp_password, 'test_password')
        self.assertEqual(config2.email_config.smtp_starttls, True)
        self.assertEqual(config2.email_config.smtp_ssl, False)
        self.assertEqual(config2.email_config.smtp_port, 587)
        self.assertEqual(config2.email_config.to_emails, ['test_to@xyz.com'])
        self.assertIsNone(config2.slack_config)

        self.assertIsNone(config3.email_config)
        self.assertEqual(config3.slack_config.webhook_url, 'test_webhook_url')

        self.assertEqual(config4.teams_config.webhook_url, 'test_webhook_url')

        self.assertEqual(config5.google_chat_config.webhook_url, 'test_webhook_url')

        self.assertEqual(config6.opsgenie_config.url, 'test_url')
        self.assertEqual(config6.opsgenie_config.api_key, 'test_api_key')
