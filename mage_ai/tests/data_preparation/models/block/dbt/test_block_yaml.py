import asyncio
from pathlib import Path
from unittest.mock import MagicMock, patch

from mage_ai.data_preparation.models.block.dbt.block import DBTBlock
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.tests.base_test import TestCase


class DBTBlockYAMLTest(TestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()

        pipeline = MagicMock()
        pipeline.uuid = 'test'
        pipeline.repo_path = 'test_repo_path'

        self.dbt_block = DBTBlock(
            name='test_dbt_block_yaml',
            uuid='test_dbt_block_yaml',
            block_type=BlockType.DBT,
            language=BlockLanguage.YAML,
            pipeline=pipeline,
            configuration={
                'dbt_project_name': 'test_project_name',
                'dbt_profile_target': 'dev',
                'dbt': {'command': 'build'}
            },
            content='--select model+ --exclude model --vars \'{"foo":"bar"}\''
        )

    @classmethod
    def tearDownClass(self):
        super().tearDownClass()

    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Profiles')
    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Project')
    def test_metadata_async(self, Project, Profiles):
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
                    'block': {},
                    'project': None,
                    'projects': {
                        'test_project_name': {
                            'project_name': 'test_project_name',
                            'target': 'test',
                            'targets': ['dev', 'prod', 'test']
                        }
                    }
                }
            }
        )

    def test_tags(self):
        self.assertEqual(
            self.dbt_block.tags(),
            ['build']
        )

    def test_project_path(self):
        self.assertEqual(
            self.dbt_block.project_path,
            str(Path('test_repo_path/dbt/test_project_name'))
        )

    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.DBTCli')
    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Profiles')
    def test_execute_block(self, Profiles, DBTCli: MagicMock):
        DBTCli.return_value.invoke.return_value = (None, True)
        Profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'

        self.dbt_block._execute_block(
            {},
            runtime_arguments={
                '__mage_variables': {
                    'blocks': {
                        'test_dbt_block_yaml': {
                            'configuration': {
                                'flags': ['--full-refresh']
                            }
                        }
                    }
                }
            },
            global_vars={}
        )

        DBTCli.assert_called_once_with([
            'build',
            '--select', 'model+',
            '--exclude', 'model',
            '--vars', '{"foo": "bar"}',
            '--project-dir', str(Path('test_repo_path/dbt/test_project_name')),
            '--full-refresh',
            '--target', 'dev',
            '--profiles-dir', 'test_profiles_dir'
        ], None)
