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


TEAMS_NOTIFICATION_CONFIG = dict(
    teams_config=dict(
        webhook_url='https://revosauto.webhook.office.com/webhookb2/58ad38d7-78e0-4f71-b486-4b1bd9d6766a@38cb47ac-2bbf-436d-a973-3336374b629c/IncomingWebhook/44ef4a958c724032b253632d35dc6fa4/4f6cc58b-9ef4-462b-83a5-bef6b78cc1d5',
    )
)
