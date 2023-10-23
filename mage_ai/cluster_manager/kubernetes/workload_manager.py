import ast
import importlib.util
import json
import os
from typing import Dict, List

import yaml
from kubernetes import client, config
from kubernetes.client.exceptions import ApiException
from kubernetes.stream import stream

from mage_ai.cluster_manager.config import LifecycleConfig
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
    PG_DB_NAME,
    PG_DB_PASS,
    PG_DB_USER,
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
        self.networking_client = client.NetworkingV1Api()

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

        stateful_sets = self.apps_client.list_namespaced_stateful_set(self.namespace).items
        stateful_set_mapping = dict()
        for ss in stateful_sets:
            try:
                name = ss.metadata.name
                stateful_set_mapping[name] = ss
            except Exception:
                pass

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
                stateful_set = stateful_set_mapping.get(name)
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
                elif stateful_set and stateful_set.spec.replicas == 0:
                    workload['status'] = 'STOPPED'
                else:
                    workload['status'] = 'UNAVAILABLE'

                workloads_list.append(workload)
            except Exception:
                pass

        return workloads_list

    def create_workload(
        self,
        name: str,
        lifecycle_config: LifecycleConfig,
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

        ingress_name = kwargs.get('ingress_name')

        volumes = []

        # Create stateful set
        env_vars = self.__populate_env_vars(
            name,
            project_type=project_type,
            project_uuid=project_uuid,
            container_config=container_config,
            set_base_path=ingress_name is not None,
        )
        container_config['env'] = env_vars

        mage_container_config = {
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

        containers = [mage_container_config]

        init_containers = []
        pre_start_script_path = lifecycle_config.pre_start_script_path
        if pre_start_script_path:
            self.configure_pre_start(name, pre_start_script_path, mage_container_config)

            volumes.append(
                {
                    'name': 'pre-start-script',
                    'configMap': {
                        'name': f'{name}-pre-start',
                        'items': [
                            {
                                'key': 'pre-start.py',
                                'path': 'pre-start.py',
                            },
                            {
                                'key': 'initial-config.json',
                                'path': 'initial-config.json',
                            }
                        ]
                    }
                }
            )

            init_containers.append(
                {
                    'name': f'{name}-pre-start',
                    'image': 'mageai/pre-start:latest',
                    'imagePullPolicy': 'Always',
                    'volumeMounts': [
                        {
                            'name': 'pre-start-script',
                            'mountPath': '/app/pre-start.py',
                            'subPath': 'pre-start.py',
                        },
                        {
                            'name': 'pre-start-script',
                            'mountPath': '/app/initial-config.json',
                            'subPath': 'initial-config.json',
                        }
                    ],
                    'env': [
                        {
                            'name': 'WORKSPACE_NAME',
                            'value': name,
                        },
                        {
                            'name': KUBE_NAMESPACE,
                            'value': os.getenv(KUBE_NAMESPACE, 'default'),
                        }
                    ],
                }
            )

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
            initContainers=init_containers,
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

        k8s_service = self.core_client.create_namespaced_service(self.namespace, service)

        try:
            if ingress_name:
                self.add_service_to_ingress_paths(ingress_name, service_name, name)
        except Exception as err:
            self.delete_workload(name)
            raise err

        return k8s_service

    def add_service_to_ingress_paths(
        self,
        ingress_name: str,
        service_name: str,
        workspace_name: str,
    ) -> None:
        ingress = self.networking_client.read_namespaced_ingress(ingress_name, self.namespace)
        rule = ingress.spec.rules[0]
        paths = rule.http.paths
        paths.insert(
            0,
            client.V1HTTPIngressPath(
                backend=client.V1IngressBackend(
                    service=client.V1IngressServiceBackend(
                        name=service_name,
                        port=client.V1ServiceBackendPort(
                            number=6789
                        )
                    )
                ),
                path=f'/{workspace_name}',
                path_type='Prefix',
            )
        )
        ingress.spec.rules[0] = client.V1IngressRule(
            host=rule.host,
            http=client.V1HTTPIngressRuleValue(paths=paths),
        )
        self.networking_client.patch_namespaced_ingress(ingress_name, self.namespace, ingress)

    def delete_workload(self, name: str):
        self.apps_client.delete_namespaced_stateful_set(name, self.namespace)
        self.core_client.delete_namespaced_service(f'{name}-service', self.namespace)
        # TODO: remove service from ingress paths
        try:
            self.core_client.delete_namespaced_config_map(f'{name}-pre-start', self.namespace)
        except ApiException as ex:
            # The delete operation will return a 404 response if the config map does not exist
            if ex.status != 404:
                raise

    def get_workload_activity(self, name: str) -> Dict:
        pods = self.core_client.list_namespaced_pod(self.namespace).items
        pod_name = None
        for pod in pods:
            try:
                metadata_name = pod.metadata.labels.get('app')
                if metadata_name == name:
                    pod_name = pod.metadata.name
                    break
            except Exception:
                pass
        if pod_name:
            exec_command = [
                '/bin/sh',
                '-c',
                'curl -s --request GET --url '
                'http://localhost:6789/api/statuses?_format=with_activity_details '
                '--header "Content-Type: application/json"',
            ]
            resp = stream(
                self.core_client.connect_get_namespaced_pod_exec,
                pod_name,
                self.namespace,
                command=exec_command,
                stderr=True,
                stdin=False,
                stdout=True,
                tty=False,
            )
            resp = ast.literal_eval(resp)
            status = resp.get('statuses')[0]
            return status

    def scale_down_workload(self, name: str) -> None:
        self.apps_client.patch_namespaced_stateful_set_scale(
            name, namespace=self.namespace, body={'spec': {'replicas': 0}},
        )

    def restart_workload(self, name: str) -> None:
        self.apps_client.patch_namespaced_stateful_set_scale(
            name, namespace=self.namespace, body={'spec': {'replicas': 1}},
        )

    def configure_pre_start(
        self,
        name: str,
        pre_start_script_path: str,
        mage_container_config: Dict,
    ) -> None:
        self.__validate_pre_start_script(pre_start_script_path, mage_container_config)

        with open(pre_start_script_path, 'r', encoding='utf-8') as f:
            pre_start_script = f.read()

        config_map = {
            'data': {
                'pre-start.py': pre_start_script,
                'initial-config.json': json.dumps(mage_container_config),
            },
            'metadata': {
                'name': f'{name}-pre-start',
            }
        }
        self.core_client.create_namespaced_config_map(
            namespace=self.namespace,
            body=config_map
        )

    def __validate_pre_start_script(
        self,
        pre_start_script_path: str,
        mage_container_config: Dict,
    ) -> None:
        with open(pre_start_script_path, 'r', encoding='utf-8') as f:
            pre_start_script = f.read()
        try:
            compile(pre_start_script, pre_start_script_path, 'exec')
        except Exception as ex:
            raise Exception(f'Pre-start script is invalid: {str(ex)}')

        spec = importlib.util.spec_from_file_location('pre_start', pre_start_script_path)
        module = importlib.util.module_from_spec(spec)

        try:
            spec.loader.exec_module(module)
            get_custom_configs = module.get_custom_configs

            get_custom_configs(mage_container_config)
        except AttributeError as ex:
            raise Exception(
                'Could not find get_custom_configs function in pre-start script'
                f', error: {str(ex)}'
            )
        except Exception as ex:
            raise Exception(f'Pre-start script validation failed with error: {str(ex)}')

    def __populate_env_vars(
        self,
        name,
        project_type: str = 'standalone',
        project_uuid: str = None,
        container_config: Dict = None,
        set_base_path: bool = False,
    ) -> List:
        env_vars = [
            {
                'name': 'USER_CODE_PATH',
                'value': name,
            }
        ]
        if set_base_path:
            env_vars.append({
                'name': 'MAGE_BASE_PATH',
                'value': name,
            })
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
                    'name': PG_DB_USER,
                    'valueFrom': {
                        'secretKeyRef': {
                            'name': db_secrets_name,
                            'key': 'username'
                        }
                    }
                },
                {
                    'name': PG_DB_PASS,
                    'valueFrom': {
                        'secretKeyRef': {
                            'name': db_secrets_name,
                            'key': 'password'
                        }
                    }
                },
                {
                    'name': PG_DB_NAME,
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
        name: str,
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
        persistent_volumes = self.core_client.list_persistent_volume().items
        for volume in persistent_volumes:
            if volume.metadata.name == f'{name}-pv':
                return
        self.core_client.create_persistent_volume(pv)
