from unittest.mock import patch

from kubernetes.client import V1Container, V1LocalObjectReference, V1PodSpec

from mage_ai.services.k8s.config import K8sExecutorConfig
from mage_ai.tests.base_test import TestCase


class TestK8sExecutorConfig(TestCase):

    def setUp(self):
        self.mock_config_data = {
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
                "name": "mage-data",
                "env": [
                    {"name": "KUBE_NAMESPACE", "value": "default"},
                    {"name": "secret_key", "value": "somesecret"}
                ],
                "image": "mageai/mageai:0.9.26",
                "image_pull_policy": "IfNotPresent",
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

    @patch.object(K8sExecutorConfig, 'load_file')
    def test_load_extra_config_empty(self, mock_load_file):
        config = K8sExecutorConfig()
        config.config_file = ''
        self.assertEqual(config.load_extra_config(), {})
        mock_load_file.assert_not_called()

    @patch.object(K8sExecutorConfig, 'load_file')
    def test_load_with_basic_config(self, mock_load_file):
        mock_load_file.return_value = {}
        config = K8sExecutorConfig.load(config=self.mock_config_data)
        self.assertIsInstance(config.pod_config, V1PodSpec)
        self.assertIsInstance(config.pod_config.containers[0], V1Container)
        self.assertEqual(config.namespace, "test-namespace")
        self.assertEqual(config.pod_config.containers[0].name, "mage-data")
        self.assertEqual(config.pod_config.containers[0].image, "mageai/mageai:0.9.26")
        self.assertEqual(config.pod_config.containers[0].env[0].name, "KUBE_NAMESPACE")
        self.assertEqual(config.pod_config.containers[0].env[0].value, "default")
        self.assertEqual(config.pod_config.containers[0].resources.limits['cpu'], "1")
        self.assertEqual(config.pod_config.containers[0].resources.requests['memory'], "0.5Gi")
        self.assertEqual(config.pod_config.volumes[0].name, "data-pvc")

    @patch.object(K8sExecutorConfig, 'load_extra_config')
    def test_load_with_config_file(self, mock_load_extra_config):
        mock_load_extra_config.return_value = self.mock_config_data

        config = K8sExecutorConfig.load(config={})

        self.assertEqual(config.namespace, "test-namespace")
        self.assertEqual(config.pod_config.service_account_name, "secretaccount")
        self.assertEqual(config.pod_config.image_pull_secrets,
                         V1LocalObjectReference("secret 1"))
        self.assertEqual(config.pod_config.volumes[0].name, "data-pvc")
        self.assertEqual(config.pod_config.containers[0].resources.limits['cpu'], "1")
        self.assertEqual(config.pod_config.containers[0].resources.requests['memory'], "0.5Gi")
        self.assertEqual(config.pod_config.containers[0].env[0].name, "KUBE_NAMESPACE")
        self.assertEqual(config.pod_config.containers[0].env[0].value, "default")
        self.assertEqual(config.pod_config.containers[0].image, "mageai/mageai:0.9.26")
        self.assertEqual(config.pod_config.containers[0].volume_mounts[0].mount_path, "/tmp/data")
