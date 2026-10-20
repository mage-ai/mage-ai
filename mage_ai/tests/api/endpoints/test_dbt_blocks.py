import os

from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.settings.repo import get_repo_path
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
)
from mage_ai.tests.shared.mixins import DBTMixin


def get_pipeline(self):
    return Pipeline.get(self.pipeline.uuid, repo_path=get_repo_path())


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
