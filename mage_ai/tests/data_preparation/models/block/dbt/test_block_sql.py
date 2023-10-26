import asyncio
from pathlib import Path
from unittest.mock import MagicMock, patch

from mage_ai.data_preparation.models.block.dbt.block import DBTBlock
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.tests.base_test import TestCase


class DBTBlockSQLTest(TestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()

        pipeline = MagicMock()
        pipeline.uuid = 'test'
        pipeline.repo_path = 'test_repo_path'
        pipeline.get_block.return_value = None

        self.dbt_block = DBTBlock(
            name='test_dbt_block_sql',
            uuid='test_dbt_block_sql',
            block_type=BlockType.DBT,
            language=BlockLanguage.SQL,
            pipeline=pipeline,
            configuration={
                'dbt_profile_target': 'test',
                'file_path': str(Path('test_project_name/test_models/model.sql')),
                'dbt': {
                    'command': 'build',
                    'disable_tests': True
                }
            }
        )

    @classmethod
    def tearDownClass(self):
        super().tearDownClass()

    def test_file_path(self):
        self.assertEqual(
            self.dbt_block.file_path,
            str(Path('test_repo_path/dbt/test_project_name/test_models/model.sql'))
        )

    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Profiles')
    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Project')
    def test_metadata_async(self, Project: MagicMock, Profiles: MagicMock):
        Project.return_value.local_packages = ['test_project_name']
        Project.return_value.project = {
            'name': 'test_project_name',
            'profile': 'test_project_name'
        }
        Profiles.return_value.profiles = {
            'test_project_name': {
                'target': 'test',
                'outputs': {
                    'test': None,
                    'dev': None,
                    'prod': None
                }
            }
        }

        metadata = asyncio.run(self.dbt_block.metadata_async())

        self.assertEqual(
            metadata,
            {
                'dbt': {
                    'block': {'snapshot': False},
                    'project': 'test_project_name',
                    'projects': {
                        'test_project_name': {
                            'target': 'test',
                            'targets': ['dev', 'prod', 'test']
                        }
                    }
                }
            }
        )

    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Project')
    def test_tags(self, Project: MagicMock):
        Project.return_value.project = {
            'model-paths': ['models', 'test_models']
        }
        self.assertEqual(
            self.dbt_block.tags(),
            []
        )

    def test_project_path(self):
        self.assertEqual(
            self.dbt_block.project_path,
            str(Path('test_repo_path/dbt/test_project_name'))
        )

    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.DBTCli')
    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Project')
    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Profiles')
    def test_execute_block(
        self,
        Profiles: MagicMock,
        Project: MagicMock,
        DBTCli: MagicMock
    ):
        DBTCli.return_value.invoke.return_value = (None, True)
        Profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'
        Project.return_value.project = {
            'model-paths': ['models', 'test_models']
        }

        self.dbt_block._execute_block(
            {},
            from_notebook=False,
            runtime_arguments={
                '__mage_variables': {
                    'blocks': {
                        'test_dbt_block_sql': {
                            'configuration': {
                                'flags': ['--full-refresh'],
                                'suffix': '+'
                            }
                        }
                    }
                }
            },
            global_vars={}
        )

        DBTCli.assert_called_once_with([
            'run',
            '--project-dir', str(Path('test_repo_path/dbt/test_project_name')),
            '--full-refresh',
            '--select', 'model+',
            '--vars', '{}',
            '--target', 'test',
            '--profiles-dir', 'test_profiles_dir'
        ], None)

    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Project')
    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Path.open')
    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Path.exists')
    def test_content_compiled(self, exists: MagicMock, open: MagicMock, Project: MagicMock):
        Project.return_value.project = {
            'model-paths': ['models', 'test_models']
        }
        open.return_value.__enter__.return_value.read.return_value = 'SELECT * FROM test'
        exists.return_value = True

        self.assertEqual(
            self.dbt_block.content_compiled,
            'SELECT * FROM test'
        )

    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.DBTCli')
    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Profiles')
    def test_upstream_dbt_blocks(
        self,
        Profiles: MagicMock,
        DBTCli: MagicMock,
    ):
        Profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'
        DBTCli.return_value.invoke.return_value = (
            [
                '{"unique_id":"test1", "original_file_path":"test1_file_path.sql", ' +
                '"depends_on": {"nodes":[]}}',
                '{"unique_id":"test2", "original_file_path":"test2_file_path.sql", ' +
                '"depends_on": {"nodes":["test1"]}}'
            ],
            True
        )

        blocks = [block.to_dict() for block in self.dbt_block.upstream_dbt_blocks()].__iter__()

        DBTCli.assert_called_once_with([
            'list',
            '--project-dir', str(Path('test_repo_path/dbt/test_project_name')),
            '--profiles-dir', 'test_profiles_dir',
            '--select', '+model',
            '--output', 'json',
            '--output-keys', 'unique_id original_file_path depends_on',
            '--resource-type', 'model',
            '--resource-type', 'snapshot',
        ])

        block = next(blocks)
        self.assertDictContainsSubset(
            {
                'configuration': {
                    'file_path': str(Path('test_project_name/test1_file_path.sql'))
                },
                'downstream_blocks': [str(Path('test_project_name/test2_file_path'))],
                'name': str(Path('test_project_name/test1_file_path')),
                'language': 'sql',
                'type': 'dbt',
                'upstream_blocks': [],
                'uuid': str(Path('test_project_name/test1_file_path'))
            },
            block
        )

        block = next(blocks)
        self.assertDictContainsSubset(
            {
                'configuration': {
                    'file_path': str(Path('test_project_name/test2_file_path.sql'))
                },
                'downstream_blocks': [],
                'name': str(Path('test_project_name/test2_file_path')),
                'language': 'sql',
                'type': 'dbt',
                'upstream_blocks': [str(Path('test_project_name/test1_file_path'))],
                'uuid': str(Path('test_project_name/test2_file_path'))
            },
            block
        )
