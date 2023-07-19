import json
import os
from enum import Enum
from functools import reduce
from typing import Dict, List

import boto3
from botocore.config import Config

from mage_ai.services.aws.ecs.config import EcsConfig
from mage_ai.services.aws.ecs.ecs import list_services, list_tasks, run_task, stop_task
from mage_ai.shared.array import find
from mage_ai.shared.hash import dig


class InstanceType(str, Enum):
    SERVICE = 'service'
    TASK = 'task'


class EcsManager:
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

    def list_services(self):
        response = list_services(self.cluster_name)

        services = []
        for service in response:
            tags = service.get('tags', {})
            dev_instance = find(lambda tag: tag.get('key') == 'dev-instance', tags)
            if dev_instance is None or dev_instance.get('value') != '1':
                continue
            name_tag = find(lambda tag: tag.get('key') == 'name', tags)

            if name_tag is not None:
                tg_arn = service.get('loadBalancers')[0].get('targetGroupArn')
                target_group = self.get_target_group(tg_arn)
                lb_arn = target_group.get('LoadBalancerArns')[0]
                load_balancer = self.get_load_balancer(lb_arn)
                services.append(dict(
                    ip=load_balancer.get('DNSName'),
                    name=name_tag.get('value'),
                    status=service.get('status'),
                    service_arn=service.get('serviceArn'),
                    type=InstanceType.SERVICE,
                ))

        return services

    def list_tasks(self):
        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        ec2_client = boto3.client('ec2', config=config)

        response = list_tasks(self.cluster_name)
        network_interfaces = self.__get_network_interfaces(response, ec2_client)

        tasks = []
        for task in response:
            public_ip = dig(network_interfaces.get(task['taskArn']), 'Association.PublicIp')

            tags = task['tags']
            name = find(lambda tag: tag.get('key') == 'name', tags)

            if name is not None:
                tasks.append(dict(
                    ip=f'{public_ip}:6789',
                    name=name.get('value'),
                    status=task['lastStatus'],
                    task_arn=task['taskArn'],
                    type=InstanceType.TASK,
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

    def create_instance(self, instance_type: InstanceType, *args):
        if instance_type == InstanceType.SERVICE:
            self.create_service(*args)
        elif instance_type == InstanceType.TASK:
            self.create_task(*args)

    def create_service(self, name: str, task_definition: str, container_name: str):
        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        ecs_client = boto3.client('ecs', config=config)

        # create load balancer
        service = find(
            lambda service: service.get('status') == 'ACTIVE',
            list_services(self.cluster_name)
        )
        service_load_balancer = find(
            lambda lb: lb.get('containerPort') == 6789,
            service.get('loadBalancers'),
        )
        lb = None
        try:
            lb = self.create_load_balancer(
                name,
                service_load_balancer,
                container_name,
            )
        except Exception:
            pass

        service_args = {
            'serviceName': name,
            'cluster': self.cluster_name,
            'desiredCount': service.get('desiredCount'),
            'networkConfiguration': service.get('networkConfiguration'),
            'launchType': service.get('launchType'),
            'taskDefinition': task_definition,
            'loadBalancers': [lb] if lb else [],
            'tags': [
                {
                    'key': 'name',
                    'value': name,
                },
                {
                    'key': 'dev-instance',
                    'value': '1',
                }
            ],
        }
        response = ecs_client.create_service(**service_args)

        return response

    def create_load_balancer(self, name: str, existing_lb: Dict, container_name: str) -> Dict:
        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        elbv2_client = boto3.client('elbv2', config=config)
        name = name.replace('_', '-')
        if existing_lb is not None:
            existing_target_group = elbv2_client.describe_target_groups(
                TargetGroupArns=[existing_lb.get('targetGroupArn')]
            ).get('TargetGroups')[0]

            existing_lb_arn = existing_target_group.pop('LoadBalancerArns')[0]
            existing_load_balancer = elbv2_client.describe_load_balancers(
                LoadBalancerArns=[existing_lb_arn]
            ).get('LoadBalancers')[0]

            subnets = [
                az.get('SubnetId')
                for az in existing_load_balancer.get('AvailabilityZones', [])
            ]
            load_balancer_name = f'{name}-lb'
            load_balancer = elbv2_client.create_load_balancer(
                Name=load_balancer_name,
                Subnets=subnets,
                SecurityGroups=existing_load_balancer.get('SecurityGroups'),
                Scheme=existing_load_balancer.get('Scheme'),
                IpAddressType=existing_load_balancer.get('IpAddressType'),
                Tags=[{'Key': 'Name', 'Value': load_balancer_name}],
                Type=existing_load_balancer.get('Type'),
            ).get('LoadBalancers')[0]

            target_group_name = f'{name}-tg'
            target_group = elbv2_client.create_target_group(
                Name=target_group_name,
                Protocol=existing_target_group.get('Protocol'),
                ProtocolVersion=existing_target_group.get('ProtocolVersion'),
                Port=existing_target_group.get('Port'),
                VpcId=existing_target_group.get('VpcId'),
                HealthCheckProtocol=existing_target_group.get('HealthCheckProtocol'),
                HealthCheckPort=existing_target_group.get('HealthCheckPort'),
                HealthCheckEnabled=existing_target_group.get('HealthCheckEnabled'),
                HealthCheckPath=existing_target_group.get('HealthCheckPath'),
                HealthCheckIntervalSeconds=existing_target_group.get('HealthCheckIntervalSeconds'),
                HealthCheckTimeoutSeconds=existing_target_group.get('HealthCheckTimeoutSeconds'),
                HealthyThresholdCount=existing_target_group.get('HealthyThresholdCount'),
                UnhealthyThresholdCount=existing_target_group.get('UnhealthyThresholdCount'),
                Matcher=existing_target_group.get('Matcher'),
                TargetType=existing_target_group.get('TargetType'),
                Tags=[{'Key': 'Name', 'Value': target_group_name}],
                IpAddressType=existing_target_group.get('IpAddressType'),
            ).get('TargetGroups')[0]
            elbv2_client.create_listener(
                LoadBalancerArn=load_balancer.get('LoadBalancerArn'),
                Protocol='HTTP',
                Port=80,
                DefaultActions=[
                    {
                        'Type': 'forward',
                        'TargetGroupArn': target_group.get('TargetGroupArn'),
                    }
                ]
            )
            return {
                'targetGroupArn': target_group.get('TargetGroupArn'),
                'containerName': container_name,
                'containerPort': existing_lb.get('containerPort'),
            }

    def get_target_group(self, arn: str) -> Dict:
        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        elbv2_client = boto3.client('elbv2', config=config)

        target_groups = elbv2_client.describe_target_groups(
            TargetGroupArns=[arn],
        ).get('TargetGroups')

        if len(target_groups) > 0:
            return target_groups[0]

    def get_load_balancer(self, arn: str) -> Dict:
        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        elbv2_client = boto3.client('elbv2', config=config)

        load_balancers = elbv2_client.describe_load_balancers(
            LoadBalancerArns=[arn],
        ).get('LoadBalancers')

        if len(load_balancers) > 0:
            return load_balancers[0]

    def create_task(self, name: str, task_definition: str, container_name: str):
        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        ec2_client = boto3.client('ec2', config=config)

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

    def delete(self, instance_type: InstanceType, name: str, task_arn: str = None):
        if instance_type == InstanceType.SERVICE:
            self.delete_service(name)
        elif instance_type == InstanceType.TASK:
            self.delete_task(name, task_arn=task_arn)

    def delete_service(self, name):
        region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
        config = Config(region_name=region_name)
        ecs_client = boto3.client('ecs', config=config)
        elbv2_client = boto3.client('elbv2', config=config)

        service = ecs_client.delete_service(
            cluster=self.cluster_name,
            service=name,
            force=True,
        ).get('service')

        # delete target group and load balancer
        load_balancers = service.get('loadBalancers')
        if load_balancers:
            tg_arn = load_balancers[0].get('targetGroupArn')
            target_group = self.get_target_group(tg_arn)
            lb_arn = target_group.get('LoadBalancerArns')[0]
            elbv2_client.delete_target_group(TargetGroupArn=tg_arn)
            elbv2_client.delete_load_balancer(LoadBalancerArn=lb_arn)

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
