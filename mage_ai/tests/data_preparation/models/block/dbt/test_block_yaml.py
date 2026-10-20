import os
from types import SimpleNamespace
from unittest.mock import MagicMock, call, patch

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.orchestration.constants import PIPELINE_RUN_MAGE_VARIABLES_KEY
from mage_ai.tests.base_test import TestCase


def build_project(repo_path: str) -> str:
    project_path = os.path.join(repo_path, 'dbt', 'test_project')
    os.makedirs(project_path, exist_ok=True)
    with open(os.path.join(project_path, 'dbt_project.yml'), 'w') as f:
        f.write('name: test_project\nprofile: test_project\n')
    return project_path


def build_pipeline(repo_path: str) -> MagicMock:
    pipeline = MagicMock()
    pipeline.uuid = 'test_pipeline'
    pipeline.repo_path = repo_path
    pipeline.variables = {}
    return pipeline


class DBTBlockYAMLTest(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.project_path = build_project(cls.repo_path)
        cls.pipeline = build_pipeline(cls.repo_path)

    def build_block(self, content: str, configuration=None):
        return DBTBlock.create(
            name='test_dbt_block_yaml',
            uuid='test_dbt_block_yaml',
            block_type=BlockType.DBT,
            language=BlockLanguage.YAML,
            pipeline=self.pipeline,
            configuration={
                'dbt_project_name': 'dbt/test_project',
                'dbt_profile_target': '{{ variables("target") }}',
                'dbt': {'command': 'build'},
                **(configuration or {}),
            },
            content=content,
        )

    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.DBTCli')
    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Profiles')
    def test_execute_block_merges_content_vars_runtime_flags_and_target(
        self,
        mock_profiles: MagicMock,
        mock_dbt_cli: MagicMock,
    ):
        mock_profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'
        cli = mock_dbt_cli.return_value
        cli.invoke.return_value = SimpleNamespace(success=True, exception=None)

        block = self.build_block(
            '--select model+ --exclude stale_model --vars \'{"manual": "override"}\'',
        )

        block._execute_block(
            {},
            global_vars={
                'manual': 'base',
                'target': 'prod',
            },
            runtime_arguments={
                PIPELINE_RUN_MAGE_VARIABLES_KEY: {
                    'blocks': {
                        'test_dbt_block_yaml': {
                            'configuration': {
                                'flags': ['--full-refresh', '--fail-fast'],
                            },
                        },
                    },
                },
            },
        )

        expected_args = [
            '--select', 'model+',
            '--exclude', 'stale_model',
            '--vars', '{"manual": "override", "target": "prod"}',
            '--project-dir', self.project_path,
            '--full-refresh', '--fail-fast',
            '--target', 'prod',
            '--profiles-dir', 'test_profiles_dir',
        ]
        self.assertEqual(cli.invoke.mock_calls, [
            call(['deps'] + expected_args),
            call(['build'] + expected_args),
        ])

    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.DBTCli')
    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Profiles')
    def test_execute_block_adds_vars_when_content_omits_vars(
        self,
        mock_profiles: MagicMock,
        mock_dbt_cli: MagicMock,
    ):
        mock_profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'
        cli = mock_dbt_cli.return_value
        cli.invoke.return_value = SimpleNamespace(success=True, exception=None)

        block = self.build_block(
            '--select model',
            configuration={'dbt': {'command': 'run'}},
        )

        block._execute_block(
            {},
            global_vars={'target': 'dev', 'date': '2026-06-23'},
        )

        expected_args = [
            '--select', 'model',
            '--project-dir', self.project_path,
            '--vars', '{"target": "dev", "date": "2026-06-23"}',
            '--target', 'dev',
            '--profiles-dir', 'test_profiles_dir',
        ]
        self.assertEqual(cli.invoke.mock_calls, [
            call(['deps'] + expected_args),
            call(['run'] + expected_args),
        ])

    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.DBTCli')
    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Profiles')
    def test_execute_block_interpolates_content_from_variables_and_upstream_outputs(
        self,
        mock_profiles: MagicMock,
        mock_dbt_cli: MagicMock,
    ):
        mock_profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'
        cli = mock_dbt_cli.return_value
        cli.invoke.return_value = SimpleNamespace(success=True, exception=None)

        block = self.build_block(
            ' '.join([
                '--select',
                '"{{ variables(\'model_name\') }}"',
                '--vars',
                (
                    '\'{"from_output": '
                    '"{{ block_output('
                    '\'source_block\', '
                    'parse=lambda arr, _variables: arr[0][\'id\']'
                    ') }}"}\''
                ),
            ]),
        )
        block.upstream_blocks = [
            Block('source_block', 'source_block', BlockType.DATA_LOADER),
        ]

        block._execute_block(
            {'source_block': [{'id': 7}]},
            global_vars={'target': 'dev', 'model_name': 'model_from_var'},
        )

        expected_args = [
            '--select', 'model_from_var',
            '--vars', '{"target": "dev", "model_name": "model_from_var", "from_output": "7"}',
            '--project-dir', self.project_path,
            '--target', 'dev',
            '--profiles-dir', 'test_profiles_dir',
        ]
        self.assertEqual(cli.invoke.mock_calls, [
            call(['deps'] + expected_args),
            call(['build'] + expected_args),
        ])

    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.DBTCli')
    @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Profiles')
    def test_execute_block_raises_when_dbt_command_fails(
        self,
        mock_profiles: MagicMock,
        mock_dbt_cli: MagicMock,
    ):
        mock_profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'
        cli = mock_dbt_cli.return_value
        cli.invoke.side_effect = [
            SimpleNamespace(success=True, exception=None),
            SimpleNamespace(success=False, exception=RuntimeError('dbt failed')),
        ]

        block = self.build_block('--select model')

        with self.assertRaisesRegex(Exception, 'dbt failed'):
            block._execute_block({}, global_vars={'target': 'dev'})
