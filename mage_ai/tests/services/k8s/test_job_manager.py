import os
from unittest.mock import MagicMock, patch

from kubernetes import client
from kubernetes.client import (
    V1Affinity,
    V1Container,
    V1EnvFromSource,
    V1EnvVar,
    V1JobSpec,
    V1NodeAffinity,
    V1NodeSelector,
    V1NodeSelectorRequirement,
    V1NodeSelectorTerm,
    V1Pod,
    V1PodSpec,
    V1SecretEnvSource,
    V1Toleration,
)

from mage_ai.services.k8s.config import K8sExecutorConfig
from mage_ai.services.k8s.job_manager import (
    JobManager,
    filter_used_volumes,
    merge_containers,
)
from mage_ai.tests.base_test import TestCase

MOCK_POD_CONFIG = V1Pod(
    spec=V1PodSpec(
        containers=[V1Container(
            name='mage-container',
            image_pull_policy='Always',
            image='test_image',
            env=[
                V1EnvVar(name='VAR1', value='VALUE1'),
                V1EnvVar(name='VAR2', value='VALUE2'),
            ],
            env_from=[
                V1EnvFromSource(
                    config_map_ref=None,
                    prefix=None,
                    secret_ref=V1SecretEnvSource(name='mysecret', optional=None),
                ),
            ],
            volume_mounts=[],
            resources=[],
        )],
        restart_policy='Never',
        service_account_name='old_service_account_name',
        tolerations=[
            {
                'effect': 'NoExecute',
                'key': 'node.kubernetes.io/not-ready',
                'operator': 'Exists',
                'toleration_seconds': 300,
            },
        ],
        volumes=[],
    )
)
MOCK_JOB_CONFIG = V1JobSpec(template=MOCK_POD_CONFIG,
                            active_deadline_seconds=120,
                            backoff_limit=5,
                            ttl_seconds_after_finished=86400)


