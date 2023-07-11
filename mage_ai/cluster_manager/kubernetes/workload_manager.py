import os
from typing import Dict, List

import yaml
from kubernetes import client, config

from mage_ai.cluster_manager.constants import (
    CLOUD_SQL_CONNECTION_NAME,
    CONNECTION_URL_SECRETS_NAME,
    DB_SECRETS_NAME,
    GCP_BACKEND_CONFIG_ANNOTATION,
    KUBE_NAMESPACE,
    KUBE_SERVICE_GCP_BACKEND_CONFIG,
    KUBE_SERVICE_TYPE,
    NODE_PORT_SERVICE_TYPE,
    SERVICE_ACCOUNT_CREDENTIAL_FILE_PATH,
    SERVICE_ACCOUNT_SECRETS_NAME,
)
from mage_ai.data_preparation.repo_manager import ProjectType
from mage_ai.orchestration.constants import (
    DATABASE_CONNECTION_URL_ENV_VAR,
    DB_NAME,
    DB_PASS,
    DB_USER,
)
from mage_ai.services.k8s.constants import (
    DEFAULT_NAMESPACE,
    DEFAULT_SERVICE_ACCOUNT_NAME,
    DEFAULT_STORAGE_CLASS_NAME,
    KUBE_POD_NAME_ENV_VAR,
)
from mage_ai.settings import MAGE_SETTINGS_ENVIRONMENT_VARIABLES
from mage_ai.shared.array import find


