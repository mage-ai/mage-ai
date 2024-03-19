import os
import time
from typing import Dict, Union

from kubernetes import client, config
from kubernetes.client import V1Container, V1PodSpec
from kubernetes.client.rest import ApiException

from mage_ai.services.k8s.config import K8sExecutorConfig
from mage_ai.services.k8s.constants import (
    DEFAULT_NAMESPACE,
    KUBE_CONTAINER_NAME,
    KUBE_POD_NAME_ENV_VAR,
    KUBE_POD_NAMESPACE_ENV_VAR,
)
from mage_ai.shared.hash import merge_dict


class JobManager():
    def __init__(
        self,
        job_name: str = 'mage-job',
        namespace: str = DEFAULT_NAMESPACE,
        logger=None,
        logging_tags: Dict = None,
    ):
        """Initialize the kubernetes job manager.

        Args:
            job_name (str, optional): The name of the job.
            namespace (str, optional): The namespace of the executor pod.
            logger (None, optional): Logger to log the messages.
            logging_tags (Dict, optional): Logging tags to be included in the log messages.
        """
        self.job_name = job_name
        self.namespace = namespace
        self.logger = logger
        self.logging_tags = logging_tags or dict()

        self.load_config()
        self.batch_api_client = client.BatchV1Api()
        self.api_version = 'batch/v1'
        self.core_api_client = client.CoreV1Api()

        self.pod_config = self.core_api_client.read_namespaced_pod(
            name=os.getenv(KUBE_POD_NAME_ENV_VAR),
            namespace=os.getenv(KUBE_POD_NAMESPACE_ENV_VAR, self.namespace),
        )
        self.container_name = KUBE_CONTAINER_NAME

    @classmethod
    def load_config(cls) -> bool:
        try:
            config.load_incluster_config()
            return True
        except Exception:
            pass

        try:
            config.load_kube_config()
            return True
        except Exception:
            pass

        return False

    def run_job(
        self,
        command: str,
        k8s_config: Union[K8sExecutorConfig, Dict] = None,
    ):
        if not self.job_exists():
            if type(k8s_config) is dict:
                k8s_config = K8sExecutorConfig.load(config=k8s_config)
            job = self.create_job_object(
                command,
                k8s_config=k8s_config,
            )

            self.create_job(job)

        api_response = None
        job_completed = False
        while not job_completed:
            api_response = self.batch_api_client.read_namespaced_job(
                name=self.job_name,
                namespace=self.namespace
            )
            if api_response.status.succeeded is not None or \
                    api_response.status.failed is not None:
                job_completed = True
            time.sleep(5)
            # self._print(f'Job {self.job_name} status={api_response.status}')

        self.delete_job()
        self._print(f'Job {self.job_name} status={api_response.status}')
        if api_response.status.succeeded is None:
            raise Exception(f'Failed to execute k8s job {self.job_name}')

    def create_job_object(
        self,
        command: str,
        k8s_config: K8sExecutorConfig = None,
    ) -> client.V1Job:
        # Configure Pod template container
        if not k8s_config.pod_config:
            k8s_config.pod_config = k8s_config.load(config={}).pod_config
        command = command.split(' ') if isinstance(command, str) else command
        pod_spec = self.merge_pod_spec(k8s_config.pod_config, command)
        filter_used_volumes(pod_spec)
        meta = client.V1ObjectMeta(name=self.job_name)
        if k8s_config and k8s_config.meta:
            k8s_config.meta.name = self.job_name
            meta = k8s_config.meta

        # to keep backward compatibility
        if k8s_config and (k8s_config.resource_limits or k8s_config.resource_requests):
            resource_kwargs = dict()
            if k8s_config.resource_limits:
                resource_kwargs['limits'] = k8s_config.resource_limits
            if k8s_config.resource_requests:
                resource_kwargs['requests'] = k8s_config.resource_requests
            pod_spec.containers[0].resources = client.V1ResourceRequirements(
                **resource_kwargs,
            )

        if k8s_config and k8s_config.container_config:
            k8s_config.container_config.setdefault('name', 'mage-data')
            pod_spec.containers = [
                merge_containers(
                    client.V1Container(**k8s_config.container_config),
                    pod_spec.containers[0])]

        template = client.V1PodTemplateSpec(
            metadata=meta,
            spec=pod_spec,
        )

        # Create the specification of deployment
        spec = client.V1JobSpec(template=template, backoff_limit=0)
        # Instantiate the job object
        job = client.V1Job(
            api_version=self.api_version,
            kind='Job',
            metadata=meta,
            spec=spec)

        return job

    def merge_pod_spec(self, pod_spec: V1PodSpec, command: str) -> V1PodSpec:
        """
        Merges the pod spec with the current pod's spec.

        Args:
        - pod_spec (V1PodSpec): The pod specification to be merged.
        - command (str): The command to be executed.

        Returns:
        - V1PodSpec: The merged pod specification.
        """
        container = self.merge_container_spec(pod_spec.containers[0], command)
        pod_spec.containers = [container]
        mage_server_pod_spec = self.pod_config.spec
        pod_spec.volumes.extend(mage_server_pod_spec.volumes)
        if not pod_spec.tolerations:
            # If there're no tolerations override, use server's tolerations
            pod_spec.tolerations = mage_server_pod_spec.tolerations
        pod_spec.node_selector = mage_server_pod_spec.node_selector
        pod_spec.image_pull_secrets = pod_spec.image_pull_secrets if pod_spec.image_pull_secrets \
            else mage_server_pod_spec.image_pull_secrets
        return pod_spec

    def merge_container_spec(self, container_spec: V1Container, command: str) -> V1Container:
        """
        Merges the container spec with the current pod's container spec.

        Args:
        - container_spec (V1Container): The container specification to be merged.
        - command (str): The command to be executed.

        Returns:
        - V1Container: The merged container specification.
        """
        mage_server_container_spec = self.get_mage_server_container()
        container_spec.env = container_spec.env + \
            [item for item in mage_server_container_spec.env if item not in container_spec.env]
        container_spec.env_from = (container_spec.env_from or []) + \
            [item for item in (mage_server_container_spec.env_from or [])
             if item not in (container_spec.env_from or [])]
        container_spec.volume_mounts = container_spec.volume_mounts + \
            [item for item in mage_server_container_spec.volume_mounts
                if item not in container_spec.volume_mounts]
        container_spec.image = container_spec.image if container_spec.image else \
            mage_server_container_spec.image
        container_spec.command = command
        return container_spec

    def get_mage_server_container(self) -> V1Container:
        # If self.container_name is provided, search for the container
        if self.container_name:
            container = next(
                (c for c in self.pod_config.spec.containers if c.name == self.container_name), None)

            # If container is found, return it
            if container:
                return container

            # If container is not found, print a message
            self._print(
                f"Container with the name '{self.container_name}' not found. \
                 Using the first container '{self.pod_config.spec.containers[0].name}'")

        # Return the first container as default
        return self.pod_config.spec.containers[0]

    def create_job(self, job):
        api_response = self.batch_api_client.create_namespaced_job(
            body=job,
            namespace=self.namespace,
        )
        self._print(f"Job created. status='{api_response.status}'")

    def delete_job(self):
        try:
            api_response = self.batch_api_client.delete_namespaced_job(
                name=self.job_name,
                namespace=self.namespace,
                body=client.V1DeleteOptions(
                    propagation_policy='Foreground',
                    grace_period_seconds=0))
            self._print("Job deleted. status='%s'" % str(api_response.status))
        except Exception as e:
            self._print(f'Failed to delete job {self.job_name} with error {e}')

    def job_exists(self):
        try:
            self.batch_api_client.read_namespaced_job(
                name=self.job_name,
                namespace=self.namespace
            )
            return True
        except ApiException:
            pass
        return False

    def _print(self, message, **kwargs):
        if self.logger is None:
            print(message, **kwargs)
        else:
            self.logger.info(message, **merge_dict(self.logging_tags, kwargs))


