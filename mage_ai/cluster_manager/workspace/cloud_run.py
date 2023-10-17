import os
from typing import Dict

from mage_ai.cluster_manager.constants import GCP_PROJECT_ID
from mage_ai.cluster_manager.workspace.base import Workspace


class CloudRunWorkspace(Workspace):
    def initialize(self, payload: Dict, project_uuid: str):
        from mage_ai.cluster_manager.gcp.cloud_run_service_manager import (
            CloudRunServiceManager,
        )

        project_id = payload.get('project_id', os.getenv(GCP_PROJECT_ID))
        path_to_credentials = payload.get(
            'path_to_credentials', os.getenv('path_to_keyfile')
        )
        region = payload.get('region', os.getenv('GCP_REGION'))

        cloud_run_service_manager = CloudRunServiceManager(
            project_id, path_to_credentials, region=region
        )

        cloud_run_service_manager.create_service(self.name)

    def delete(self, **kwargs):
        raise NotImplementedError('Delete not implemented for Cloud Run')

    def update(self, **kwargs):
        raise NotImplementedError('Update not implemented for Cloud Run')
