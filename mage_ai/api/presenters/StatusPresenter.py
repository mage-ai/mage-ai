from mage_ai.api.presenters.BasePresenter import BasePresenter


class StatusPresenter(BasePresenter):
    default_attributes = [
        'is_instance_manager',
        'repo_path',
        'scheduler_status',
        'instance_type',
        'disable_pipeline_edit_access',
        'require_user_authentication',
    ]
