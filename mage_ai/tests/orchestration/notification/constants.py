EMAIL_NOTIFICATION_CONFIG = dict(
    alert_on=[
        'trigger_failure',
        'trigger_success',
    ],
    email_config=dict(
        smtp_host='test_host',
        smtp_mail_from='test_from@abc.com',
        smtp_user='test_user',
        smtp_password='test_password',
        to_emails=['test_to@xyz.com'],
    )
)

SLACK_NOTIFICATION_CONFIG = dict(
    alert_on=[
        'trigger_failure',
        'trigger_success',
    ],
    slack_config=dict(
        webhook_url='test_webhook_url',
    )
)

SLACK_NOTIFICATION_CONFIG_WITH_CUSTOM_TEMPLATE = dict(
    alert_on=[
        'trigger_failure',
        'trigger_success',
    ],
    slack_config=dict(
        webhook_url='test_webhook_url',
    ),
    message_templates=dict(
        failure=dict(
            details='Failed to execute pipeline {pipeline_run_url}. '
                    'Pipeline uuid: {pipeline_uuid}. Trigger name: {pipeline_schedule_name}.',
        )
    )
)

GOOGLE_CHAT_NOTIFICATION_CONFIG = dict(
    alert_on=[
        'trigger_failure',
        'trigger_success',
    ],
    google_chat_config=dict(
        webhook_url='test_webhook_url',
    )
)

TEAMS_NOTIFICATION_CONFIG = dict(
    alert_on=[
        'trigger_failure',
        'trigger_success',
    ],
    teams_config=dict(
        webhook_url='test_webhook_url',
    )
)


TEAMS_NOTIFICATION_CONFIG_NO_ALERT_ON = dict(
    alert_on=[],
    teams_config=dict(
        webhook_url='test_webhook_url',
    )
)


OPSGENIE_NOTIFICATION_CONFIG = dict(
    alert_on=[
        'trigger_failure',
        'trigger_success',
    ],
    opsgenie_config=dict(
        url='test_url',
        api_key='test_api_key',
    )
)
