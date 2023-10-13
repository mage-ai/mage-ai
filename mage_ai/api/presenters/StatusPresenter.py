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
        'require_user_permissions',
        'project_type',
        'project_uuid',
    ]


StatusPresenter.register_format(
    'with_activity_details',
    StatusPresenter.default_attributes + [
        'active_pipeline_run_count',
        'last_scheduler_activity',
        'last_user_request',
    ],
)
