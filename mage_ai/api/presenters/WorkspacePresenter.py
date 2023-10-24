from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.shared.hash import merge_dict


class WorkspacePresenter(BasePresenter):
    default_attributes = [
        'access',
        'cluster_name',
        'cluster_type',
        'container_config',
        'container_name',
        'instance',
        'lifecycle_config',
        'name',
        'namespace',
        'path_to_credentials',
        'project_uuid',
        'project_id',
        'region',
        'repo_path',
        'service_account_name',
        'storage_class_name',
        'storage_access_mode',
        'storage_request_size',
        'success',
        'task_definition',
    ]

    async def present(self, **kwargs):
        workspace = self.model.pop('workspace', None)
        workspace_config = dict()
        if workspace:
            workspace_config = workspace.to_dict()
        data = merge_dict(workspace_config, self.model)

        return data
