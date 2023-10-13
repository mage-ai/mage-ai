import os
import uuid

from mage_ai.services.aws import get_aws_boto3_client

EVENT_RULE_LIMIT = 100


def get_all_event_rules():
    client = get_aws_boto3_client('events')

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


def update_event_rule_targets(name):
    lambda_function_arn = os.getenv('LAMBDA_FUNCTION_ARN')
    lambda_function_name = os.getenv('LAMBDA_FUNCTION_NAME')
    if lambda_function_arn is None or lambda_function_name is None:
        return
    client = get_aws_boto3_client('events')
    event_rule_info = client.describe_rule(Name=name)
    targets = client.list_targets_by_rule(Rule=name)['Targets']
    print(f'Current targets for Event rule {name}: {targets}')
    for t in targets:
        if t['Arn'] == lambda_function_arn:
            return
    # Add target to Event rule
    targets.append(dict(Id=str(uuid.uuid4()), Arn=lambda_function_arn))
    response = client.put_targets(Rule=name, Targets=targets)
    print(f'Event rule put_target repsonse: {response}')
    # Add permission to lambda function
    lambda_client = get_aws_boto3_client('lambda')
    response = lambda_client.add_permission(
        FunctionName=lambda_function_arn,
        StatementId=str(uuid.uuid4()),
        Action='lambda:InvokeFunction',
        Principal='events.amazonaws.com',
        SourceArn=event_rule_info['Arn'],
    )
    print(f'Lambda function add_permission repsonse: {response}')
