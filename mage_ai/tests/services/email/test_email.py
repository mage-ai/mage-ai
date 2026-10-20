import unittest
from unittest.mock import Mock, patch

from mage_ai.services.email.email import EmailConfig, send_email


class TestEmailSending(unittest.TestCase):
    def test_send_email_successful(self):
        # Mock EmailConfig
        config = EmailConfig(
            smtp_mail_from='sender@example.com',
            to_emails=['recipient@example.com'],
            smtp_host='smtp.example.com',
            smtp_port=587,
            smtp_user='username',
            smtp_password='password'
        )
        subject = 'Test Subject'
        message = 'This is a test message'

        # Mocking smtplib.SMTP and server methods
        smtp_mock = Mock()
        smtp_instance = smtp_mock.return_value
        smtp_instance.starttls.return_value = None
        smtp_instance.login.return_value = None

        # Call the function
        with patch('smtplib.SMTP', smtp_mock):
            send_email(config, subject, message, verbose=False)

        # Assertions
        smtp_mock.assert_called_once_with('smtp.example.com', 587)
        smtp_instance.starttls.assert_called_once()
        smtp_instance.login.assert_called_once_with('username', 'password')
        smtp_instance.send_message.assert_called_once()

    def test_send_email_no_tls(self):
        # Mock EmailConfig
        config = EmailConfig(
            smtp_mail_from='sender@example.com',
            to_emails=['recipient@example.com'],
            smtp_host='smtp.example.com',
            smtp_port=25,
        )
        subject = 'Test Subject'
        message = 'This is a test message'

        # Mocking smtplib.SMTP and server methods
        smtp_mock = Mock()
        smtp_instance = smtp_mock.return_value
        smtp_instance.starttls.return_value = None
        smtp_instance.login.return_value = None

        # Call the function
        with patch('smtplib.SMTP', smtp_mock):
            send_email(config, subject, message, verbose=False)

        # Assertions
        smtp_mock.assert_called_once_with('smtp.example.com', 25)
        self.assertEqual(smtp_instance.starttls.called, False)
        self.assertEqual(smtp_instance.login.called, False)
        smtp_instance.send_message.assert_called_once()

    def test_send_email_missing_subject_or_message(self):
        # Mock EmailConfig
        config = EmailConfig(
            smtp_mail_from='sender@example.com',
            to_emails=['recipient@example.com'],
            smtp_host='smtp.example.com',
            smtp_port=587,
            smtp_user='your_username',
            smtp_password='your_password'
        )

        with patch('smtplib.SMTP') as smtp_mock:
            # Call the function with missing subject and message
            send_email(config, None, 'Test message', verbose=False)
        # Assert that no emails were sent when either subject or message is missing
        self.assertEqual(smtp_mock.called, False)
