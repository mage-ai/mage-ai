from unittest.mock import MagicMock, patch

from mage_ai.services.aws.ecs.config import EcsConfig
from mage_ai.tests.base_test import TestCase


class TestEcsConfig(TestCase):

    @patch('os.getenv', return_value='mock_metadata_uri')
    @patch('requests.get')
    @patch('boto3.client')
    @patch('boto3.resource')
    def test_load_extra_config(self, mock_resource, mock_client, mock_requests, mock_os_getenv):
        # Mock responses for requests.get
        mock_response_task = MagicMock()
        mock_response_task.json.return_value = {'Cluster': 'mock_cluster', 'Family': 'mock_family'}
        mock_response_container = MagicMock()
        mock_response_container.json.return_value = {'Name': 'mock_container_name'}

        # Configure the side effects for the requests.get mocks
        mock_requests.side_effect = [mock_response_container, mock_response_task]

        # Mock response for boto3.client.describe_tasks
        mock_task_config = {
            'tasks': [{
                'attachments': [{'type': 'ElasticNetworkInterface', 'details': [
                    {'name': 'subnetId', 'value': 'mock_subnet'},
                    {'name': 'networkInterfaceId', 'value': 'mock_network_interface'}
                ]}]
            }]
        }
        mock_client.return_value.describe_tasks.return_value = mock_task_config

        # Mock response for boto3.resource.NetworkInterface
        mock_network_interface = MagicMock()
        mock_network_interface.groups = [{'GroupId': 'mock_security_group'}]
        mock_resource.return_value.NetworkInterface.return_value = mock_network_interface

        # Create an instance of EcsConfig and call the method to test
        ecs_config = EcsConfig.load_extra_config()

        # Assertions
        self.assertEqual(ecs_config, {
            'cluster': 'mock_cluster',
            'subnets': ['mock_subnet'],
            'security_groups': ['mock_security_group'],
            'task_definition': 'mock_family',
            'container_name': 'mock_container_name'
        })

    def test_get_task_config(self):
        # assign_public_ip: True, enable_execute_command: True
        ecs_config1 = EcsConfig(
            task_definition='mock_task_def',
            container_name='mock_container',
            cluster='mock_cluster',
            security_groups=['mock_sg'],
            subnets=['mock_subnet'],
            assign_public_ip=True,
            cpu=512,
            enable_execute_command=True,
            launch_type='FARGATE',
            memory=1024,
            network_configuration=None,
            tags=['tag1', 'tag2'],
            wait_timeout=600
        )
        task_config1 = ecs_config1.get_task_config(command='mock_command')
        self.assertEqual(task_config1, {
            'cluster': 'mock_cluster',
            'count': 1,
            'enableExecuteCommand': True,
            'launchType': 'FARGATE',
            'networkConfiguration': {
                'awsvpcConfiguration': {
                    'subnets': ['mock_subnet'],
                    'assignPublicIp': 'ENABLED',
                    'securityGroups': ['mock_sg'],
                }
            },
            'platformVersion': 'LATEST',
            'propagateTags': 'TASK_DEFINITION',
            'tags': ['tag1', 'tag2'],
            'taskDefinition': 'mock_task_def',
            'overrides': {
                'containerOverrides': [
                    {
                        'name': 'mock_container',
                        'command': ['mock_command'],
                        'cpu': 512,
                        'memory': 1024,
                    },
                ],
                'cpu': '512',
                'memory': '1024',
            },
        })

        # assign_public_ip: False, enable_execute_command: False
        ecs_config2 = EcsConfig(
            task_definition='mock_task_def',
            container_name='mock_container',
            cluster='mock_cluster',
            security_groups=['mock_sg'],
            subnets=['mock_subnet'],
            assign_public_ip=False,
            cpu=512,
            enable_execute_command=False,
            launch_type='FARGATE',
            memory=1024,
            network_configuration=None,
            tags=['tag1', 'tag2'],
            wait_timeout=600
        )
        task_config2 = ecs_config2.get_task_config(command='mock_command')
        self.assertEqual(task_config2, {
            'cluster': 'mock_cluster',
            'count': 1,
            'enableExecuteCommand': False,
            'launchType': 'FARGATE',
            'networkConfiguration': {
                'awsvpcConfiguration': {
                    'subnets': ['mock_subnet'],
                    'assignPublicIp': 'DISABLED',
                    'securityGroups': ['mock_sg'],
                }
            },
            'platformVersion': 'LATEST',
            'propagateTags': 'TASK_DEFINITION',
            'tags': ['tag1', 'tag2'],
            'taskDefinition': 'mock_task_def',
            'overrides': {
                'containerOverrides': [
                    {
                        'name': 'mock_container',
                        'command': ['mock_command'],
                        'cpu': 512,
                        'memory': 1024,
                    },
                ],
                'cpu': '512',
                'memory': '1024',
            },
        })
