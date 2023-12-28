import os
from unittest.mock import patch

from mage_ai.settings.utils import base_repo_path
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
)
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


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
        'repo_path_relative',
        'repo_path_relative_root',
        'repo_path_root',
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
        'repo_path_relative',
        'repo_path_relative_root',
        'repo_path_root',
        'require_user_authentication',
        'require_user_permissions',
        'scheduler_status',
    ],
)


class StatusWithProjectPlatformAPIEndpointTest(BaseAPIEndpointTest, ProjectPlatformMixin):
    def setUp(self):
        with patch('mage_ai.settings.platform.constants.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
                with patch(
                    'mage_ai.settings.repo.project_platform_activated',
                    lambda: True,
                ):
                    super().setUp()
                    self.setup_final()

    def tearDown(self):
        with patch('mage_ai.settings.platform.constants.project_platform_activated', lambda: True):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
                with patch(
                    'mage_ai.settings.repo.project_platform_activated',
                    lambda: True,
                ):
                    self.teardown_final()
                    super().tearDown()


def __assert_after_list(self, result, **kwargs):
    for key, value in [
        ('repo_path', os.path.join(base_repo_path(), 'mage_platform')),
        ('repo_path_relative', 'test/mage_platform'),
        ('repo_path_relative_root', 'test'),
        ('repo_path_root', base_repo_path()),
    ]:
        self.assertEqual(
            result[0][key],
            value,
        )


build_list_endpoint_tests(
    StatusWithProjectPlatformAPIEndpointTest,
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
        'repo_path_relative',
        'repo_path_relative_root',
        'repo_path_root',
        'require_user_authentication',
        'require_user_permissions',
        'scheduler_status',
    ],
    patch_function_settings=[
        ('mage_ai.settings.platform.constants.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.project_platform_activated', lambda: True),
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
    ],
    assert_after=__assert_after_list,
)
