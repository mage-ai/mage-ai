from mage_ai.api.presenters.BasePresenter import BasePresenter


class WorkspacePresenter(BasePresenter):
    default_attributes = [
        'name',
        'instance',
        'cluster_type',
        'access',
        'repo_path',
        'project_uuid',
    ]
