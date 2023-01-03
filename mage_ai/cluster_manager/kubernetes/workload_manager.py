from kubernetes import client, config
from mage_ai.cluster_manager.constants import (
    CLOUD_SQL_CONNECTION_NAME,
    DB_SECRETS_NAME,
    SERVICE_ACCOUNT_CREDENTIAL_FILE_PATH,
    SERVICE_ACCOUNT_SECRETS_NAME
)
from mage_ai.orchestration.constants import DB_NAME, DB_PASS, DB_USER

import os


class WorkloadManager:
    def __init__(self, namespace: str = 'default'):
        self.load_config()
        self.core_client = client.CoreV1Api()
        self.apps_client = client.AppsV1Api()

        self.namespace = namespace
        if not self.namespace:
            self.namespace = 'default'

    
    def load_config(self) -> bool:
        try:
            config.load_incluster_config()
            return True
        except:
            pass

        try:
            config.load_kube_config()
        except:
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
                ip_address = service.status.load_balancer.ingress[0].ip
                conditions = service.status.conditions or list()
                services_list.append(dict(
                    ip=ip_address,
                    name=labels.get('app'),
                    status='RUNNING' if len(conditions) == 0 else conditions[0].status,
                    type='kubernetes',
                ))
            except:
                pass

        return services_list


    def create_stateful_set(self, deployment_name, storage_class_name: str = None):
        env_vars = []

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
        
        containers = [
            {
                'name': f'{deployment_name}-container',
                'image': 'mageai/mageai:latest',
                'command': ['mage', 'start', deployment_name],
                'env': env_vars,
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
                ]
            }
        ]
        
        volumes = []
        if os.getenv(SERVICE_ACCOUNT_SECRETS_NAME):
            credential_file_path = os.getenv(SERVICE_ACCOUNT_CREDENTIAL_FILE_PATH, 'service_account.json')
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
                            'memory': '2Gi',
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

        stateful_set = {
            'apiVersion': 'apps/v1',
            'kind': 'StatefulSet',
            'metadata': {
                'name': deployment_name,
                'labels': {
                    'app': deployment_name
                }
            },
            'spec': {
                'selector': {
                    'matchLabels': {
                        'app': deployment_name
                    }
                },
                'replicas': 1,
                'minReadySeconds': 10,
                'template': {
                    'metadata': {
                        'labels': {
                            'app': deployment_name
                        }
                    },
                    'spec': {
                        'terminationGracePeriodSeconds': 10,
                        'containers': containers,
                        'volumes': volumes
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

        service_name = f'{deployment_name}-service'
        service = {
            'apiVersion': 'v1',
            'kind': 'Service',
            'metadata': {
                'name': service_name,
                'labels': {
                    'app': deployment_name,
                    'dev-instance': '1',
                }
            },
            'spec': {
                'ports': [
                    {
                        'protocol': 'TCP',
                        'port': 80,
                        'targetPort': 6789,
                    }
                ],
                'selector': {
                    'app': deployment_name
                },
                'type': 'LoadBalancer'
            }
        }

        self.core_client.create_namespaced_service(self.namespace, service)
