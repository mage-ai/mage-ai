import os
from unittest.mock import MagicMock

from kubernetes import client

from mage_ai.cluster_manager.errors import ConfigurationError
from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager
from mage_ai.tests.base_test import TestCase


class WorkloadManagerTests(TestCase):
    def setUp(self):
        self.mock_core_client = MagicMock()
        self.mock_apps_client = MagicMock()
        self.mock_networking_client = MagicMock()
        client.CoreV1Api = MagicMock(return_value=self.mock_core_client)
        client.AppsV1Api = MagicMock(return_value=self.mock_apps_client)
        client.NetworkingV1Api = MagicMock(return_value=self.mock_networking_client)

        self.workload_manager = WorkloadManager()

    def test_configure_pre_start(self):
        pre_start_script_path = os.path.join(self.repo_path, 'pre_start_test_script.py')
        with open(pre_start_script_path, 'w') as f:
            f.write(
                """
def get_custom_configs(config):
    current_env = config.get('env', [])
    current_env.append({
        'name': 'RANDOM_ENV_VAR',
        'value': 'HI HELLO',
    })
    config['env'] = current_env
    return config
"""
            )

        self.workload_manager.create_hooks_config_map(
            'test',
            pre_start_script_path=pre_start_script_path,
            mage_container_config={
                'name': 'test-container',
                'image': 'mageai/mageai:latest',
                'ports': [{'containerPort': 6789, 'name': 'web'}],
            },
        )
        self.mock_core_client.create_namespaced_config_map.assert_called_once()

        os.remove(pre_start_script_path)

    def test_configure_pre_start_invalid_wrong_function_name(self):
        pre_start_script_path = os.path.join(self.repo_path, 'pre_start_test_script.py')
        with open(pre_start_script_path, 'w') as f:
            f.write(
                """
def wrong_function_name(config):
    current_env = config.get('env', [])
    current_env.append({
        'name': 'RANDOM_ENV_VAR',
        'value': 'HI HELLO',
    })
    config['env'] = current_env
    return config
"""
            )
        with self.assertRaises(Exception) as context:
            self.workload_manager.create_hooks_config_map(
                'test',
                pre_start_script_path=pre_start_script_path,
                mage_container_config={
                    'name': 'test-container',
                    'image': 'mageai/mageai:latest',
                    'ports': [{'containerPort': 6789, 'name': 'web'}],
                },
            )
            self.assertTrue(
                'Could not find get_custom_configs function' in str(context.exception)
            )
            self.mock_core_client.create_namespaced_config_map.assert_not_called()

        os.remove(pre_start_script_path)

    def test_configure_pre_start_invalid_empty_container_config(self):
        pre_start_script_path = os.path.join(self.repo_path, 'pre_start_test_script.py')
        with open(pre_start_script_path, 'w') as f:
            f.write(
                """
def wrong_function_name(config):
    current_env = config.get('env', [])
    current_env.append({
        'name': 'RANDOM_ENV_VAR',
        'value': 'HI HELLO',
    })
    config['env'] = current_env
    return config
"""
            )
        with self.assertRaises(ConfigurationError) as context:
            self.workload_manager.create_hooks_config_map(
                'test',
                pre_start_script_path=pre_start_script_path,
                mage_container_config=dict(),
            )
            self.assertTrue(
                'The container config can not be empty' in str(context.exception)
            )
            self.mock_core_client.create_namespaced_config_map.assert_not_called()

        os.remove(pre_start_script_path)

    def test_get_url_from_ingress(self):
        # Set up test data
        ingress_name = 'example-ingress'
        workload_name = 'example-workload'

        # Mock the read_namespaced_ingress method to return a mock Ingress object
        mock_ingress = MagicMock()
        mock_ingress.spec.rules[0].host = 'example-host'
        mock_ingress.spec.tls = [MagicMock(hosts=['example-host'])]

        mock_path = MagicMock()
        mock_path.backend.service.name = f'{workload_name}-service'
        mock_path.path = '/example-path'
        mock_ingress.spec.rules[0].http.paths = [mock_path]
        self.mock_networking_client.read_namespaced_ingress.return_value = mock_ingress

        client.NetworkingV1Api = MagicMock(return_value=self.mock_networking_client)
        mock_workload_manager = WorkloadManager()

        # Call the function
        result = mock_workload_manager.get_url_from_ingress(ingress_name, workload_name)

        # Assert the expected result
        expected_result = 'https://example-host/example-path'
        self.assertEqual(result, expected_result)

        # Assert that the read_namespaced_ingress method was called with the correct arguments
        self.mock_networking_client.read_namespaced_ingress.assert_called_once_with(
            ingress_name, mock_workload_manager.namespace
        )

    def test_remove_backend_from_ingress(self):
        # Set up test data
        ingress_name = 'example-ingress'
        name = 'example'

        # Create a mock Ingress object
        mock_ingress = MagicMock()
        mock_path1 = MagicMock()
        mock_path1.backend.service.name = f'{name}-service'
        mock_path1.path = '/example-name'
        mock_path2 = MagicMock()
        mock_path2.backend.service.name = 'other-service'
        mock_path2.path = '/other'
        mock_ingress.spec.rules = [
            MagicMock(
                host="example-host", http=MagicMock(paths=[mock_path1, mock_path2])
            )
        ]

        self.mock_networking_client.read_namespaced_ingress.return_value = mock_ingress

        client.NetworkingV1Api = MagicMock(return_value=self.mock_networking_client)
        mock_workload_manager = WorkloadManager()

        # Call the function
        mock_workload_manager.remove_service_from_ingress_paths(ingress_name, name)

        # Assert that read_namespaced_ingress and patch_namespaced_ingress were called
        # with the correct arguments
        self.mock_networking_client.read_namespaced_ingress.assert_called_once_with(
            ingress_name, mock_workload_manager.namespace
        )
        self.mock_networking_client.patch_namespaced_ingress.assert_called_once_with(
            ingress_name, mock_workload_manager.namespace, mock_ingress
        )

        # Assert that the backend with the specified name was removed
        self.assertEqual(len(mock_ingress.spec.rules[0].http.paths), 1)
        self.assertEqual(
            mock_ingress.spec.rules[0].http.paths[0].backend.service.name,
            'other-service',
        )
