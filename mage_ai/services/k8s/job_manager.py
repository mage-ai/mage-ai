import os
import time
from typing import Dict

from kubernetes import client, config
from kubernetes.client.rest import ApiException

from mage_ai.services.k8s.config import K8sExecutorConfig
from mage_ai.services.k8s.constants import DEFAULT_NAMESPACE, KUBE_POD_NAME_ENV_VAR
from mage_ai.shared.hash import merge_dict


class JobManager():
    def __init__(
        self,
        job_name: str = 'mage-job',
        namespace: str = DEFAULT_NAMESPACE,
        logger=None,
        logging_tags: Dict = None,
    ):
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
            namespace=self.namespace,
        )

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
        k8s_config=None,
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
            api_response = self.batch_api_client.read_namespaced_job_status(
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
    ):
        # Configureate Pod template container
        mage_server_container_spec = self.pod_config.spec.containers[0]

        container_kwargs = dict(
            name='mage-job-container',
            image=mage_server_container_spec.image,
            image_pull_policy='IfNotPresent',
            command=command.split(' ') if isinstance(command, str) else command,
            env=mage_server_container_spec.env,
            volume_mounts=mage_server_container_spec.volume_mounts,
        )
        if k8s_config and (k8s_config.resource_limits or k8s_config.resource_requests):
            resource_kwargs = dict()
            if k8s_config.resource_limits:
                resource_kwargs['limits'] = k8s_config.resource_limits
            if k8s_config.resource_requests:
                resource_kwargs['requests'] = k8s_config.resource_requests
            container_kwargs['resources'] = client.V1ResourceRequirements(
                **resource_kwargs,
            )

        container = client.V1Container(
            **container_kwargs,
        )
        # Create and configurate a spec section
        pod_spec = dict(
            containers=[container],
            image_pull_secrets=self.pod_config.spec.image_pull_secrets,
            restart_policy='Never',
            volumes=self.pod_config.spec.volumes,
        )
        if k8s_config and k8s_config.service_account_name:
            pod_spec['service_account_name'] = k8s_config.service_account_name
        template = client.V1PodTemplateSpec(
            metadata=client.V1ObjectMeta(labels={'name': self.job_name}),
            spec=client.V1PodSpec(**pod_spec),
        )
        # Create the specification of deployment
        spec = client.V1JobSpec(template=template, backoff_limit=0)
        # Instantiate the job object
        job = client.V1Job(
            api_version=self.api_version,
            kind='Job',
            metadata=client.V1ObjectMeta(name=self.job_name),
            spec=spec)

        return job

    def create_job(self, job):
        api_response = self.batch_api_client.create_namespaced_job(
            body=job,
            namespace=self.namespace,
        )
        self._print("Job created. status='%s'" % str(api_response.status))

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
