import json
import os
from unittest.mock import patch

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.settings.models.configuration_option import ConfigurationType, OptionType
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
)
from mage_ai.tests.shared.mixins import DBTMixin, ProjectPlatformMixin

CURRENT_FILE_PATH = os.path.dirname(os.path.realpath(__file__))


class ConfigurationOptionAPIEndpointTest(DBTMixin, BaseAPIEndpointTest):
    pass


def __assert_after_list(self, result, **kwargs):
    with open(os.path.join(CURRENT_FILE_PATH, 'mocks', 'mock_dbt_configuration_options.json')) as f:
        self.assertEqual(
            result,
            json.loads(f.read()),
        )


def __build_query(test_case):
    return dict(
        configuration_type=[ConfigurationType.DBT],
        option_type=[OptionType.PROJECTS],
        resource_type=[EntityName.Block],
        resource_uuid=[test_case.blocks[0].uuid],
    )


build_list_endpoint_tests(
    ConfigurationOptionAPIEndpointTest,
    list_count=1,
    get_resource_parent_id=lambda test_case: test_case.pipeline.uuid,
    resource='configuration_option',
    resource_parent='pipeline',
    result_keys_to_compare=[
        'configuration_type',
        'metadata',
        'option',
        'option_type',
        'resource_type',
        'uuid',
    ],
    assert_after=__assert_after_list,
    build_query=__build_query,
)


@patch('mage_ai.settings.platform.utils.project_platform_activated', lambda: True)
@patch('mage_ai.settings.repo.project_platform_activated', lambda: True)
class ConfigurationOptionProjectPlatformAPIEndpointTest(
    DBTMixin,
    ProjectPlatformMixin,
    BaseAPIEndpointTest,
):
    pass


def __assert_after_list2(self, result, **kwargs):
    with open(os.path.join(
        CURRENT_FILE_PATH,
        'mocks',
        'mock_dbt_configuration_options_project_platform.json',
    )) as f:
        self.assertEqual(
            result,
            json.loads(f.read()),
        )


build_list_endpoint_tests(
    ConfigurationOptionProjectPlatformAPIEndpointTest,
    list_count=1,
    get_resource_parent_id=lambda test_case: test_case.pipeline.uuid,
    resource='configuration_option',
    resource_parent='pipeline',
    result_keys_to_compare=[
        'configuration_type',
        'metadata',
        'option',
        'option_type',
        'resource_type',
        'uuid',
    ],
    assert_after=__assert_after_list2,
    build_query=__build_query,
    patch_function_settings=[
        ('mage_ai.settings.models.configuration_option.project_platform_activated', lambda: True),
        ('mage_ai.settings.platform.utils.project_platform_activated', lambda: True),
        ('mage_ai.settings.repo.project_platform_activated', lambda: True),
    ],
)
