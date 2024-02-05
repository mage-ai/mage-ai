import os

import yaml

from mage_ai.cluster_manager.config import CloudRunWorkspaceConfig
from mage_ai.cluster_manager.constants import GCP_PROJECT_ID, ClusterType
from mage_ai.cluster_manager.gcp.cloud_run_service_manager import CloudRunServiceManager
from mage_ai.cluster_manager.workspace.base import Workspace
from mage_ai.shared.hash import merge_dict


class CloudRunWorkspace(Workspace):
    config_class = CloudRunWorkspaceConfig
    cluster_type = ClusterType.CLOUD_RUN

    def __init__(self, name: str):
        super().__init__(name)
        self.cloud_run_service_manager = CloudRunServiceManager(
            self.config.project_id or os.getenv(GCP_PROJECT_ID),
            self.config.path_to_credentials or os.getenv('path_to_keyfile'),
            region=self.config.region or os.getenv('GCP_REGION'),
        )

    @classmethod
    def initialize(
        cls,
        name: str,
        config_path: str,
        **kwargs,
    ) -> Workspace:
        project_id = kwargs.get('project_id', os.getenv(GCP_PROJECT_ID))
        path_to_credentials = kwargs.get(
            'path_to_credentials', os.getenv('path_to_keyfile')
        )
        region = kwargs.get('region', os.getenv('GCP_REGION'))
        workspace_config = CloudRunWorkspaceConfig.load(
            config=merge_dict(
                kwargs,
                dict(
                    project_id=project_id,
                    path_to_credentials=path_to_credentials,
                    region=region,
                ),
            )
        )
        if config_path:
            with open(config_path, 'w', encoding='utf-8') as fp:
                yaml.dump(
                    workspace_config.to_dict(),
                    fp,
                )

        cloud_run_service_manager = CloudRunServiceManager(
            project_id, path_to_credentials, region=region
        )

        cloud_run_service_manager.create_service(name)

        return cls(name)

    def delete(self, **kwargs):
        raise NotImplementedError('Delete not implemented for Cloud Run')

    def update(self, **kwargs):
        raise NotImplementedError('Update not implemented for Cloud Run')

    def stop(self):
        raise NotImplementedError('Stop not implemented for Cloud Run')

    def resume(self, **kwargs):
        raise NotImplementedError('Resume not implemented for Cloud Run')
