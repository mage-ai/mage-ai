from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
)


class StatusAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_list_endpoint_tests(
    StatusAPIEndpointTest,
    list_count=1,
    resource='status',
    result_keys_to_compare=[
        'disable_pipeline_edit_access',
        'instance_type',
        'is_instance_manager',
        'max_print_output_lines',
        'project_type',
        'project_uuid',
        'repo_path',
        'require_user_authentication',
        'require_user_permissions',
        'scheduler_status',
    ],
)


build_list_endpoint_tests(
    StatusAPIEndpointTest,
    test_uuid='with_meta_format_with_activity_details',
    build_meta=lambda _self: dict(_format='with_activity_details'),
    list_count=1,
    resource='status',
    result_keys_to_compare=[
        'active_pipeline_run_count',
        'disable_pipeline_edit_access',
        'instance_type',
        'is_instance_manager',
        'last_scheduler_activity',
        'last_user_request',
        'max_print_output_lines',
        'project_type',
        'project_uuid',
        'repo_path',
        'require_user_authentication',
        'require_user_permissions',
        'scheduler_status',
    ],
)
