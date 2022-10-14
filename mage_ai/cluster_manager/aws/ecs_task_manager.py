from botocore.config import Config
from functools import reduce
from mage_ai.services.aws.ecs.config import EcsConfig
from mage_ai.services.aws.ecs.ecs import list_tasks, run_task, stop_task
from mage_ai.shared.array import find
from mage_ai.shared.hash import dig
from typing import Dict, List

import boto3
import json
import os

class EcsTaskManager:
    def __init__(self, cluster_name):
        self.cluster_name = cluster_name

        self.metadata_file = os.path.join(
            os.getcwd(),
            'instance_metadata.json',
        )

        if not os.path.exists(self.metadata_file):
            self.instance_metadata = {}

    @property
    def instance_metadata(self):
        metadata = {}
        with open(self.metadata_file, 'r', encoding='utf-8') as file:
            metadata = json.load(file)
        return metadata

    @instance_metadata.setter
    def instance_metadata(self, metadata):
        with open(self.metadata_file, 'w', encoding='utf-8') as file:
            json.dump(metadata, file)

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
                name=name.get('value') if name is not None else None,
                status=task['lastStatus'],
                task_arn=task['taskArn'],
                type=task['launchType'],
            ))

        running_instance_names = set(map(lambda x: x['name'], tasks))

        stopped_instance_names = \
            [name for name in list(self.instance_metadata.keys()) if name not in running_instance_names]
        stopped_instances = \
            list(
                map(
                    lambda name: { 'name': name, 'status': 'STOPPED' },
                    stopped_instance_names
                )
            )

        return tasks + stopped_instances

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

        self.instance_metadata = {
            **self.instance_metadata,
            name: dict()
        }

        return run_task(f'mage start {name}', ecs_config=ecs_config)

    def stop_task(self, task_arn: str):
        return stop_task(task_arn, self.cluster_name)

    def delete_task(self, name, task_arn: str = None):
        if task_arn:
            self.stop_task(task_arn)

        updated_metadata = self.instance_metadata

        if name in updated_metadata:
            del updated_metadata[name]
            self.instance_metadata = updated_metadata

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