class TestK8sUtilities(TestCase):
    def test_filter_used_volumes(self):
        volume1 = client.V1Volume(name='vol1')
        volume2 = client.V1Volume(name='vol2')

        volume_mount = client.V1VolumeMount(mount_path='/app', name='vol1')

        container = client.V1Container(name='container1', volume_mounts=[volume_mount])

        pod_spec = client.V1PodSpec(containers=[container], volumes=[volume1, volume2])
        filter_used_volumes(pod_spec)
        self.assertEqual(len(pod_spec.volumes), 1)
        self.assertEqual(pod_spec.volumes[0].name, 'vol1')

    def test_merge_containers(self):
        container1 = client.V1Container(
            name='container1',
            command=['cmd1', 'cmd2'],
            env=[
                client.V1EnvVar(**{'name': 'KEY1', 'value': 'VALUE1'}),
            ]
        )
        container2 = client.V1Container(
            name='container2',
            image='image2',
            command=['cmd3', 'cmd4'],
            env=[
                client.V1EnvVar(**{'name': 'KEY1', 'value': 'VALUE1'}),
                client.V1EnvVar(**{'name': 'KEY2', 'value': 'VALUE2'}),
            ],
        )

        merged_container = merge_containers(container1, container2)

        self.assertEqual(merged_container.name, 'container1')
        self.assertEqual(merged_container.image, 'image2')
        self.assertEqual(merged_container.command, ['cmd1', 'cmd2'])
        self.assertListEqual(
            merged_container.env,
            [
                client.V1EnvVar(**{'name': 'KEY1', 'value': 'VALUE1'}),
                client.V1EnvVar(**{'name': 'KEY2', 'value': 'VALUE2'}),
            ],
        )


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
        mock_v1_resource_requirements = MagicMock()
        mock_v1_container = MagicMock()
        mock_v1_pod_template_spec = MagicMock()
        mock_v1_object_meta = MagicMock()
        mock_v1_pod_spec = MagicMock()
        mock_v1_job_spec = MagicMock()
        mock_v1_job = MagicMock()

        mock_client.V1ResourceRequirements = MagicMock(return_value=mock_v1_resource_requirements)
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
        job_manager.pod_config = MOCK_POD_CONFIG
        command = 'mage run test_pipeline'
        k8s_config = K8sExecutorConfig.load(config=dict(
            namespace='test_namespace',
            resource_limits=dict(
                cpu='1000m',
                memory='2048Mi',
            ),
            resource_requests=dict(
                cpu='500m',
                memory='1024Mi',
            ),
            service_account_name='test_service_account',
        ))

        pod_config = k8s_config.pod_config
        job_manager.create_job_object(command, k8s_config)

        self.assertEqual(pod_config.service_account_name, 'test_service_account')
        self.assertEqual(pod_config.containers[0].name, 'mage-job-container')
        self.assertEqual(pod_config.containers[0].image_pull_policy, 'IfNotPresent')
        self.assertEqual(pod_config.containers[0].image, 'test_image')
        self.assertEqual(pod_config.containers[0].resources, mock_v1_resource_requirements)
        self.assertEqual(pod_config.containers[0].env_from, [
                V1EnvFromSource(
                    config_map_ref=None,
                    prefix=None,
                    secret_ref=V1SecretEnvSource(name='mysecret', optional=None),
                ),
        ])
        self.assertEqual(pod_config.tolerations, [
            {
                'effect': 'NoExecute',
                'key': 'node.kubernetes.io/not-ready',
                'operator': 'Exists',
                'toleration_seconds': 300,
            },
        ])

        mock_client.V1ResourceRequirements.assert_called_once_with(
            limits=dict(
                cpu='1000m',
                memory='2048Mi',
            ),
            requests=dict(
                cpu='500m',
                memory='1024Mi',
            ),
        )
        mock_client.V1PodTemplateSpec.assert_called_once_with(
            metadata=mock_v1_object_meta,
            spec=pod_config,
        )
        mock_client.V1JobSpec.assert_called_once_with(
            template=mock_v1_pod_template_spec,
            active_deadline_seconds=None,
            backoff_limit=0,
            ttl_seconds_after_finished=None
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
        mock_getenv.return_value = 'pod_name'

        job_manager = JobManager(
            job_name='test_job_name',
            namespace='test_namespace',
        )
        job_manager.pod_config = MOCK_POD_CONFIG

        # Create a mock K8sExecutorConfig with container_config
        k8s_config = K8sExecutorConfig()
        k8s_config.container_config = {
            'image': 'test_image_2',
            'image_pull_policy': 'Always',
            'env': [dict(name='spark_host', value='127.0.0.1')],
            'resources': dict(limits={'cpu': '1000m'}, requests={'cpu': '500m'}),
        }
        k8s_config.job_config = MOCK_JOB_CONFIG

        # Call the method to create the job object
        command = "echo 'hello world'"
        job = job_manager.create_job_object(command, k8s_config)

        # Assertions
        self.assertEqual(job.spec.template.spec.containers[0].image, 'test_image_2')
        self.assertEqual(job.spec.template.spec.containers[0].image_pull_policy, 'Always')
        self.assertEqual(job.spec.template.spec.containers[0].env, [
            dict(name='spark_host', value='127.0.0.1'),
            V1EnvVar(name='VAR1', value='VALUE1'),
            V1EnvVar(name='VAR2', value='VALUE2'),
        ])
        self.assertEqual(
            job.spec.template.spec.containers[0].resources,
            dict(
                limits={'cpu': '1000m'},
                requests={'cpu': '500m'},
            )
        )

    @patch('mage_ai.services.k8s.job_manager.client.CoreV1Api')
    @patch.object(K8sExecutorConfig, 'load_extra_config')
    @patch('mage_ai.services.k8s.job_manager.os.getenv')
    def test_create_job_object_with_config_file(self, mock_getenv, mock_load_extra_config,
                                                mock_core_api_client):
        mock_config = {
            'metadata': {
                'annotations': {
                    'application': 'mage',
                    'composant': 'executor'
                },
                'labels': {
                    'application': 'mage',
                    'type': 'spark'
                },
                'namespace': 'test-namespace'
            },
            'pod': {
                'affinity': {
                    'nodeAffinity': {
                        'requiredDuringSchedulingIgnoredDuringExecution': {
                            'nodeSelectorTerms': [
                                {
                                    'matchExpressions': [
                                        {
                                            'key': 'kubernetes.io/os',
                                            'operator': 'In',
                                            'values': ['linux'],
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
                'service_account_name': 'secretaccount',
                'image_pull_secrets': 'secret 1',
                'tolerations': [
                    {
                        'key': 'key2',
                        'operator': 'Equal',
                        'value': 'value2',
                        'effect': 'NoSchedule',
                    },
                ],
                'volumes': [
                    {
                        'name': 'data-pvc',
                        'persistent_volume_claim': {
                            'claim_name': 'pvc-name'
                        },
                    },
                ],
            },
            'container': {
                'name': 'mage-pipeline',
                'env': [
                    {'name': 'KUBE_NAMESPACE', 'value': 'default'},
                    {'name': 'secret_key', 'value': 'somesecret'}
                ],
                'image': 'mageai/mageai:0.9.26',
                'image_pull_policy': 'Always',
                'resources': {
                    'limits': {
                        'cpu': '1',
                        'memory': '1Gi'
                    },
                    'requests': {
                        'cpu': '0.1',
                        'memory': '0.5Gi'
                    }
                },
                'volume_mounts': [
                    {
                        'mount_path': '/tmp/data',
                        'name': 'data-pvc'
                    },
                ],
            },
            'job': {
                'active_deadline_seconds': 0,
                'backoff_limit': 3,
                'ttl_seconds_after_finished': 100
            }
        }
        mock_getenv.return_value = 'pod_name'

        job_manager = JobManager(
            job_name='test_job_name',
            namespace='test_namespace',
        )
        job_manager.pod_config = MOCK_POD_CONFIG

        mock_load_extra_config.return_value = mock_config
        k8s_config = K8sExecutorConfig.load(config={})

        # Call the method to create the job object
        command = "echo 'hello world'"
        job = job_manager.create_job_object(command, k8s_config)

        # Assertions
        # Metadata
        self.assertEqual(job.spec.template.metadata.labels,
                         {'application': 'mage', 'type': 'spark'})
        self.assertEqual(job.spec.template.metadata.annotations,
                         {'application': 'mage', 'composant': 'executor'})
        self.assertEqual(job.spec.template.metadata.namespace, 'test-namespace')

        # Pod
        self.assertEqual(job.spec.template.spec.affinity, V1Affinity(
                node_affinity=V1NodeAffinity(
                    required_during_scheduling_ignored_during_execution=V1NodeSelector(
                        node_selector_terms=[
                            V1NodeSelectorTerm(
                                match_expressions=[
                                    V1NodeSelectorRequirement(
                                        key='kubernetes.io/os',
                                        operator='In',
                                        values=['linux']
                                    )
                                ]
                            )
                        ]
                    )
                )
            )
        )

        self.assertEqual(job.spec.template.spec.service_account_name, 'secretaccount')
        self.assertEqual(job.spec.template.spec.image_pull_secrets,
                         client.V1LocalObjectReference('secret 1'))
        self.assertEqual(job.spec.template.spec.tolerations, [
            V1Toleration(
                **{
                    'key': 'key2',
                    'operator': 'Equal',
                    'value': 'value2',
                    'effect': 'NoSchedule',
                },
            )
        ])
        self.assertEqual(job.spec.template.spec.volumes, [
            client.V1Volume(name='data-pvc', persistent_volume_claim={'claim_name': 'pvc-name'}),
        ])

        # Container
        self.assertEqual(job.spec.template.spec.containers[0].name, 'mage-pipeline')
        self.assertEqual(job.spec.template.spec.containers[0].image_pull_policy, 'Always')
        print(job.spec.template.spec.containers[0].env[0])
        self.assertEqual(
            job.spec.template.spec.containers[0].volume_mounts[0],
            client.V1VolumeMount(
                mount_path='/tmp/data',
                name='data-pvc',
            )
        )

        # Job
        self.assertEqual(job.spec.active_deadline_seconds, 0)
        self.assertEqual(job.spec.backoff_limit, 3)
        self.assertEqual(job.spec.ttl_seconds_after_finished, 100)

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
