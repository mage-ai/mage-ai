import json
import os
from unittest.mock import patch

from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.settings.utils import base_repo_path
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_detail_endpoint_tests,
    build_list_endpoint_tests,
)
from mage_ai.tests.shared.mixins import CustomDesignMixin, ProjectPlatformMixin

CURRENT_FILE_PATH = os.path.dirname(os.path.realpath(__file__))


class CustomDesignAPIEndpointTest(CustomDesignMixin, BaseAPIEndpointTest):
    pass


def __assert_after_list(self, result, **kwargs):
    with open(os.path.join(CURRENT_FILE_PATH, 'mocks', 'mock_design.json')) as f:
        self.assertEqual(
            result,
            json.loads(f.read()),
        )


def __assert_after_detail(self, result, **kwargs):
    with open(os.path.join(CURRENT_FILE_PATH, 'mocks', 'mock_design.json')) as f:
        self.assertEqual(
            result,
            json.loads(f.read())[0],
        )


def __build_query(test_case):
    return dict(
        operation=test_case.faker.name(),
        page_path=test_case.faker.name(),
        page_pathname=test_case.faker.name(),
        page_query=test_case.faker.name(),
        page_type=test_case.faker.name(),
        page_uuid=test_case.faker.name(),
        resource=test_case.faker.name(),
        resource_id=test_case.faker.name(),
        resource_parent=test_case.faker.name(),
        resource_parent_id=test_case.faker.name(),
    )


build_list_endpoint_tests(
    CustomDesignAPIEndpointTest,
    list_count=1,
    resource='custom_design',
    result_keys_to_compare=[
        'components',
        'pages',
        'project',
        'uuid',
    ],
    assert_after=__assert_after_list,
    build_query=__build_query,
    patch_function_settings=[
        (
            '.'.join([
                'mage_ai',
                'api',
                'resources',
                'CustomDesignResource',
                'Project',
                'is_feature_enabled_in_root_or_active_project',
            ]),
            lambda feature_name: FeatureUUID.CUSTOM_DESIGN == feature_name,
        ),
    ],
)


build_detail_endpoint_tests(
    CustomDesignAPIEndpointTest,
    resource='custom_design',
    get_resource_id=lambda self: 'pipelines',
    result_keys_to_compare=[
        'components',
        'pages',
        'project',
        'uuid',
    ],
    assert_after=__assert_after_detail,
    patch_function_settings=[
        (
            '.'.join([
                'mage_ai',
                'api',
                'resources',
                'CustomDesignResource',
                'Project',
                'is_feature_enabled_in_root_or_active_project',
            ]),
            lambda feature_name: FeatureUUID.CUSTOM_DESIGN == feature_name,
        ),
    ],
)


@patch('mage_ai.presenters.design.models.project_platform_activated', lambda: True)
@patch('mage_ai.settings.platform.utils.project_platform_activated', lambda: True)
@patch('mage_ai.settings.repo.project_platform_activated', lambda: True)
class CustomDesignProjectPlatformAPIEndpointTest(
    CustomDesignMixin,
    ProjectPlatformMixin,
    BaseAPIEndpointTest,
):
    pass


def __assert_after_list2(self, result, **kwargs):
    with open(os.path.join(CURRENT_FILE_PATH, 'mocks', 'mock_design_project_platform.json')) as f:
        arr = json.loads(f.read())
        for item in arr:
            item['project']['full_path'] = os.path.join(
                base_repo_path(),
                item['project']['full_path'],
            )
            item['project']['root_project_full_path'] = base_repo_path()

        self.assertEqual(
            result.sort(key=lambda x: x['uuid']),
            arr.sort(key=lambda x: x['uuid']),
        )


def __assert_after_detail2(self, result, **kwargs):
    with open(os.path.join(CURRENT_FILE_PATH, 'mocks', 'mock_design_project_platform.json')) as f:
        item = json.loads(f.read())[0]
        item['project']['full_path'] = os.path.join(
            base_repo_path(),
            item['project']['full_path'],
        )
        item['project']['root_project_full_path'] = base_repo_path()

        self.assertEqual(
            result,
            item,
        )


build_list_endpoint_tests(
    CustomDesignProjectPlatformAPIEndpointTest,
    list_count=2,
    resource='custom_design',
    result_keys_to_compare=[
        'components',
        'pages',
        'project',
        'uuid',
    ],
    assert_after=__assert_after_list2,
    build_query=__build_query,
    patch_function_settings=[
        (
            '.'.join([
                'mage_ai',
                'api',
                'resources',
                'CustomDesignResource',
                'Project',
                'is_feature_enabled_in_root_or_active_project',
            ]),
            lambda feature_name: FeatureUUID.CUSTOM_DESIGN == feature_name,
        ),
        ('mage_ai.presenters.design.models.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.utils.project_platform_activated', lambda: True),
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
    ],
)


build_detail_endpoint_tests(
    CustomDesignProjectPlatformAPIEndpointTest,
    resource='custom_design',
    get_resource_id=lambda self: 'pipelines',
    result_keys_to_compare=[
        'components',
        'pages',
        'project',
        'uuid',
    ],
    assert_after=__assert_after_detail2,
    patch_function_settings=[
        (
            '.'.join([
                'mage_ai',
                'api',
                'resources',
                'CustomDesignResource',
                'Project',
                'is_feature_enabled_in_root_or_active_project',
            ]),
            lambda feature_name: FeatureUUID.CUSTOM_DESIGN == feature_name,
        ),
        ('mage_ai.presenters.design.models.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.utils.project_platform_activated', lambda: True),
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
    ],
)
