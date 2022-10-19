from mage_ai.orchestration.notification.config import NotificationConfig
from mage_ai.tests.base_test import TestCase
from mage_ai.tests.orchestration.notification.constants import (
    EMAIL_NOTIFICATION_CONFIG,
    SLACK_NOTIFICATION_CONFIG,
)


class NotificationConfigTests(TestCase):

    def test_load_config(self):
        notification_config_empty = dict()
        notification_config_email = EMAIL_NOTIFICATION_CONFIG
        notification_config_slack = SLACK_NOTIFICATION_CONFIG
        config1 = NotificationConfig.load(config=notification_config_empty)
        config2 = NotificationConfig.load(config=notification_config_email)
        config3 = NotificationConfig.load(config=notification_config_slack)

        self.assertIsNone(config1.email_config)
        self.assertIsNone(config1.slack_config)

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
