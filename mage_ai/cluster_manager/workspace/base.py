import os
import uuid
from datetime import datetime
from typing import Dict, List

import ruamel.yaml
import yaml

from mage_ai.cluster_manager.config import WorkspaceConfig
from mage_ai.cluster_manager.constants import (
    ECS_CLUSTER_NAME,
    ECS_CONTAINER_NAME,
    ECS_TASK_DEFINITION,
    GCP_PATH_TO_KEYFILE,
    GCP_PROJECT_ID,
    GCP_REGION,
    KUBE_NAMESPACE,
    ClusterType,
)
from mage_ai.cluster_manager.errors import WorkspaceExistsError
from mage_ai.data_preparation.repo_manager import ProjectType, get_project_type
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db.models.oauth import Role, User
from mage_ai.settings import REQUIRE_USER_AUTHENTICATION
from mage_ai.settings.repo import get_repo_path


class classproperty(property):
    def __get__(self, owner_self, owner_cls):
        return self.fget(owner_cls)


class Workspace:
    def __init__(self, name: str, project_type: ProjectType = None):
        self.name = name
        if project_type == ProjectType.MAIN:
            if not os.path.exists(self.project_folder):
                os.makedirs(self.project_folder)
    
    @classproperty
    def project_folder(cls) -> str:
        return os.path.join(get_repo_path(), 'projects')
    
    @property
    def config_path(self) -> str:
        return os.path.join(self.project_folder, f'{self.name}.yaml')
    
    @classmethod
    def workspace_class_from_type(self, cluster_type: ClusterType) -> 'Workspace':
        from mage_ai.cluster_manager.workspace.kubernetes import (
            DestinationBlock,
            SourceBlock,
            TransformerBlock,
        )

        if BlockType.CHART == block_type:
            return Widget
        elif BlockType.DBT == block_type:
            from mage_ai.data_preparation.models.block.dbt import DBTBlock

            return DBTBlock
        elif pipeline and PipelineType.INTEGRATION == pipeline.type:
            if BlockType.CALLBACK == block_type:
                return CallbackBlock
            elif BlockType.CONDITIONAL == block_type:
                return ConditionalBlock
            elif BlockType.DATA_LOADER == block_type:
                return SourceBlock
            elif BlockType.DATA_EXPORTER == block_type:
                return DestinationBlock
            else:
                return TransformerBlock
        elif BlockLanguage.SQL == language:
            return SQLBlock
        elif BlockLanguage.R == language:
            return RBlock
        return BLOCK_TYPE_TO_CLASS.get(block_type)

    @classmethod
    def create(
        cls,
        cluster_type: ClusterType,
        name: str,
        lifecycle_config: WorkspaceConfig,
        payload: Dict,
    ) -> 'Workspace':
        config_path = None
        project_uuid = None
        project_type = get_project_type()
        if project_type == ProjectType.MAIN:
            config_path = os.path.join(cls.project_folder, f'{name}.yaml')
            if os.path.exists(config_path):
                raise WorkspaceExistsError(
                    f'Project with name {name} already exists'
                )
            yml = ruamel.yaml.YAML()
            yml.preserve_quotes = True
            yml.indent(mapping=2, sequence=2, offset=0)

            project_uuid = uuid.uuid4().hex
            data = dict(project_uuid=project_uuid, config=lifecycle_config.to_dict())

            with open(config_path, 'w') as f:
                yml.dump(data, f)

        workspace = cls(name, project_type)
        try:
            if cluster_type == ClusterType.K8S:
                from mage_ai.cluster_manager.kubernetes.workload_manager import (
                    WorkloadManager,
                )

                namespace = payload.pop('namespace', os.getenv(KUBE_NAMESPACE))

                k8s_workload_manager = WorkloadManager(namespace)
                extra_args = {}
                if project_type == ProjectType.MAIN:
                    extra_args = {
                        'project_type': ProjectType.SUB,
                        'project_uuid': project_uuid,
                    }
                k8s_workload_manager.create_workload(
                    workspace_name,
                    workspace_config,
                    **payload,
                    **extra_args,
                )
        except Exception:
            if workspace_file and os.path.exists(workspace_file):
                os.remove(workspace_file)
            raise

            