def filter_used_volumes(pod_spec: V1PodSpec):
    # Extract names of all volumes used in volume mounts
    used_volume_names = {vm.name for vm in pod_spec.containers[0].volume_mounts}
    # Filter the volumes list based on the extracted names
    pod_spec.volumes = [vol for vol in pod_spec.volumes if vol.name in used_volume_names]
    return


def merge_containers(left: V1Container, right: V1Container) -> V1Container:
    """
    Merge two V1Container objects.

    The merging process follows these rules:
    - For non-list and non-dict attributes, if the attribute in `left` is not None,
      use that; otherwise, use the attribute in `right`.
    - For list attributes (excluding 'command'), append non-duplicate elements from
      `right` to `left`.
    - For the 'command' attribute, only use the value from `left` if it's not None.
    - For dict attributes, add non-duplicate key-value pairs from `right` to `left`.

    Args:
        left (V1Container): The primary container whose attributes should be preferred
        during merging.
        right (V1Container): The secondary container whose attributes are used if the
        primary's are None.

    Returns:
        V1Container: A new container that is the result of the merge.

    Example:
        container1 = V1Container(name="container1", image="image1", command=["cmd1", "cmd2"],
                                 env=[{"name": "KEY1", "value": "VALUE1"}])
        container2 = V1Container(name="container2", image="image2", command=["cmd3", "cmd4"],
                                 env=[{"name": "KEY2", "value": "VALUE2"}])
        merged_container = merge_containers(container1, container2)
    """
    merged = V1Container(name="")

    for attr, left_value in merged.__dict__.items():
        left_value = left.__dict__[attr]
        right_value = right.__dict__[attr]
        # Special case for 'command' attribute
        if attr == "_command":
            if left_value is not None:
                setattr(merged, attr, left_value)
            else:
                setattr(merged, attr, right_value)
            continue

        if left_value is not None:
            # For attributes that are lists
            if isinstance(
                    left_value,
                    list) and attr in right.__dict__ and isinstance(
                    right_value,
                    list):
                setattr(merged, attr, left_value +
                        [item for item in right_value if item not in left_value])

            # For attributes that are dicts
            elif isinstance(left_value, dict) and attr in right.__dict__ and isinstance(
                    right_value, dict):
                merged_dict = left_value.copy()
                for key, val in right_value.items():
                    if key not in merged_dict:
                        merged_dict[key] = val
                setattr(merged, attr, merged_dict)

            # For other attributes
            else:
                setattr(merged, attr, left_value)

        elif attr in right.__dict__ and right_value is not None:
            setattr(merged, attr, right_value)

    return merged
