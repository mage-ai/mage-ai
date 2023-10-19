from mage_ai.api.presenters.BasePresenter import BasePresenter


class WorkspacePresenter(BasePresenter):
    default_attributes = [
        'access',
        'cluster_type',
        'instance',
        'lifecycle_config',
        'name',
        'project_uuid',
        'repo_path',
        'success',
    ]
