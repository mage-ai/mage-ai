import os
from unittest.mock import MagicMock

from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.block.dbt.block_sql import DBTBlockSQL
from mage_ai.data_preparation.models.block.dbt.block_yaml import DBTBlockYAML
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.tests.base_test import AsyncDBTestCase


class DBTBlockTest(AsyncDBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()

        pipeline = MagicMock()
        pipeline.uuid = 'test'
        pipeline.repo_path = self.repo_path

        project_path = os.path.join(self.repo_path, 'dbt', 'dir1', 'dir2', 'dir3', 'fire')

        for filename in [
            'profiles.yml',
            'dbt_project.yml',
            os.path.join('models', 'demo', 'model.sql')
        ]:
            fp = os.path.join(project_path, filename)
            os.makedirs(os.path.dirname(fp), exist_ok=True)
            with open(fp, 'w') as f:
                f.write('')

        os.makedirs(os.path.join(self.repo_path, 'dbts'), exist_ok=True)

        self.block_sql = MagicMock()
        self.block_sql.name = 'test_block_sql'
        self.block_sql.uuid = 'test_block_sql'
        self.block_sql.block_type = BlockType.DATA_LOADER
        self.block_sql.language = BlockLanguage.SQL
        self.block_sql.pipeline = pipeline

        self.dbt_block_sql = DBTBlock.create(
            name='test_dbt_block_sql',
            uuid='test_dbt_block_sql',
            block_type=BlockType.DBT,
            language=BlockLanguage.SQL,
            configuration={
                'file_path': os.path.join(project_path, 'models', 'demo', 'model.sql'),
                'dbt': {'disable_tests': True}
            },
            pipeline=pipeline,
        )

        self.dbt_block_yaml = DBTBlock.create(
            name='test_dbt_block_yaml',
            uuid='test_dbt_block_yaml',
            block_type=BlockType.DBT,
            language=BlockLanguage.YAML,
            pipeline=pipeline,
            configuration={},
        )

        self.dbt_block_yaml.upstream_blocks = [self.block_sql]
        self.dbt_block_sql.upstream_blocks = [
            self.block_sql,
            self.dbt_block_yaml
        ]
        self.block_sql.downstream_blocks = [
            self.dbt_block_sql,
            self.dbt_block_yaml
        ]

    @classmethod
    def tearDownClass(self):
        super().tearDownClass()

    def test_new_sql_block(self):
        self.assertTrue(isinstance(self.dbt_block_sql, DBTBlock))
        self.assertTrue(isinstance(self.dbt_block_sql, DBTBlockSQL))
        self.assertFalse(isinstance(self.dbt_block_sql, DBTBlockYAML))

    def test_new_yaml_block(self):
        self.assertTrue(isinstance(self.dbt_block_yaml, DBTBlock))
        self.assertFalse(isinstance(self.dbt_block_yaml, DBTBlockSQL))
        self.assertTrue(isinstance(self.dbt_block_yaml, DBTBlockYAML))

    def test_paths(self):
        self.assertEqual(
            self.dbt_block_sql.project_path,
            os.path.join(self.repo_path, 'dbt/dir1/dir2/dir3/fire'),
        )
        self.assertEqual(
            self.dbt_block_sql.file_path,
            os.path.join(self.repo_path, 'dbt/dir1/dir2/dir3/fire/models/demo/model.sql'),
        )

        self.dbt_block_yaml.configuration = dict(
            dbt_profiles_file_path='dbt/dir1/dir2/dir3/fire/models/demo',
        )
        self.assertEqual(
            self.dbt_block_yaml.project_path,
            os.path.join(self.repo_path, 'dbt/dir1/dir2/dir3/fire'),
        )
        self.dbt_block_yaml.configuration = dict(
            dbt_project_name='dbt/dir1/dir2/dir3/fire/models',
        )
        self.assertEqual(
            self.dbt_block_yaml.project_path,
            os.path.join(self.repo_path, 'dbt/dir1/dir2/dir3/fire'),
        )

    def test_dbt_configuration(self):
        self.assertEqual(self.dbt_block_sql._dbt_configuration, {'disable_tests': True})
        self.assertEqual(self.dbt_block_yaml._dbt_configuration, {})

    # def test_variables_json(self):
    #     self.assertEqual(
    #         self.dbt_block_sql._variables_json({
    #             'key1': 1,
    #             'key2': 'foo',
    #             'key3': ['bar']
    #         }),
    #         '{"key1": 1, "key2": "foo", "key3": ["bar"]}'
    #     )

    # @patch('mage_ai.data_preparation.models.block.dbt.block.Profiles')
    # @patch('mage_ai.data_preparation.models.block.dbt.block.Project')
    # @patch('mage_ai.data_preparation.models.block.dbt.block.Sources')
    # @patch('mage_ai.data_preparation.models.block.dbt.block.DBTAdapter')
    # def test_update_sources(self, DBTAdapter, Sources, Project, Profiles):
    #     DBTAdapter.return_value.__enter__.return_value.credentials.schema = 'public'
    #     DBTAdapter.return_value.__enter__.return_value.credentials.database = None
    #     Sources.return_value.reset_pipeline = MagicMock()

    #     DBTBlock.update_sources({
    #         'test_block_sql': self.block_sql,
    #         'test_dbt_block_sql': self.dbt_block_sql,
    #         'test_dbt_block_yaml': self.dbt_block_yaml
    #     })

    #     Sources.return_value.reset_pipeline.assert_called_once_with(
    #         project_name='test_project_name',
    #         pipeline_uuid='test',
    #         block_uuids=['test_block_sql'],
    #         schema='public'
    #     )
