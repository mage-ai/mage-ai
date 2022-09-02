from botocore.config import Config
import boto3
import os

EVENT_RULE_LIMIT = 100


def get_all_event_rules():
    region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
    config = Config(region_name=region_name)
    client = boto3.client('events', config=config)
    response = client.list_rules(
        Limit=EVENT_RULE_LIMIT
    )
    formatted_rules = [
        dict(
            name=r['Name'],
            state=r['State'],
            description=r.get('Description'),
            schedule_expression=r.get('ScheduleExpression'),
            event_pattern=r.get('EventPattern'),
        )
        for r in response['Rules']
    ]
    return formatted_rules
