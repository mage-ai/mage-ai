from .base import BaseHandler


class ApiEnvironmentsHandler(BaseHandler):
    def get(self, env_type):
        environments = []
        if env_type == 'ecs':
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
            ecs_instance_manager = EcsTaskManager('mage-dev-development-cluster')
            environments = ecs_instance_manager.list_tasks()
        self.write(dict(environments=environments))

    def post(self, env_type):
        if env_type == 'ecs':
            from mage_ai.cluster_manager.aws.ecs_task_manager import EcsTaskManager
            ecs_instance_manager = EcsTaskManager('mage-dev-development-cluster')

            environment_payload = self.get_payload().get('environment')
            name = environment_payload.get('name')

            environment = ecs_instance_manager.create_task(name)

        self.write(dict(
            environment=environment,
            success=True,
        ))

