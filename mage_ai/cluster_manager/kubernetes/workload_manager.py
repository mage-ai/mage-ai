import os
from typing import Dict, List

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
from mage_ai.orchestration.constants import (
    DATABASE_CONNECTION_URL_ENV_VAR,
    DB_NAME,
    DB_PASS,
    DB_USER,
)
from mage_ai.settings import MAGE_SETTINGS_ENVIRONMENT_VARIABLES


class WorkloadManager:
    def __init__(self, namespace: str = 'default'):
        self.load_config()
        self.core_client = client.CoreV1Api()
        self.apps_client = client.AppsV1Api()

        self.namespace = namespace
        if not self.namespace:
            self.namespace = 'default'

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

    def list_services(self):
        services = self.core_client.list_namespaced_service(self.namespace).items
        services_list = []
        for service in services:
            try:
                labels = service.metadata.labels
                if not labels.get('dev-instance'):
                    continue
                conditions = service.status.conditions or list()
                services_list.append(dict(
                    name=labels.get('app'),
                    status='RUNNING' if len(conditions) == 0 else conditions[0].status,
                    type='kubernetes',
                ))
            except Exception:
                pass

        return services_list

    def create_stateful_set(
        self,
        name,
        container_config: Dict = None,
        service_account_name: str = None,
        storage_class_name: str = None,
        volume_host_path: str = None,
    ):
        if container_config is None:
            container_config = dict()

        env_vars = self.__populate_env_vars(container_config)
        container_config['env'] = env_vars

        containers = [
            {
                'name': f'{name}-container',
                'image': 'mageai/mageai:latest',
                'imagePullPolicy': 'Never',
                'command': ['mage', 'start', name],
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

        stateful_set_template_spec = dict()
        if service_account_name:
            stateful_set_template_spec['serviceAccountName'] = service_account_name

        if storage_class_name is None:
            self.__create_persistent_volume(
                name,
                volume_host_path=volume_host_path,
            )
            storage_class_name = f'{name}-storage'

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
                    'spec': {
                        'terminationGracePeriodSeconds': 10,
                        'containers': containers,
                        'volumes': volumes,
                        **stateful_set_template_spec
                    }
                },
                'volumeClaimTemplates': [
                    {
                        'metadata': {
                            'name': 'mage-data'
                        },
                        'spec': {
                            'accessModes': [
                                'ReadWriteOnce'
                            ],
                            'storageClassName': storage_class_name,
                            'resources': {
                                'requests': {
                                    'storage': '1Gi'
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

    def __create_persistent_volume(
        self,
        name,
        volume_host_path=None,
    ):
        nodes = self.core_client.list_node().items
        hostnames = [node.metadata.labels['kubernetes.io/hostname'] for node in nodes]
        pv = {
            'apiVersion': 'v1',
            'kind': 'PersistentVolume',
            'metadata': {
                'name': f'{name}-pv'
            },
            'spec': {
                'capacity': {
                    'storage': '1Gi'
                },
                'volumeMode': 'Filesystem',
                'accessModes': [
                    'ReadWriteOnce'
                ],
                'persistentVolumeReclaimPolicy': 'Delete',
                'storageClassName': f'{name}-storage',
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

    def __populate_env_vars(self, container_config) -> List:
        env_vars = []

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
