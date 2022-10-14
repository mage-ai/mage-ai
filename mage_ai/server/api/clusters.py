from mage_ai.shared.array import difference
from .base import BaseHandler
from mage_ai.shared.hash import merge_dict

import json
import os


class ApiClustersHandler(BaseHandler):
    def get(self, cluster_type):
        clusters = []
        if cluster_type == 'emr':
            from mage_ai.cluster_manager.aws.emr_cluster_manager import emr_cluster_manager
            clusters = emr_cluster_manager.list_clusters()
        self.write(dict(clusters=clusters))

    def post(self, cluster_type):
        success = False

        if cluster_type == 'emr':
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
        if cluster_type == 'emr':
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
        if cluster_type == 'ecs':
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager

            cluster_name = self.get_argument('cluster_name', os.getenv('ECS_CLUSTER_NAME'))
            ecs_instance_manager = EcsTaskManager(cluster_name)
            instances = ecs_instance_manager.list_tasks()


        self.write(dict(instances=instances))

    def post(self, cluster_type):
        if cluster_type == 'ecs':
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
            instance_payload = self.get_payload().get('instance')
            name = instance_payload.get('name')
            cluster_name = instance_payload.get('cluster_name', os.getenv('ECS_CLUSTER_NAME'))
            task_definition = instance_payload.get('task_definition', os.getenv('ECS_TASK_DEFINITION'))
            container_name = instance_payload.get('container_name', os.getenv('ECS_CONTAINER_NAME'))

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


class ApiInstanceDetailHandler(BaseHandler):
    def put(self, cluster_type, instance_name):
        if cluster_type == 'ecs':
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
            instance_payload = self.get_payload().get('instance')
            task_arn = instance_payload.get('task_arn')
            cluster_name = instance_payload.get('cluster_name', os.getenv('ECS_CLUSTER_NAME'))
            task_definition = instance_payload.get('task_definition', os.getenv('ECS_TASK_DEFINITION'))
            container_name = instance_payload.get('container_name', os.getenv('ECS_CONTAINER_NAME'))

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
            cluster_name = self.get_argument('cluster_name', os.getenv('ECS_CLUSTER_NAME'))

            ecs_instance_manager = EcsTaskManager(cluster_name)
            ecs_instance_manager.delete_task(instance_name, task_arn)

        self.write(dict(
            success=True
        ))
