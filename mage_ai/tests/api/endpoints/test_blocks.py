from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_detail_endpoint_tests,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)


def get_pipeline(self):
    return Pipeline.get(self.pipeline.uuid)


class BlockAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_list_endpoint_tests(
    BlockAPIEndpointTest,
    list_count=4,
    resource='block',
    resource_parent='pipelines',
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    result_keys_to_compare=[
        'all_upstream_blocks_executed',
        'color',
        'configuration',
        'downstream_blocks',
        'executor_config',
        'executor_type',
        'has_callback',
        'name',
        'language',
        'retry_config',
        'status',
        'timeout',
        'type',
        'upstream_blocks',
    ],
)


build_create_endpoint_tests(
    BlockAPIEndpointTest,
    assert_after_create_count=lambda self: len(get_pipeline(self).blocks_by_uuid.values()) == 5,
    assert_before_create_count=lambda self: len(get_pipeline(self).blocks_by_uuid.values()) == 4,
    build_payload=lambda self: dict(
        name=self.faker.unique.name(),
        type=BlockType.DATA_LOADER,
    ),
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    resource='block',
    resource_parent='pipelines',
)

build_detail_endpoint_tests(
    BlockAPIEndpointTest,
    resource='block',
    get_resource_id=lambda self: list(get_pipeline(self).blocks_by_uuid.values())[0].uuid,
    resource_parent='pipelines',
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    result_keys_to_compare=[
        'all_upstream_blocks_executed',
        'color',
        'configuration',
        'content',
        'downstream_blocks',
        'executor_config',
        'executor_type',
        'has_callback',
        'language',
        'name',
        'outputs',
        'retry_config',
        'status',
        'timeout',
        'type',
        'upstream_blocks',
        'uuid',
    ],
)


build_update_endpoint_tests(
    BlockAPIEndpointTest,
    resource='block',
    get_resource_id=lambda self: list(get_pipeline(self).blocks_by_uuid.values())[0].uuid,
    build_payload=lambda self: dict(name=self.faker.unique.name()),
    get_model_before_update=lambda self: list(get_pipeline(self).blocks_by_uuid.values())[0],
    assert_after_update=lambda self, result, model: model.name != result['name'],
    resource_parent='pipelines',
    get_resource_parent_id=lambda self: self.pipeline.uuid,
)


build_delete_endpoint_tests(
    BlockAPIEndpointTest,
    assert_after_delete_count=lambda self: len(get_pipeline(self).blocks_by_uuid.values()) == 3,
    assert_before_delete_count=lambda self: len(get_pipeline(self).blocks_by_uuid.values()) == 4,
    get_resource_id=lambda self: list(get_pipeline(self).blocks_by_uuid.values())[3].uuid,
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    resource='block',
    resource_parent='pipelines',
)
