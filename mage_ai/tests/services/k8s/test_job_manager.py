import os
from unittest.mock import MagicMock, patch

from kubernetes import client

from mage_ai.services.k8s.config import K8sExecutorConfig
from mage_ai.services.k8s.job_manager import (
    JobManager,
    filter_used_volumes,
    merge_containers,
)
from mage_ai.tests.base_test import TestCase


class TestK8sUtilities(TestCase):
    def test_filter_used_volumes(self):
        volume1 = client.V1Volume(name="vol1")
        volume2 = client.V1Volume(name="vol2")

        volume_mount = client.V1VolumeMount(mount_path="/app", name="vol1")

        container = client.V1Container(name="container1", volume_mounts=[volume_mount])

        pod_spec = client.V1PodSpec(containers=[container], volumes=[volume1, volume2])
        filter_used_volumes(pod_spec)
        self.assertEqual(len(pod_spec.volumes), 1)
        self.assertEqual(pod_spec.volumes[0].name, "vol1")

    def test_merge_containers(self):
        container1 = client.V1Container(name="container1", command=["cmd1", "cmd2"], env=[
            {"name": "KEY1", "value": "VALUE1"}])
        container2 = client.V1Container(name="container2", image="image2", command=[
            "cmd3", "cmd4"], env=[{"name": "KEY2", "value": "VALUE2"}])

        merged_container = merge_containers(container1, container2)

        self.assertEqual(merged_container.name, "container1")
        self.assertEqual(merged_container.image, "image2")
        self.assertEqual(merged_container.command, ["cmd1", "cmd2"])
        self.assertListEqual(merged_container.env, [{"name": "KEY1", "value": "VALUE1"}, {
            "name": "KEY2", "value": "VALUE2"}])


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

                    mock_read_namespaced_pod_method.assert_called_once()
                    # to dig
                    # mock_read_namespaced_pod_method.assert_called_once_with(
                    #     name='mage-server',
                    #     namespace='test_namespace',
                    # )

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
        k8s_config = K8sExecutorConfig().load(config={})
        job_manager.create_job_object(command, k8s_config)
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
        mock_container_spec.resources = client.V1ResourceRequirements(requests={"cpu": "500m"})
        mock_pod_config.spec.containers = [mock_container_spec]
        mock_pod_config.spec.image_pull_policy = "IfNotPresent"

        # Create a mock K8sExecutorConfig with container_config
        k8s_config = K8sExecutorConfig()
        k8s_config.container_config = {
            "image_pull_policy": "Always",
            "env": [client.V1EnvVar(name="spark_host", value="127.0.0.1")],
            "resources": client.V1ResourceRequirements(limits={"cpu": "1000m"}),
        }

        # Call the method to create the job object
        command = "echo 'hello world'"
        job = job_manager.create_job_object(command, k8s_config)

        # Assertions
        self.assertEqual(job.spec.template.spec.containers[0].image_pull_policy, "Always")
        self.assertEqual(job.spec.template.spec.containers[0].env, [
            client.V1EnvVar(name="spark_host", value="127.0.0.1"),
        ])
        self.assertEqual(
            job.spec.template.spec.containers[0].resources,
            client.V1ResourceRequirements(
                limits={"cpu": "1000m"},
                requests=None,
            )
        )

    @patch('mage_ai.services.k8s.job_manager.client.CoreV1Api')
    @patch.object(K8sExecutorConfig, 'load_extra_config')
    @patch('mage_ai.services.k8s.job_manager.os.getenv')
    def test_create_job_object_with_config_file(self, mock_getenv, mock_load_extra_config,
                                                mock_core_api_client):
        mock_config = {
            "metadata": {
                "annotations": {
                    "application": "mage",
                    "composant": "executor"
                },
                "labels": {
                    "application": "mage",
                    "type": "spark"
                },
                "namespace": "test-namespace"
            },
            "pod": {
                "service_account_name": "secretaccount",
                "image_pull_secrets": "secret 1",
                "volumes": [
                    {
                        "name": "data-pvc",
                        "persistent_volume_claim": {
                            "claim_name": "pvc-name"
                        }
                    }
                ],
            },
            "container": {
                "name": "mage-pipeline",
                "env": [
                    {"name": "KUBE_NAMESPACE", "value": "default"},
                    {"name": "secret_key", "value": "somesecret"}
                ],
                "image": "mageai/mageai:0.9.26",
                "image_pull_policy": "Always",
                "resources": {
                    "limits": {
                        "cpu": "1",
                        "memory": "1Gi"
                    },
                    "requests": {
                        "cpu": "0.1",
                        "memory": "0.5Gi"
                    }
                },
                "volume_mounts": [
                    {
                        "mount_path": "/tmp/data",
                        "name": "data-pvc"
                    }
                ]
            }
        }
        mock_getenv.return_value = "pod_name"

        job_manager = JobManager(
            job_name='test_job_name',
            namespace='test_namespace',
        )

        mock_load_extra_config.return_value = mock_config
        k8s_config = K8sExecutorConfig.load(config={})

        # Call the method to create the job object
        command = "echo 'hello world'"
        job = job_manager.create_job_object(command, k8s_config)

        # Assertions
        # Metadata
        self.assertEqual(job.spec.template.metadata.labels,
                         {"application": "mage", "type": "spark"})
        self.assertEqual(job.spec.template.metadata.annotations,
                         {"application": "mage", "composant": "executor"})
        self.assertEqual(job.spec.template.metadata.namespace, "test-namespace")

        # Pod
        self.assertEqual(job.spec.template.spec.service_account_name, "secretaccount")
        self.assertEqual(job.spec.template.spec.image_pull_secrets,
                         client.V1LocalObjectReference("secret 1"))
        self.assertEqual(job.spec.template.spec.volumes, [
            client.V1Volume(name="data-pvc", persistent_volume_claim={"claim_name": "pvc-name"}),
        ])

        # Container
        self.assertEqual(job.spec.template.spec.containers[0].name, "mage-pipeline")
        self.assertEqual(job.spec.template.spec.containers[0].image_pull_policy, "Always")
        print(job.spec.template.spec.containers[0].env[0])
        self.assertEqual(
            job.spec.template.spec.containers[0].volume_mounts[0],
            client.V1VolumeMount(
                mount_path="/tmp/data",
                name="data-pvc",
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
