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
    KUBE_SERVICE_ACCOUNT_NAME,
    KUBE_SERVICE_GCP_BACKEND_CONFIG,
    KUBE_SERVICE_TYPE,
    KUBE_STORAGE_CLASS_NAME,
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

        service_account_name = kwargs.get(
            'service_account_name',
            os.getenv(KUBE_SERVICE_ACCOUNT_NAME),
        )
        storage_class_name = kwargs.get('storage_class_name', os.getenv(KUBE_STORAGE_CLASS_NAME))
        storage_access_mode = kwargs.get('storage_access_mode', 'ReadWriteOnce')
        storage_request_size = kwargs.get('storage_request_size', 2)

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

        stateful_set_template_spec = dict()
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
                            'accessModes': [storage_access_mode],
                            'storageClassName': storage_class_name,
                            'resources': {
                                'requests': {
                                    'storage': f'{storage_request_size}Gi'
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
