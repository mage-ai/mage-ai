import json
import os
from functools import reduce
from typing import Dict, List

from mage_ai.services.aws import get_aws_boto3_client
from mage_ai.services.aws.ecs.config import EcsConfig
from mage_ai.services.aws.ecs.ecs import list_services, list_tasks, run_task, stop_task
from mage_ai.shared.array import find
from mage_ai.shared.hash import dig


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
        ec2_client = get_aws_boto3_client('ec2')

        response = list_tasks(self.cluster_name)
        network_interfaces = self.__get_network_interfaces(response, ec2_client)

        tasks = []
        for task in response:
            public_ip = dig(network_interfaces.get(task['taskArn']), 'Association.PublicIp')

            tags = task['tags']
            name = find(lambda tag: tag.get('key') == 'name', tags)

            if name is not None:
                tasks.append(dict(
                    ip=public_ip,
                    name=name.get('value'),
                    status=task['lastStatus'],
                    task_arn=task['taskArn'],
                    type=task['launchType'],
                ))

        running_instance_names = set(map(lambda x: x['name'], tasks))

        stopped_instance_names = [
            name for name in list(self.instance_metadata.keys())
            if name not in running_instance_names
        ]
        stopped_instances = \
            list(
                map(
                    lambda name: {'name': name, 'status': 'STOPPED'},
                    stopped_instance_names
                )
            )

        return tasks + stopped_instances

    def create_task(self, name: str, task_definition: str, container_name: str):
        ec2_client = get_aws_boto3_client('ec2')

        # create new task
        def find_main_task(task):
            tags = task.get('tags')
            dev_tag = find(lambda tag: tag.get('key') == 'dev-instance', tags)
            return (dev_tag is None or dev_tag.get('value') != '1') \
                and task.get('lastStatus') == 'RUNNING'

        task = find(find_main_task, list_tasks(self.cluster_name))
        network_interface = self.__get_network_interfaces([task], ec2_client)[task['taskArn']]

        subnets = [network_interface['SubnetId']]
        security_groups = [g['GroupId'] for g in network_interface['Groups']]

        try:
            service = find(
                lambda service: service.get('status') == 'ACTIVE',
                list_services(self.cluster_name)
            )
            network_configuration = service.get('networkConfiguration')
        except Exception as err:
            print(f'Could not get network configuration with error: {str(err)}')
            network_configuration = None

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
                },
                {
                    'key': 'dev-instance',
                    'value': '1',
                }
            ],
            network_configuration=network_configuration,
            cpu=int(task.get('cpu')),
            memory=int(task.get('memory')),
        )

        self.instance_metadata = {
            **self.instance_metadata,
            name: dict()
        }

        return run_task(f'mage start {name}', ecs_config=ecs_config, wait_for_completion=False)

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
