from mage_ai.api.presenters.BasePresenter import BasePresenter


class SyncPresenter(BasePresenter):
    default_attributes = [
        'type',
        'remote_repo_link',
        'repo_path',
        'branch',
        'sync_on_pipeline_run',
    ]
