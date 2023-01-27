from kubernetes import client, config
import time

JOB_NAME = 'mage-job'


class JobManager():
    def __init__(self, namespace: str = 'default'):
        self.namespace = namespace
        self.load_config()
        self.api_client = client.BatchV1Api()
        self.api_version = 'batch/v1'

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

    def run_job(self, command):
        job = self.create_job_object(command)

        self.create_job(job)
        time.sleep(30)
        self.delete_job()

    def create_job_object(self, command):
        # Configureate Pod template container
        container = client.V1Container(
            name='mage-job-container',
            image='mageai/mageai',
            command=command.split(' '),
        )
        # Create and configurate a spec section
        template = client.V1PodTemplateSpec(
            metadata=client.V1ObjectMeta(labels={'name': JOB_NAME}),
            spec=client.V1PodSpec(
                restart_policy='OnFailure',
                containers=[container],
            ),
        )
        # Create the specification of deployment
        spec = client.V1JobSpec(template=template)
        # Instantiate the job object
        job = client.V1Job(
            api_version=self.api_version,
            kind='Job',
            metadata=client.V1ObjectMeta(name=JOB_NAME),
            spec=spec)

        return job

    def create_job(self, job):
        api_response = self.api_client.create_namespaced_job(
            body=job,
            namespace=self.namespace,
        )
        print("Job created. status='%s'" % str(api_response.status))

    def delete_job(self):
        api_response = self.api_client.delete_namespaced_job(
            name=JOB_NAME,
            namespace='default',
            body=client.V1DeleteOptions(
                propagation_policy='Foreground',
                grace_period_seconds=0))
        print("Job deleted. status='%s'" % str(api_response.status))