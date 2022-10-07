from typing import List
from botocore.config import Config
from mage_ai.services.aws.ecs.ecs import create_environment_task, list_tasks
from mage_ai.shared.array import find

import boto3
import os

from mage_ai.shared.hash import dig


CLUSTER_NAME = 'mage-data-prep-development-cluster'

class EcsTaskManager():
    def __init__(self, cluster_name=CLUSTER_NAME):
        self.cluster_name = cluster_name

    def list_tasks(self):
        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        ec2_client = boto3.client('ec2', config=config)
        response = list_tasks(self.cluster_name)['tasks']

        network_interfaces = self.__get_network_interfaces(response, ec2_client)

        tasks = []

        for index, task in enumerate(response):
            public_ip = dig(network_interfaces[index], 'Association.PublicIp')

            tasks.append(dict(
                ip=public_ip,
                group=task['group'],
                status=task['lastStatus'],
                type=task['launchType'],
            ))

        return tasks

    def create_task(self, name: str):
        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        ec2_client = boto3.client('ec2', config=config)
        ecs_client = boto3.client('ecs', config=config)

        # create new task definition
        base_td = \
            ecs_client.describe_task_definition(
                taskDefinition='mage-dev-dev-task'
            )['taskDefinition']
        remove_args = [
            'compatibilities',
            'registeredAt',
            'registeredBy',
            'requiresAttributes',
            'revision',
            'status',
            'taskDefinitionArn',
        ]
        for arg in remove_args:
            base_td.pop(arg)

        container_path = f'/home/src/{name}'
        container_definition = next(iter(base_td.get('containerDefinitions', [])))
        mount_point = next(iter(container_definition.get('mountPoints', [])))
        mount_points = [{
            **mount_point,
            'containerPath': container_path,
        }]

        new_td_name = f'{base_td["family"]}_{name}'

        updated_td = {
            **base_td,
            'family': new_td_name,
            'containerDefinitions': list(map(
                lambda x: { **x, 'mountPoints': mount_points },
                base_td['containerDefinitions'],
            )),
        }

        ecs_client.register_task_definition(**updated_td)

        # create new task
        response = list_tasks(self.cluster_name)['tasks']
        network_interface = self.__get_network_interfaces(response, ec2_client)[0]

        subnets = [network_interface['SubnetId']]
        security_groups = [g['GroupId'] for g in network_interface['Groups']]

        return create_environment_task(
            self.cluster_name,
            subnets,
            security_groups,
            new_td_name,
        )

    def __get_network_interface_id(self, task: str):
        attachment = \
            find(lambda a: a['type'] == 'ElasticNetworkInterface', task.get('attachments', []))
        network_interface = \
            find(lambda d: d['name'] == 'networkInterfaceId', attachment.get('details', []))
        return network_interface.get('value', None)


    def __get_network_interfaces(self, tasks: List, ec2_client):
        network_interface_ids = [self.__get_network_interface_id(task) for task in tasks]

        return ec2_client.describe_network_interfaces(
            NetworkInterfaceIds=network_interface_ids
        )['NetworkInterfaces']
