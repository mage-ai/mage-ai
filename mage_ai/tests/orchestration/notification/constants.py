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


NTFY_NOTIFICATION_CONFIG = dict(
    alert_on=[
        'trigger_failure',
        'trigger_success',
    ],
    ntfy_config=dict(
        base_url='https://ntfy.sh',
        topic='test_topic',
    )
)

NTFY_NOTIFICATION_CONFIG_WITH_CUSTOM_TEMPLATE = dict(
    alert_on=[
        'trigger_failure',
        'trigger_success',
    ],
    ntfy_config=dict(
        base_url='https://ntfy.sh',
        topic='test_topic',
    ),
    message_templates=dict(
        failure=dict(
            title='Pipeline {pipeline_uuid} failed at {execution_time}',
            summary='Failed: {pipeline_run_url} | trigger={pipeline_schedule_name} '
                    '(id={pipeline_schedule_id}) | desc={pipeline_schedule_description} '
                    '| error={error} | stacktrace={stacktrace}',
        )
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
