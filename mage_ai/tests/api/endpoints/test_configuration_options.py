from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.settings.models.configuration_option import (
    ConfigurationOption,
    ConfigurationType,
    OptionType,
)
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_list_endpoint_tests,
)


class ConfigurationOptionAPIEndpointTest(BaseAPIEndpointTest):
    pass


def __assert_after_list(self, result, **kwargs):
    self.assertEqual(
        result,
        [
            dict(
                configuration_type=ConfigurationType.DBT,
                metadata=None,
                option=dict(
                    mage=1,
                    pipeline_uuid=self.pipeline.uuid,
                ),
                option_type=OptionType.PROJECTS,
                resource_type=EntityName.Block,
                uuid='mage',
            ),
        ],
    )


async def __fetch(
    configuration_type,
    option_type,
    pipeline,
    resource_type,
    resource_uuid,
):
    return [
        ConfigurationOption.load(
            configuration_type=configuration_type,
            name='mage',
            option=dict(
                mage=1,
                pipeline_uuid=pipeline.uuid,
            ),
            option_type=option_type,
            resource_type=resource_type,
            uuid='mage',
        ),
    ]


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
    patch_function_settings=[
        ('mage_ai.api.resources.ConfigurationOptionResource.ConfigurationOption.fetch', __fetch),
    ],
    assert_after=__assert_after_list,
    build_query=__build_query,
)
