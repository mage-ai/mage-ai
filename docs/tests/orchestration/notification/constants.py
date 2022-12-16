EMAIL_NOTIFICATION_CONFIG = dict(
    email_config=dict(
        smtp_host='test_host',
        smtp_mail_from='test_from@abc.com',
        smtp_user='test_user',
        smtp_password='test_password',
        to_emails=['test_to@xyz.com'],
    )
)

SLACK_NOTIFICATION_CONFIG = dict(
    slack_config=dict(
        webhook_url='test_webhook_url',
    )
)
