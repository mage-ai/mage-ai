from .base import BaseHandler
from enum import Enum
from mage_ai.cluster_manager.constants import (
    ECS_CLUSTER_NAME,
    ECS_CONTAINER_NAME,
    ECS_TASK_DEFINITION,
    GCP_PATH_TO_KEYFILE,
    GCP_PROJECT_ID,
    GCP_REGION,
    KUBE_NAMESPACE,
    KUBE_STORAGE_CLASS_NAME
)
from mage_ai.server.active_kernel import (
    get_active_kernel_name,
)
from mage_ai.server.kernels import KernelName
from mage_ai.shared.hash import merge_dict

import os

class ClusterType(str, Enum):
    EMR = 'emr'
    ECS = 'ecs'
    CLOUD_RUN = 'cloud_run'
    K8S = 'k8s'


class ApiClustersHandler(BaseHandler):
    def get(self, cluster_type):
        clusters = []
        if cluster_type == ClusterType.EMR and get_active_kernel_name() == KernelName.PYSPARK:
            from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager
            clusters = emr_cluster_manager.list_clusters()
        self.write(dict(clusters=clusters))

    def post(self, cluster_type):
        success = False

        if cluster_type == ClusterType.EMR:
            from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager
            cluster_payload = self.get_payload().get('cluster')
            if cluster_payload is None:
                raise Exception('Please include cluster info in the request payload')
            action = cluster_payload.get('action')
            if action == 'create_new_cluster':
                cluster_id = emr_cluster_manager.create_cluster()['cluster_id']
                success = True
            elif action == 'set_active_cluster':
                cluster_id = cluster_payload.get('cluster_id')
                if cluster_id is None:
                    raise Exception('Please include cluster_id in thhe request payhload')
                emr_cluster_manager.set_active_cluster(cluster_id)
                success = True

        self.write(dict(
            cluster=merge_dict(dict(id=cluster_id), cluster_payload),
            success=success,
        ))

    def put(self, cluster_type):
        if cluster_type == ClusterType.EMR:
            from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager
            cluster_payload = self.get_payload().get('cluster')
            if cluster_payload is None:
                raise Exception('Please include cluster info in the request payload')
            action = cluster_payload.get('action')

            cluster_id = cluster_payload.get('id')
            if cluster_id is None:
                raise Exception('Please include cluster_id in thhe request payhload')
            emr_cluster_manager.set_active_cluster(cluster_id)
            success = True

        self.write(dict(
            cluster=merge_dict(dict(id=cluster_id), cluster_payload),
            success=success,
        ))


class ApiInstancesHandler(BaseHandler):
    def get(self, cluster_type):
        instances = []
        if cluster_type == ClusterType.ECS:
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager

            try:
                cluster_name = self.get_argument('cluster_name', os.getenv(ECS_CLUSTER_NAME))
                ecs_instance_manager = EcsTaskManager(cluster_name)
                instances = ecs_instance_manager.list_tasks()
            except Exception as e:
                print(str(e))
                instances = list()
        elif cluster_type == ClusterType.CLOUD_RUN:
            from mage_ai.cluster_manager.gcp.cloud_run_service_manager import CloudRunServiceManager
            project_id = os.getenv(GCP_PROJECT_ID)
            path_to_credentials = os.getenv(GCP_PATH_TO_KEYFILE)
            region = os.getenv(GCP_REGION)
            cloud_run_service_manager = CloudRunServiceManager(
                project_id,
                path_to_credentials,
                region=region
            )

            instances = cloud_run_service_manager.list_services()
        elif cluster_type == ClusterType.K8S:
            from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager
            namespace = os.getenv(KUBE_NAMESPACE)
            workload_manager = WorkloadManager(namespace)

            instances = workload_manager.list_services()

        self.write(dict(instances=instances))

    def post(self, cluster_type):
        if cluster_type == 'ecs':
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
            instance_payload = self.get_payload().get('instance')
            name = instance_payload.get('name')
            cluster_name = instance_payload.get('cluster_name', os.getenv(ECS_CLUSTER_NAME))
            task_definition = instance_payload.get('task_definition', os.getenv(ECS_TASK_DEFINITION))
            container_name = instance_payload.get('container_name', os.getenv(ECS_CONTAINER_NAME))

            ecs_instance_manager = EcsTaskManager(cluster_name)

            instance = ecs_instance_manager.create_task(
                name,
                task_definition,
                container_name,
            )

            self.write(dict(
                instance=instance,
                success=True,
            ))
        elif cluster_type == 'cloud_run':
            from mage_ai.cluster_manager.gcp.cloud_run_service_manager import CloudRunServiceManager
            instance_payload = self.get_payload().get('instance')
            name = instance_payload.get('name')
            project_id = instance_payload.get('project_id', os.getenv(GCP_PROJECT_ID))
            path_to_credentials = instance_payload.get(
                'path_to_credentials',
                os.getenv('path_to_keyfile')
            )
            region = instance_payload.get('region', os.getenv('GCP_REGION'))

            cloud_run_service_manager = CloudRunServiceManager(
                project_id,
                path_to_credentials,
                region=region
            )

            cloud_run_service_manager.create_service(name)

            self.write(dict(success=True))
        elif cluster_type == ClusterType.K8S:
            from mage_ai.cluster_manager.kubernetes.workload_manager import WorkloadManager
            instance_payload = self.get_payload().get('instance')
            name = instance_payload.get('name')
            namespace = instance_payload.get('namespace', os.getenv(KUBE_NAMESPACE))
            storage_class_name = instance_payload.get(
                'storage_class_name',
                os.getenv(KUBE_STORAGE_CLASS_NAME)
            )

            k8s_workload_manager = WorkloadManager(namespace)
            k8s_workload_manager.create_stateful_set(
                name,
                storage_class_name=storage_class_name
            )

            self.write(dict(success=True))


class ApiInstanceDetailHandler(BaseHandler):
    def put(self, cluster_type, instance_name):
        if cluster_type == 'ecs':
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
            instance_payload = self.get_payload().get('instance')
            task_arn = instance_payload.get('task_arn')
            cluster_name = instance_payload.get('cluster_name', os.getenv(ECS_CLUSTER_NAME))
            task_definition = instance_payload.get('task_definition', os.getenv(ECS_TASK_DEFINITION))
            container_name = instance_payload.get('container_name', os.getenv(ECS_CONTAINER_NAME))

            action = instance_payload.get('action')

            ecs_instance_manager = EcsTaskManager(cluster_name)    
            instance = None
            if action == 'stop':
                instance = ecs_instance_manager.stop_task(task_arn)
            elif action == 'resume':
                instance = ecs_instance_manager.create_task(
                    instance_name,
                    task_definition,
                    container_name,
                )


        self.write(dict(
            instance=instance,
            success=True,
        ))

    def delete(self, cluster_type, instance_name):
        if cluster_type == 'ecs':
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
            task_arn = self.get_argument('task_arn', None)
            cluster_name = self.get_argument('cluster_name', os.getenv(ECS_CLUSTER_NAME))

            ecs_instance_manager = EcsTaskManager(cluster_name)
            ecs_instance_manager.delete_task(instance_name, task_arn)

        self.write(dict(
            success=True
        ))
