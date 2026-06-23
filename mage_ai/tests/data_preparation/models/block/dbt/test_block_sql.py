import os
from types import SimpleNamespace
from unittest.mock import MagicMock, call, patch

import pandas as pd

from mage_ai.data_preparation.models.block.dbt import DBTBlock
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.orchestration.constants import PIPELINE_RUN_MAGE_VARIABLES_KEY
from mage_ai.tests.base_test import TestCase


def build_project(repo_path: str) -> tuple[str, str]:
    project_path = os.path.join(repo_path, 'dbt', 'test_project')
    model_path = os.path.join(project_path, 'models', 'demo', 'model.sql')

    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    with open(os.path.join(project_path, 'dbt_project.yml'), 'w') as f:
        f.write('name: test_project\nprofile: test_project\n')
    with open(model_path, 'w') as f:
        f.write('select 1 as id')

    return project_path, model_path


def build_pipeline(repo_path: str) -> MagicMock:
    pipeline = MagicMock()
    pipeline.uuid = 'test_pipeline'
    pipeline.repo_path = repo_path
    pipeline.variables = {}
    return pipeline


class DBTBlockSQLTest(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.project_path, cls.model_path = build_project(cls.repo_path)
        cls.pipeline = build_pipeline(cls.repo_path)

    def build_block(self, configuration=None):
        return DBTBlock.create(
            name='test_dbt_block_sql',
            uuid='test_dbt_block_sql',
            block_type=BlockType.DBT,
            language=BlockLanguage.SQL,
            pipeline=self.pipeline,
            configuration={
                'dbt_profile_target': '{{ variables("target") }}',
                'file_path': self.model_path,
                **(configuration or {}),
            },
        )

    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.DBTCli')
    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Profiles')
    def test_execute_block_builds_sql_model_with_runtime_flags(
        self,
        mock_profiles: MagicMock,
        mock_dbt_cli: MagicMock,
    ):
        mock_profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'
        cli = mock_dbt_cli.return_value
        cli.invoke.return_value = SimpleNamespace(success=True, exception=None)

        block = self.build_block()
        block.store_variables = MagicMock()

        result = block._execute_block(
            {},
            global_vars={'target': 'prod'},
            runtime_arguments={
                PIPELINE_RUN_MAGE_VARIABLES_KEY: {
                    'blocks': {
                        'test_dbt_block_sql': {
                            'configuration': {
                                'flags': ['--full-refresh'],
                                'prefix': '+',
                                'suffix': '+',
                            },
                        },
                    },
                },
            },
        )

        expected_args = [
            '--project-dir', self.project_path,
            '--full-refresh',
            '--select', '+model+',
            '--vars', '{"target": "prod"}',
            '--target', 'prod',
            '--profiles-dir', 'test_profiles_dir',
        ]
        self.assertEqual(result, [None])
        self.assertEqual(cli.invoke.mock_calls, [
            call(['deps'] + expected_args),
            call(['build'] + expected_args),
        ])
        block.store_variables.assert_called_once_with(
            {'output_0': None},
            execution_partition=None,
            override_outputs=True,
        )
        mock_profiles.assert_called_once_with(
            self.project_path,
            {
                'target': 'prod',
                PIPELINE_RUN_MAGE_VARIABLES_KEY: {
                    'blocks': {
                        'test_dbt_block_sql': {
                            'configuration': {
                                'flags': ['--full-refresh'],
                                'prefix': '+',
                                'suffix': '+',
                            },
                        },
                    },
                },
            },
        )

    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.DBTCli')
    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Profiles')
    def test_execute_block_preview_runs_show_and_stores_dataframe(
        self,
        mock_profiles: MagicMock,
        mock_dbt_cli: MagicMock,
    ):
        mock_profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'
        preview_df = pd.DataFrame([{'id': 1}])
        cli = mock_dbt_cli.return_value
        cli.invoke.side_effect = [
            SimpleNamespace(success=True, exception=None),
            SimpleNamespace(success=True, exception=None),
        ]
        cli.to_pandas.return_value = preview_df

        block = self.build_block({'limit': 25})
        block.store_variables = MagicMock()

        result = block._execute_block(
            {},
            from_notebook=True,
            global_vars={'target': 'dev'},
            run_settings={},
        )

        expected_args = [
            '--project-dir', self.project_path,
            '--select', 'model',
            '--vars', '{"target": "dev"}',
            '--target', 'dev',
            '--profiles-dir', 'test_profiles_dir',
        ]
        self.assertEqual(cli.invoke.mock_calls, [
            call(['deps'] + expected_args),
            call(['show'] + expected_args + ['--limit', '25']),
        ])
        cli.to_pandas.assert_called_once()
        block.store_variables.assert_called_once_with(
            {'df': preview_df},
            execution_partition=None,
            override_outputs=True,
        )
        self.assertEqual(result, [preview_df])

    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.DBTBlock.materialize_df')
    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.DBTCli')
    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Profiles')
    def test_execute_block_materializes_upstream_source_dataframe(
        self,
        mock_profiles: MagicMock,
        mock_dbt_cli: MagicMock,
        mock_materialize_df: MagicMock,
    ):
        mock_profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'
        mock_dbt_cli.return_value.invoke.return_value = SimpleNamespace(
            success=True,
            exception=None,
        )

        upstream_block = MagicMock()
        upstream_block.uuid = 'source_block'
        upstream_block.type = BlockType.DATA_LOADER
        upstream_block.language = BlockLanguage.PYTHON
        upstream_block.pipeline = self.pipeline

        with open(self.model_path, 'w') as f:
            f.write("{{ source('mage_test_project', 'test_pipeline_source_block') }}")

        block = self.build_block()
        block.upstream_blocks = [upstream_block]
        block.store_variables = MagicMock()

        block._execute_block(
            {'source_block': [{'id': 1}]},
            global_vars={'target': 'prod'},
        )

        mock_materialize_df.assert_called_once()
        _, kwargs = mock_materialize_df.call_args
        self.assertEqual(kwargs['pipeline_uuid'], 'test_pipeline')
        self.assertEqual(kwargs['block_uuid'], 'source_block')
        self.assertEqual(kwargs['targets'], [(self.project_path, 'prod')])
        self.assertEqual(kwargs['df'].to_dict(), {'id': {0: 1}})

    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.DBTCli')
    @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Profiles')
    def test_execute_block_raises_when_dbt_task_fails(
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

        block = self.build_block()
        block.store_variables = MagicMock()

        with self.assertRaisesRegex(Exception, 'dbt failed'):
            block._execute_block({}, global_vars={'target': 'prod'})
