import os

from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_detail_endpoint_tests,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)
from mage_ai.tests.shared.mixins import DBTMixin


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


class DBTBlockAPIEndpointTest(BaseAPIEndpointTest, DBTMixin):
    pass


def __assert_after_create(self):
    pipeline = get_pipeline(self)
    blocks = pipeline.blocks_by_uuid.values()
    blocks_dbt = list(filter(
        lambda x: x.type == BlockType.DBT and x.language == BlockLanguage.SQL,
        blocks,
    ))

    self.assertEqual(len(blocks), 5)
    self.assertEqual(len(blocks_dbt), 1)

    block = blocks_dbt[0]
    self.assertEqual({
      'dbt_project_name': 'dbt/test_project',
      'file_path': 'dbt/test_project/models/example/my_first_dbt_model.sql',
      'file_source': {
        'path': 'dbt/test_project/models/example/my_first_dbt_model.sql',
        'project_path': 'dbt/test_project',
      },
    }, block.configuration)

    return True


def __assert_after_create_yaml(self):
    pipeline = get_pipeline(self)
    blocks = pipeline.blocks_by_uuid.values()
    blocks_dbt = list(filter(
        lambda x: x.type == BlockType.DBT and x.language == BlockLanguage.YAML,
        blocks,
    ))

    self.assertEqual(len(blocks), 5)
    self.assertEqual(len(blocks_dbt), 1)

    block = blocks_dbt[0]
    self.assertEqual({
      'dbt_project_name': 'dbt/test_project',
      'file_source': {
        'path': 'dbts/dbt_yaml.yaml',
        'project_path': 'dbt/test_project',
      },
    }, block.configuration)

    return True


build_create_endpoint_tests(
    DBTBlockAPIEndpointTest,
    assert_after_create_count=__assert_after_create,
    assert_before_create_count=lambda self: len(get_pipeline(self).blocks_by_uuid.values()) == 4,
    build_payload=lambda self: dict(
        name=self.faker.unique.name(),
        type=BlockType.DBT,
        language=BlockLanguage.SQL,
        configuration=dict(
            file_path=os.path.join(
                os.path.basename(self.dbt_directory),
                'test_project',
                'models',
                'example',
                'my_first_dbt_model.sql',
            ),
        ),
    ),
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    resource='block',
    resource_parent='pipelines',
)


build_create_endpoint_tests(
    DBTBlockAPIEndpointTest,
    test_uuid='dbt_yaml',
    assert_after_create_count=__assert_after_create_yaml,
    assert_before_create_count=lambda self: len(get_pipeline(self).blocks_by_uuid.values()) == 4,
    build_payload=lambda self: dict(
        name='dbt_yaml',
        type=BlockType.DBT,
        language=BlockLanguage.YAML,
        configuration=dict(
            dbt_project_name=os.path.join(
                os.path.basename(self.dbt_directory),
                'test_project',
            ),
        ),
    ),
    get_resource_parent_id=lambda self: self.pipeline.uuid,
    resource='block',
    resource_parent='pipelines',
)
