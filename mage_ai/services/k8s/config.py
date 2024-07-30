from dataclasses import dataclass
from typing import Dict

from kubernetes.client import (
    V1Container,
    V1EnvVar,
    V1JobSpec,
    V1LocalObjectReference,
    V1ObjectMeta,
    V1PodSpec,
    V1PodTemplateSpec,
    V1ResourceRequirements,
    V1Toleration,
    V1Volume,
    V1VolumeMount,
)

from mage_ai.services.k8s.constants import CONFIG_FILE, DEFAULT_NAMESPACE
from mage_ai.services.k8s.utils import parse_affinity_config
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.hash import get_safe_value

# import traceback

DEFAULT_SERVICE_ACCOUNT_NAME = 'default'
ECS_CONTAINER_METADATA_URI_VAR = 'ECS_CONTAINER_METADATA_URI_V4'


@dataclass
class K8sResourceConfig(BaseConfig):
    cpu: str
    memory: str


@dataclass
class K8sExecutorConfig(BaseConfig):
    container_config: Dict = None
    job_name_prefix: str = None
    namespace: str = None
    resource_limits: Dict = None
    resource_requests: Dict = None
    service_account_name: str = None
    config_file: str = CONFIG_FILE
    # those configs are loaded from the config file
    metadata: Dict = None
    container: Dict = None
    pod: Dict = None
    job: Dict = None
    # parsed k8s objects
    pod_config: V1PodSpec = None
    job_config: V1JobSpec = None
    meta: V1ObjectMeta = None

    @classmethod
    def load(self, config_path: str = None, config: Dict = None):
        executor_config = super().load(config_path=config_path, config=config)

        service_account_name = DEFAULT_SERVICE_ACCOUNT_NAME
        affinity = None
        node_selector = None
        tolerations = []
        volumes = []
        image_pull_secrets = {}
        if executor_config.pod:
            service_account_name = (
                executor_config.pod.get('service_account_name') or DEFAULT_SERVICE_ACCOUNT_NAME
            )
            if executor_config.pod.get('affinity'):
                # Convert the affinity to a V1Affinity object
                affinity = parse_affinity_config(executor_config.pod['affinity'])

            if executor_config.pod.get('node_selector'):
                node_selector = executor_config.pod['node_selector']

            if executor_config.pod.get('tolerations'):
                tolerations += [V1Toleration(**e) for e in executor_config.pod['tolerations']]

            if executor_config.pod.get('volumes'):
                volumes += [V1Volume(**e) for e in executor_config.pod['volumes']]

            image_pull_secrets = None
            if executor_config.pod.get('image_pull_secrets'):
                image_pull_secrets = V1LocalObjectReference(
                    name=executor_config.pod['image_pull_secrets'])

        # to keep backward compatibility
        if executor_config.service_account_name:
            service_account_name = executor_config.service_account_name

        if executor_config.metadata:
            executor_config.meta = V1ObjectMeta(**executor_config.metadata)
            executor_config.namespace = (
                executor_config.metadata.get('namespace') or DEFAULT_NAMESPACE
            )

        env = []
        volume_mounts = []
        resources = V1ResourceRequirements()
        if executor_config.container:
            if (executor_config.container
                and (executor_config.container.get('resources')
                     and isinstance(executor_config.container['resources'], Dict))):
                resources = V1ResourceRequirements(**executor_config.container['resources'])

            if executor_config.container.get('env'):
                env += [V1EnvVar(**e) for e in executor_config.container['env']]

            if executor_config.container.get('volume_mounts'):
                volume_mounts += [V1VolumeMount(**e)
                                  for e in executor_config.container['volume_mounts']]

        container = V1Container(
            name=get_safe_value(executor_config.container, 'name', 'mage-job-container'),
            image_pull_policy=get_safe_value(executor_config.container,
                                             'image_pull_policy', 'IfNotPresent'),
            image=get_safe_value(executor_config.container, 'image', ''),
            env=env,
            volume_mounts=volume_mounts,
            resources=resources)

        executor_config.pod_config = V1PodSpec(
            affinity=affinity,
            containers=[container],
            image_pull_secrets=image_pull_secrets,
            node_selector=node_selector,
            restart_policy='Never',
            service_account_name=service_account_name,
            tolerations=tolerations,
            volumes=volumes,
        )

        active_deadline_seconds = None
        backoff_limit = 0
        ttl_seconds_after_finished = None

        if executor_config.job:
            active_deadline_seconds = executor_config.job.get('active_deadline_seconds')
            backoff_limit = executor_config.job.get('backoff_limit')
            ttl_seconds_after_finished = executor_config.job.get('ttl_seconds_after_finished')

        executor_config.job_config = V1JobSpec(
            active_deadline_seconds=active_deadline_seconds,
            backoff_limit=backoff_limit,
            ttl_seconds_after_finished=ttl_seconds_after_finished,
            template=V1PodTemplateSpec(
                spec=executor_config.pod_config
            )
        )

        return executor_config

    @classmethod
    def load_extra_config(self):
        if self.config_file == '':
            return {}
        return super().load_file(self.config_file)
