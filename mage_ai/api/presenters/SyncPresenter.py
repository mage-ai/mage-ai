from mage_ai.api.presenters.BasePresenter import BasePresenter


class SyncPresenter(BasePresenter):
    default_attributes = [
        'branch',
        'remote_repo_link',
        'repo_path',
        'sync_on_pipeline_run',
        'type',
    ]