class WorkloadManager:
    def __init__(self, namespace: str = DEFAULT_NAMESPACE):
        self.load_config()
        self.core_client = client.CoreV1Api()
        self.apps_client = client.AppsV1Api()

        self.namespace = namespace
        if not self.namespace:
            self.namespace = DEFAULT_NAMESPACE

        try:
            self.pod_config = self.core_client.read_namespaced_pod(
                name=os.getenv(KUBE_POD_NAME_ENV_VAR),
                namespace=self.namespace,
            )
        except Exception:
            self.pod_config = None

    @classmethod
    def load_config(cls) -> bool:
        try:
            config.load_incluster_config()
            return True
        except Exception:
            pass

        try:
            config.load_kube_config()
        except Exception:
            pass

        return False

    def list_workloads(self):
        services = self.core_client.list_namespaced_service(self.namespace).items
        workloads_list = []

        pods = self.core_client.list_namespaced_pod(self.namespace).items
        pod_mapping = dict()
        for pod in pods:
            try:
                name = pod.metadata.labels.get('app')
                pod_mapping[name] = pod
            except Exception:
                pass
        for service in services:
            try:
                labels = service.metadata.labels
                if not labels.get('dev-instance'):
                    continue
                name = labels.get('app')
                service_type = service.spec.type
                workload = dict(
                    name=name,
                    type=service_type,
                )
                pod = pod_mapping.get(name)
                if pod:
                    status = pod.status.phase
                    workload['status'] = status.upper()

                    node_name = pod.spec.node_name
                    ip = None
                    if service_type == 'NodePort':
                        try:
                            if node_name:
                                items = self.core_client.list_node(
                                    field_selector=f'metadata.name={node_name}').items
                                node = items[0]
                                ip = find(
                                    lambda a: a.type == 'ExternalIP',
                                    node.status.addresses
                                ).address
                                if ip:
                                    node_port = service.spec.ports[0].node_port
                                    workload['ip'] = f'{ip}:{node_port}'
                        except Exception:
                            pass
                else:
                    workload['status'] = 'UNAVAILABLE'

                workloads_list.append(workload)
            except Exception:
                pass

        return workloads_list

    def create_workload(
        self,
        name: str,
        project_type: str = ProjectType.STANDALONE,
        project_uuid: str = None,
        **kwargs,
    ):
        container_config_yaml = kwargs.get('container_config')
        container_config = dict()
        if container_config_yaml:
            container_config = yaml.full_load(container_config_yaml)

        parameters = self.__get_configurable_parameters(**kwargs)
        service_account_name = parameters.get(
            'service_account_name',
            DEFAULT_SERVICE_ACCOUNT_NAME,
        )
        storage_class_name = parameters.get(
            'storage_class_name',
            DEFAULT_STORAGE_CLASS_NAME,
        )
        storage_access_mode = parameters.get('storage_access_mode', 'ReadWriteOnce')
        storage_request_size = parameters.get('storage_request_size', '2Gi')

        env_vars = self.__populate_env_vars(
            name,
            project_type=project_type,
            project_uuid=project_uuid,
            container_config=container_config,
        )
        container_config['env'] = env_vars

        containers = [
            {
                'name': f'{name}-container',
                'image': 'mageai/mageai:latest',
                'ports': [
                    {
                        'containerPort': 6789,
                        'name': 'web'
                    }
                ],
                'volumeMounts': [
                    {
                        'name': 'mage-data',
                        'mountPath': '/home/src'
                    }
                ],
                **container_config,
            }
        ]

        volumes = []
        if os.getenv(SERVICE_ACCOUNT_SECRETS_NAME):
            credential_file_path = os.getenv(
                SERVICE_ACCOUNT_CREDENTIAL_FILE_PATH,
                'service_account.json',
            )
            containers.append(
                {
                    'name': 'cloud-sql-proxy',
                    'image': 'gcr.io/cloudsql-docker/gce-proxy:1.28.0',
                    'command': [
                        '/cloud_sql_proxy',
                        '-log_debug_stdout',
                        f'-instances={os.getenv(CLOUD_SQL_CONNECTION_NAME)}=tcp:5432',
                        f'-credential_file=/secrets/{credential_file_path}'
                    ],
                    'securityContext': {
                        'runAsNonRoot': True
                    },
                    'resources': {
                        'requests': {
                            'memory': '1Gi',
                            'cpu': '1'
                        }
                    },
                    'volumeMounts': [
                        {
                            'name': 'service-account-volume',
                            'mountPath': '/secrets/',
                            'readOnly': True
                        }
                    ]
                }
            )
            volumes.append(
                {
                    'name': 'service-account-volume',
                    'secret': {
                        'secretName': os.getenv(SERVICE_ACCOUNT_SECRETS_NAME)
                    }
                }
            )

        pod_spec = self.pod_config.spec.to_dict() if self.pod_config else dict()
        stateful_set_template_spec = dict(
            imagePullSecrets=pod_spec.get('image_pull_secrets'),
            terminationGracePeriodSeconds=10,
            containers=containers,
            volumes=volumes,
        )
        if service_account_name:
            stateful_set_template_spec['serviceAccountName'] = service_account_name

        stateful_set = {
            'apiVersion': 'apps/v1',
            'kind': 'StatefulSet',
            'metadata': {
                'name': name,
                'labels': {
                    'app': name
                }
            },
            'spec': {
                'selector': {
                    'matchLabels': {
                        'app': name
                    }
                },
                'replicas': 1,
                'minReadySeconds': 10,
                'template': {
                    'metadata': {
                        'labels': {
                            'app': name
                        }
                    },
                    'spec': stateful_set_template_spec
                },
                'volumeClaimTemplates': [
                    {
                        'metadata': {
                            'name': 'mage-data'
                        },
                        'spec': {
                            'accessModes': [storage_access_mode],
                            'storageClassName': storage_class_name,
                            'resources': {
                                'requests': {
                                    'storage': storage_request_size
                                }
                            }
                        }
                    }
                ]
            }
        }

        self.apps_client.create_namespaced_stateful_set(self.namespace, stateful_set)

        service_name = f'{name}-service'

        annotations = {}
        if os.getenv(KUBE_SERVICE_GCP_BACKEND_CONFIG):
            annotations[GCP_BACKEND_CONFIG_ANNOTATION] = \
                os.getenv(KUBE_SERVICE_GCP_BACKEND_CONFIG)

        service = {
            'apiVersion': 'v1',
            'kind': 'Service',
            'metadata': {
                'name': service_name,
                'labels': {
                    'app': name,
                    'dev-instance': '1',
                },
                'annotations': annotations
            },
            'spec': {
                'ports': [
                    {
                        'protocol': 'TCP',
                        'port': 6789,
                    }
                ],
                'selector': {
                    'app': name
                },
                'type': os.getenv(KUBE_SERVICE_TYPE, NODE_PORT_SERVICE_TYPE)
            }
        }

        return self.core_client.create_namespaced_service(self.namespace, service)

    def delete_workload(self, name: str):
        self.apps_client.delete_namespaced_stateful_set(name, self.namespace)
        self.core_client.delete_namespaced_service(f'{name}-service', self.namespace)

    def __populate_env_vars(
        self,
        name,
        project_type: str = 'standalone',
        project_uuid: str = None,
        container_config: Dict = None
    ) -> List:
        env_vars = [
            {
                'name': 'USER_CODE_PATH',
                'value': name,
            }
        ]
        if project_type:
            env_vars.append({
                'name': 'PROJECT_TYPE',
                'value': project_type,
            })
        if project_uuid:
            env_vars.append({
                'name': 'PROJECT_UUID',
                'value': project_uuid,
            })

        connection_url_secrets_name = os.getenv(CONNECTION_URL_SECRETS_NAME)
        if connection_url_secrets_name:
            env_vars.append(
                {
                    'name': DATABASE_CONNECTION_URL_ENV_VAR,
                    'valueFrom': {
                        'secretKeyRef': {
                            'name': connection_url_secrets_name,
                            'key': 'connection_url'
                        }
                    }
                }
            )

        for var in MAGE_SETTINGS_ENVIRONMENT_VARIABLES + [
            DATABASE_CONNECTION_URL_ENV_VAR,
            KUBE_NAMESPACE,
        ]:
            if os.getenv(var) is not None:
                env_vars.append({
                    'name': var,
                    'value': str(os.getenv(var)),
                })

        # For connecting to CloudSQL PostgreSQL database.
        db_secrets_name = os.getenv(DB_SECRETS_NAME)
        if db_secrets_name:
            env_vars.extend([
                {
                    'name': DB_USER,
                    'valueFrom': {
                        'secretKeyRef': {
                            'name': db_secrets_name,
                            'key': 'username'
                        }
                    }
                },
                {
                    'name': DB_PASS,
                    'valueFrom': {
                        'secretKeyRef': {
                            'name': db_secrets_name,
                            'key': 'password'
                        }
                    }
                },
                {
                    'name': DB_NAME,
                    'valueFrom': {
                        'secretKeyRef': {
                            'name': db_secrets_name,
                            'key': 'database'
                        }
                    }
                }
            ])

        if container_config and 'env' in container_config:
            env_vars += container_config['env']

        return env_vars

    def __get_configurable_parameters(self, **kwargs) -> Dict:
        service_account_name_default = None
        storage_class_name_default = None
        storage_access_mode_default = None
        storage_request_size_default = None
        try:
            service_account_name_default = self.pod_config.spec.service_account_name

            pvc_name = find(
                lambda v: v.persistent_volume_claim is not None,
                self.pod_config.spec.volumes,
            ).persistent_volume_claim.claim_name

            pvc = self.core_client.read_namespaced_persistent_volume_claim(
                name=pvc_name,
                namespace=self.namespace,
            )

            storage_class_name_default = pvc.spec.storage_class_name
            storage_access_mode_default = pvc.spec.access_modes[0]
            storage_request_size_default = pvc.spec.resources.requests.get('storage')
        except Exception:
            pass

        storage_request_size = kwargs.get('storage_request_size')
        if storage_request_size is None:
            storage_request_size = storage_request_size_default
        else:
            storage_request_size = f'{storage_request_size}Gi'

        return dict(
            service_account_name=kwargs.get('service_account_name', service_account_name_default),
            storage_class_name=kwargs.get('storage_class_name', storage_class_name_default),
            storage_access_mode=kwargs.get('storage_access_mode', storage_access_mode_default),
            storage_request_size=storage_request_size,
        )

    def __create_persistent_volume(
        self,
        name,
        volume_host_path=None,
        storage_request_size='2Gi',
        access_mode=None,
    ):
        nodes = self.core_client.list_node().items
        hostnames = [node.metadata.labels['kubernetes.io/hostname'] for node in nodes]
        access_modes = ['ReadWriteOnce'] if access_mode is None else [access_mode]
        pv = {
            'apiVersion': 'v1',
            'kind': 'PersistentVolume',
            'metadata': {
                'name': f'{name}-pv'
            },
            'spec': {
                'capacity': {
                    'storage': storage_request_size,
                },
                'volumeMode': 'Filesystem',
                'accessModes': access_modes,
                'persistentVolumeReclaimPolicy': 'Delete',
                'storageClassName': f'{name}-local-storage',
                'local': {
                    'path': volume_host_path,
                },
                'nodeAffinity': {
                    'required': {
                        'nodeSelectorTerms': [
                            {
                                'matchExpressions': [
                                    {
                                        'key': 'kubernetes.io/hostname',
                                        'operator': 'In',
                                        'values': hostnames
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
        self.core_client.create_persistent_volume(pv)
