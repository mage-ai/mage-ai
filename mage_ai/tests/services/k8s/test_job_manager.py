import os
from unittest.mock import MagicMock, call, patch

from kubernetes import client

from mage_ai.services.k8s.config import K8sExecutorConfig
from mage_ai.services.k8s.job_manager import JobManager
from mage_ai.tests.base_test import TestCase


@patch.dict(os.environ, {'HOSTNAME': 'mage-server'})
class JobManagerTests(TestCase):
    @patch('mage_ai.services.k8s.job_manager.config')
    def test_load_config(self, mock_config):
        with patch.object(mock_config, 'load_incluster_config') as mock_load_incluster_config:
            self.assertTrue(JobManager.load_config())
            mock_load_incluster_config.assert_called_once()

    @patch('mage_ai.services.k8s.job_manager.client')
    @patch('mage_ai.services.k8s.job_manager.config')
    def test_init(self, mock_config, mock_client):
        mock_batch_api_client = MagicMock()
        mock_core_v1_api_client = MagicMock()
        mock_pod_config = MagicMock()

        with patch.object(JobManager, 'load_config') as mock_load_config:
            with patch.object(mock_client, 'BatchV1Api', return_value=mock_batch_api_client):
                with patch.object(mock_client, 'CoreV1Api', return_value=mock_core_v1_api_client):
                    with patch.object(
                        mock_core_v1_api_client,
                        'read_namespaced_pod',
                        return_value=mock_pod_config,
                    ) as mock_read_namespaced_pod_method:

                        job_manager = JobManager(
                            job_name='test_job_name',
                            namespace='test_namespace',
                        )
                        self.assertEqual(job_manager.job_name, 'test_job_name')
                        self.assertEqual(job_manager.namespace, 'test_namespace')
                        self.assertEqual(job_manager.batch_api_client, mock_batch_api_client)
                        self.assertEqual(job_manager.api_version, 'batch/v1')
                        self.assertEqual(job_manager.core_api_client, mock_core_v1_api_client)
                        self.assertEqual(job_manager.pod_config, mock_pod_config)

                        mock_load_config.assert_called_once()
                        mock_read_namespaced_pod_method.assert_called_once_with(
                            name='mage-server',
                            namespace='test_namespace',
                        )

    @patch('mage_ai.services.k8s.job_manager.client')
    @patch('mage_ai.services.k8s.job_manager.config')
    def test_create_job_object(self, mock_config, mock_client):
        mock_v1_container = MagicMock()
        mock_v1_pod_template_spec = MagicMock()
        mock_v1_object_meta = MagicMock()
        mock_v1_pod_spec = MagicMock()
        mock_v1_job_spec = MagicMock()
        mock_v1_job = MagicMock()

        mock_client.V1Container = MagicMock(return_value=mock_v1_container)
        mock_client.V1PodTemplateSpec = MagicMock(return_value=mock_v1_pod_template_spec)
        mock_client.V1ObjectMeta = MagicMock(return_value=mock_v1_object_meta)
        mock_client.V1PodSpec = MagicMock(return_value=mock_v1_pod_spec)
        mock_client.V1JobSpec = MagicMock(return_value=mock_v1_job_spec)
        mock_client.V1Job = MagicMock(return_value=mock_v1_job)

        job_manager = JobManager(
            job_name='test_job_name',
            namespace='test_namespace',
        )
        command = 'mage run test_pipeline'
        job_manager.create_job_object(command)
        mock_client.V1Container.assert_called_once_with(
            name='mage-job-container',
            image=job_manager.pod_config.spec.containers[0].image,
            image_pull_policy='IfNotPresent',
            command=['mage', 'run', 'test_pipeline'],
            env=job_manager.pod_config.spec.containers[0].env,
            volume_mounts=job_manager.pod_config.spec.containers[0].volume_mounts,
        )
        mock_client.V1ObjectMeta.assert_has_calls(
            [
                call(labels={'name': 'test_job_name'}),
                call(name='test_job_name'),
            ]
        )
        mock_client.V1PodSpec.assert_called_once_with(
            restart_policy='Never',
            containers=[mock_v1_container],
            volumes=job_manager.pod_config.spec.volumes,
            image_pull_secrets=job_manager.pod_config.spec.image_pull_secrets,
        )
        mock_client.V1JobSpec.assert_called_once_with(
            template=mock_v1_pod_template_spec,
            backoff_limit=0,
        )
        mock_client.V1Job.assert_called_once_with(
            api_version='batch/v1',
            kind='Job',
            metadata=mock_v1_object_meta,
            spec=mock_v1_job_spec,
        )

    @patch('mage_ai.services.k8s.job_manager.client.CoreV1Api')
    @patch('mage_ai.services.k8s.job_manager.os.getenv')
    def test_create_job_object_with_container_config(self, mock_getenv, mock_core_api_client):
        mock_getenv.return_value = "pod_name"

        job_manager = JobManager(
            job_name='test_job_name',
            namespace='test_namespace',
        )

        # Create a mock pod configuration for the CoreV1Api
        mock_pod_config = MagicMock()
        mock_container_spec = MagicMock()
        mock_container_spec.image = "test_image"
        mock_container_spec.env = [
            client.V1EnvVar(name="VAR1", value="VALUE1"),
            client.V1EnvVar(name="VAR2", value="VALUE2"),
        ]
        mock_pod_config.spec.containers = [mock_container_spec]

        # Create a mock K8sExecutorConfig with container_config
        k8s_config = K8sExecutorConfig()
        k8s_config.container_config = {
            "image_pull_policy": "Always",
            "env": [client.V1EnvVar(name="VAR3", value="VALUE3")],
            "resources": client.V1ResourceRequirements(limits={"cpu": "1000m"}),
        }

        # Call the method to create the job object
        command = "echo 'hello world'"
        job = job_manager.create_job_object(command, k8s_config)

        # Assertions
        self.assertEqual(job.spec.template.spec.containers[0].image_pull_policy, "Always")
        self.assertEqual(job.spec.template.spec.containers[0].env, [
            # client.V1EnvVar(name="VAR1", value="VALUE1"),
            # client.V1EnvVar(name="VAR2", value="VALUE2"),
            client.V1EnvVar(name="VAR3", value="VALUE3"),
        ])
        self.assertEqual(
            job.spec.template.spec.containers[0].resources,
            client.V1ResourceRequirements(
                limits={"cpu": "1000m"},
                requests=None,
            )
        )

    @patch('mage_ai.services.k8s.job_manager.client')
    @patch('mage_ai.services.k8s.job_manager.config')
    def test_create_job(self, mock_config, mock_client):
        mock_api_client = MagicMock()
        mock_api_client.create_namespaced_job = MagicMock()
        mock_job = MagicMock()

        mock_client.BatchV1Api = MagicMock(return_value=mock_api_client)
        job_manager = JobManager(
            job_name='test_job_name',
            namespace='test_namespace',
        )

        job_manager.create_job(mock_job)

        mock_api_client.create_namespaced_job.assert_called_once_with(
            body=mock_job,
            namespace='test_namespace',
        )

    @patch('mage_ai.services.k8s.job_manager.client')
    @patch('mage_ai.services.k8s.job_manager.config')
    def test_delete_job(self, mock_config, mock_client):
        mock_api_client = MagicMock()
        mock_api_client.delete_namespaced_job = MagicMock()
        mock_delete_options = MagicMock()
        mock_client.V1DeleteOptions = MagicMock(return_value=mock_delete_options)

        mock_client.BatchV1Api = MagicMock(return_value=mock_api_client)
        job_manager = JobManager(
            job_name='test_job_name',
            namespace='test_namespace',
        )

        job_manager.delete_job()

        mock_client.V1DeleteOptions.assert_called_once_with(
            propagation_policy='Foreground',
            grace_period_seconds=0,
        )
        mock_api_client.delete_namespaced_job.assert_called_once_with(
            name='test_job_name',
            namespace='test_namespace',
            body=mock_delete_options
        )
