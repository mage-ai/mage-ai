from mage_ai.api.presenters.BasePresenter import BasePresenter


class StatusPresenter(BasePresenter):
    default_attributes = [
        'is_instance_manager',
        'max_print_output_lines',
        'repo_path',
        'scheduler_status',
        'instance_type',
        'disable_pipeline_edit_access',
        'require_user_authentication',
        'project_type',
        'project_uuid',
    ]
