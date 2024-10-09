import json
import os

from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_detail_endpoint_tests,
    build_list_endpoint_tests,
)
from mage_ai.tests.shared.mixins import CustomDesignMixin

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
            lambda feature_name, user=None, **kwargs: FeatureUUID.CUSTOM_DESIGN == feature_name,
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
            lambda feature_name, user=None, **kwargs: FeatureUUID.CUSTOM_DESIGN == feature_name,
        ),
    ],
)
