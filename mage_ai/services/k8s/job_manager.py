from kubernetes import client, config
from mage_ai.services.k8s.constants import (
    DEFAULT_NAMESPACE,
    KUBE_POD_NAME_ENV_VAR,
)
from mage_ai.shared.hash import merge_dict
import os
import time


class JobManager():
    def __init__(
        self,
        job_name: str = 'mage-job',
        namespace: str = DEFAULT_NAMESPACE,
        logger=None,
        logging_tags=dict(),
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

    def run_job(self, command):
        job = self.create_job_object(command)

        self.create_job(job)

        job_completed = False
        while not job_completed:
            api_response = self.batch_api_client.read_namespaced_job_status(
                name=self.job_name,
                namespace=self.namespace
            )
            if api_response.status.succeeded is not None or \
                    api_response.status.failed is not None:
                job_completed = True
            time.sleep(1)
            self._print(f'Job {self.job_name} status={api_response.status}')

        self.delete_job()

    def create_job_object(self, command):
        # Configureate Pod template container
        container = client.V1Container(
            name='mage-job-container',
            image='mageai/mageai',
            command=command.split(' '),
            volume_mounts=self.pod_config.spec.containers[0].volume_mounts,
        )
        # Create and configurate a spec section
        template = client.V1PodTemplateSpec(
            metadata=client.V1ObjectMeta(labels={'name': self.job_name}),
            spec=client.V1PodSpec(
                restart_policy='Never',
                containers=[container],
                volumes=self.pod_config.spec.volumes,
            ),
        )
        # Create the specification of deployment
        spec = client.V1JobSpec(template=template)
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
        api_response = self.batch_api_client.delete_namespaced_job(
            name=self.job_name,
            namespace=self.namespace,
            body=client.V1DeleteOptions(
                propagation_policy='Foreground',
                grace_period_seconds=0))
        self._print("Job deleted. status='%s'" % str(api_response.status))

    def _print(self, message, **kwargs):
        if self.logger is None:
            print(message, **kwargs)
        else:
            self.logger.info(message, **merge_dict(self.logging_tags, kwargs))
