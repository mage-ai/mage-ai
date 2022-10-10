from botocore.config import Config
from functools import reduce
from mage_ai.services.aws.ecs.config import EcsConfig
from mage_ai.services.aws.ecs.ecs import list_tasks, run_task
from mage_ai.shared.array import find
from mage_ai.shared.hash import dig
from typing import Dict, List

import boto3
import os


CLUSTER_NAME = 'mage-data-prep-development-cluster'

class EcsTaskManager:
    def __init__(self, cluster_name=CLUSTER_NAME):
        self.cluster_name = cluster_name

    def list_tasks(self):
        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        ec2_client = boto3.client('ec2', config=config)
        response = list_tasks(self.cluster_name)['tasks']

        network_interfaces = self.__get_network_interfaces(response, ec2_client)

        tasks = []

        for task in response:
            public_ip = dig(network_interfaces.get(task['taskArn']), 'Association.PublicIp')

            tags = task['tags']
            name = find(lambda tag: tag.get('key') == 'name', tags)

            tasks.append(dict(
                ip=public_ip,
                group=task['group'],
                name=name.get('value') if name is not None else None,
                status=task['lastStatus'],
                type=task['launchType'],
            ))

        return tasks

    def create_task(self, name: str, task_definition: str, container_name: str):
        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        ec2_client = boto3.client('ec2', config=config)

        # create new task
        task = find(
            lambda task: task.get('lastStatus') == 'RUNNING',
            list_tasks(self.cluster_name)['tasks'],
        )
        network_interface = self.__get_network_interfaces([task], ec2_client)[task['taskArn']]

        subnets = [network_interface['SubnetId']]
        security_groups = [g['GroupId'] for g in network_interface['Groups']]

        ecs_config = EcsConfig(
            task_definition,
            container_name,
            self.cluster_name,
            security_groups=security_groups,
            subnets=subnets,
            tags=[
                {
                    'key': 'name',
                    'value': name,
                }
            ],
        )

        return run_task(f'mage start {name}', ecs_config=ecs_config)

    def __get_network_interface_id(self, task):
        if task.get('lastStatus') != 'RUNNING':
            return None

        attachment = \
            find(lambda a: a['type'] == 'ElasticNetworkInterface', task.get('attachments', []))
        network_interface = \
            find(lambda d: d['name'] == 'networkInterfaceId', attachment.get('details', []))
        return network_interface.get('value', None)


    def __get_network_interfaces(self, tasks: List, ec2_client) -> Dict:
        task_mapping = dict()
        for task in tasks:
            nii = self.__get_network_interface_id(task)
            if nii is not None:
                task_mapping[task['taskArn']] = nii

        network_interface_ids = list(task_mapping.values())

        network_interfaces = ec2_client.describe_network_interfaces(
            NetworkInterfaceIds=network_interface_ids
        )['NetworkInterfaces']

        def aggregate(obj, task):
            task_arn = task['taskArn']
            if task_arn in task_mapping:
                obj[task_arn] = find(
                    lambda i: i['NetworkInterfaceId'] == task_mapping[task_arn],
                    network_interfaces,
                )
            return obj

        return reduce(aggregate, tasks, {})
