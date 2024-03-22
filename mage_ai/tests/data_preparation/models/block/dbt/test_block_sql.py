# import asyncio
# import json
# import os
# from pathlib import Path
# from unittest.mock import MagicMock, call, patch

# from dbt.cli.main import dbtRunnerResult

# from mage_ai.data_preparation.models.block.dbt.block import DBTBlock
# from mage_ai.data_preparation.models.block.dbt.block_sql import DBTBlockSQL
# from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
# from mage_ai.settings.utils import base_repo_path
# from mage_ai.tests.base_test import TestCase
# from mage_ai.tests.data_preparation.models.block.platform.test_mixins import (
#     BlockWithProjectPlatformShared,
# )
# from mage_ai.tests.shared.mixins import ProjectPlatformMixin


# def build_block():
#     pipeline = MagicMock()
#     pipeline.uuid = 'test'
#     pipeline.repo_path = 'test_repo_path'
#     pipeline.get_block.return_value = None

#     return DBTBlock.create(
#         name='test_dbt_block_sql',
#         uuid='test_dbt_block_sql',
#         block_type=BlockType.DBT,
#         language=BlockLanguage.SQL,
#         pipeline=pipeline,
#         configuration={
#             'dbt_profile_target': 'test',
#             'file_path': str(Path('test_project_name/test_models/model.sql')),
#             'dbt': {
#                 'command': 'build',
#                 'disable_tests': True
#             }
#         }
#     )


# class DBTBlockSQLTest(TestCase):
#     @classmethod
#     def setUpClass(self):
#         super().setUpClass()
#         self.dbt_block = build_block()

#     @classmethod
#     def tearDownClass(self):
#         super().tearDownClass()

#     def test_file_path(self):
#         self.assertEqual(
#             self.dbt_block.file_path,
#             str(Path('test_repo_path/dbt/test_project_name/test_models/model.sql'))
#         )

#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Profiles')
#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Project')
#     def test_metadata_async(self, Project: MagicMock, Profiles: MagicMock):
#         Project.return_value.local_packages = ['test_project_name']
#         Project.return_value.project = {
#             'name': 'test_project_name',
#             'profile': 'test_project_name'
#         }
#         Profiles.return_value.profiles = {
#             'test_project_name': {
#                 'target': 'test',
#                 'outputs': {
#                     'test': None,
#                     'dev': None,
#                     'prod': None
#                 }
#             }
#         }

#         metadata = asyncio.run(self.dbt_block.metadata_async())

#         self.assertEqual(
#             metadata,
#             {
#                 'dbt': {
#                     'block': {'snapshot': False},
#                     'project': 'test_project_name',
#                     'projects': {
#                         'test_project_name': {
#                             'target': 'test',
#                             'targets': ['dev', 'prod', 'test']
#                         }
#                     }
#                 }
#             }
#         )

#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Project')
#     def test_tags(self, Project: MagicMock):
#         Project.return_value.project = {
#             'model-paths': ['models', 'test_models']
#         }
#         self.assertEqual(
#             self.dbt_block.tags(),
#             []
#         )

#     def test_project_path(self):
#         self.assertEqual(
#             self.dbt_block.project_path,
#             str(Path('test_repo_path/dbt/test_project_name'))
#         )

#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.DBTCli.invoke')
#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Project')
#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Profiles')
#     def test_execute_block(
#         self,
#         Profiles: MagicMock,
#         Project: MagicMock,
#         mock_invoke: MagicMock,
#     ):
#         mock_invoke.return_value = dbtRunnerResult(True)
#         Profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'
#         Project.return_value.project = {
#             'model-paths': ['models', 'test_models']
#         }

#         self.dbt_block._execute_block(
#             {},
#             from_notebook=False,
#             runtime_arguments={
#                 '__mage_variables': {
#                     'blocks': {
#                         'test_dbt_block_sql': {
#                             'configuration': {
#                                 'flags': ['--full-refresh'],
#                                 'suffix': '+'
#                             }
#                         }
#                     }
#                 }
#             },
#             global_vars={}
#         )

#         self.assertEqual(mock_invoke.mock_calls[0], call([
#             'deps',
#             '--project-dir', str(Path('test_repo_path/dbt/test_project_name')),
#             '--full-refresh',
#             '--select', 'model+',
#             '--vars', '{}',
#             '--target', 'test',
#             '--profiles-dir', 'test_profiles_dir'
#         ]))
#         self.assertEqual(mock_invoke.mock_calls[1], call([
#             'run',
#             '--project-dir', str(Path('test_repo_path/dbt/test_project_name')),
#             '--full-refresh',
#             '--select', 'model+',
#             '--vars', '{}',
#             '--target', 'test',
#             '--profiles-dir', 'test_profiles_dir'
#         ]))

#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Project')
#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Path.open')
#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Path.exists')
#     def test_content_compiled(self, exists: MagicMock, open: MagicMock, Project: MagicMock):
#         Project.return_value.project = {
#             'model-paths': ['models', 'test_models']
#         }
#         open.return_value.__enter__.return_value.read.return_value = 'SELECT * FROM test'
#         exists.return_value = True

#         self.assertEqual(
#             self.dbt_block.content_compiled,
#             'SELECT * FROM test'
#         )

#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.DBTCli.invoke')
#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Profiles')
#     def test_upstream_dbt_blocks(
#         self,
#         Profiles: MagicMock,
#         mock_invoke: MagicMock,
#     ):
#         Profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'
#         mock_invoke.return_value = dbtRunnerResult(
#             success=True,
#             exception=None,
#             result=[
#                 '{"unique_id":"test1", "original_file_path":"test1_file_path.sql", ' +
#                 '"depends_on": {"nodes":[]}}',
#                 '{"unique_id":"test2", "original_file_path":"test2_file_path.sql", ' +
#                 '"depends_on": {"nodes":["test1"]}}'
#             ],
#         )

#         blocks = [block.to_dict() for block in self.dbt_block.upstream_dbt_blocks()].__iter__()

#         mock_invoke.assert_called_once_with([
#             'list',
#             '--project-dir', str(Path('test_repo_path/dbt/test_project_name')),
#             '--profiles-dir', 'test_profiles_dir',
#             '--select', '+model',
#             '--output', 'json',
#             '--output-keys', 'unique_id original_file_path depends_on',
#             '--resource-type', 'model',
#             '--resource-type', 'snapshot',
#         ])

#         block = next(blocks)
#         self.assertDictContainsSubset(
#             {
#                 'configuration': {
#                     'file_path': str(Path('test_project_name/test1_file_path.sql'))
#                 },
#                 'downstream_blocks': [str(Path('test_project_name/test2_file_path'))],
#                 'name': str(Path('test_project_name/test1_file_path')),
#                 'language': 'sql',
#                 'type': 'dbt',
#                 'upstream_blocks': [],
#                 'uuid': str(Path('test_project_name/test1_file_path'))
#             },
#             block
#         )

#         block = next(blocks)
#         self.assertDictContainsSubset(
#             {
#                 'configuration': {
#                     'file_path': str(Path('test_project_name/test2_file_path.sql'))
#                 },
#                 'downstream_blocks': [],
#                 'name': str(Path('test_project_name/test2_file_path')),
#                 'language': 'sql',
#                 'type': 'dbt',
#                 'upstream_blocks': [str(Path('test_project_name/test1_file_path'))],
#                 'uuid': str(Path('test_project_name/test2_file_path'))
#             },
#             block
#         )


# @patch(
#     'mage_ai.data_preparation.models.block.platform.mixins.project_platform_activated',
#     lambda: True,
# )
# @patch(
#     'mage_ai.data_preparation.models.block.platform.utils.project_platform_activated',
#     lambda: True,
# )
# @patch('mage_ai.settings.platform.project_platform_activated', lambda: True)
# class DBTBlockSQLProjectPlatformTest(ProjectPlatformMixin, BlockWithProjectPlatformShared):
#     def test_file_path(self):
#         block = build_block()
#         block.configuration['file_source'] = dict(path='mage_data/dbt/demo/models/fire.sql')
#         self.assertEqual(block.file_path, 'mage_data/dbt/demo/models/fire.sql')

#     def test_project_path(self):
#         block = build_block()
#         block.configuration['file_source'] = dict(
#             path='mage_data/dbt/demo/models/fire.sql',
#             project_path='mage_data/dbt/demo',
#         )
#         self.assertEqual(block.project_path, os.path.join(base_repo_path(), 'mage_data/dbt/demo'))

#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.DBTCli.invoke')
#     @patch('mage_ai.data_preparation.models.block.dbt.block_sql.Profiles')
#     def test_upstream_dbt_blocks(self, Profiles, mock_invoke):
#         mock_invoke.return_value = dbtRunnerResult(success=True, result=[
#             json.dumps(dict(
#                 depends_on=dict(nodes=[]),
#                 original_file_path='models/water.sql',
#                 unique_id='water',
#             )),
#             json.dumps(dict(
#                 depends_on=dict(nodes=['water']),
#                 original_file_path='models/ice.sql',
#                 unique_id='ice',
#             )),
#         ])
#         Profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'

#         os.makedirs(os.path.join(base_repo_path(), 'mage_data/dbt/demo/models'), exist_ok=True)
#         for key in [
#             'fire',
#             'ice',
#             'water',
#         ]:
#             with open(
#                 os.path.join(base_repo_path(), f'mage_data/dbt/demo/models/{key}.sql'),
#                 'w',
#             ) as f:
#                 f.write('')
#         with open(os.path.join(base_repo_path(), 'mage_data/dbt/dbt_project.yml'), 'w') as f:
#             f.write('')

#         block = build_block()
#         block.configuration['file_source'] = dict(
#             path='mage_data/dbt/demo/models/fire.sql',
#             project_path='mage_data/dbt/demo',
#         )
#         blocks = block.upstream_dbt_blocks()

#         self.assertEqual(len(blocks), 2)

#         block1, block2 = blocks
#         self.assertTrue(isinstance(block1, DBTBlockSQL))
#         self.assertEqual(block1.type, BlockType.DBT)
#         self.assertEqual(block1.configuration, dict(
#             file_path='mage_data/dbt/demo/models/water.sql',
#             file_source=dict(
#                 path='mage_data/dbt/demo/models/water.sql',
#                 project_path='mage_data/dbt',
#             ),
#         ))
#         self.assertEqual(block1.language, BlockLanguage.SQL)

#         self.assertTrue(isinstance(block2, DBTBlockSQL))
#         self.assertEqual(block2.type, BlockType.DBT)
#         self.assertEqual(block2.configuration, dict(
#             file_path='mage_data/dbt/demo/models/ice.sql',
#             file_source=dict(
#                 path='mage_data/dbt/demo/models/ice.sql',
#                 project_path='mage_data/dbt',
#             ),
#         ))
#         self.assertEqual(block2.language, BlockLanguage.SQL)
#         self.assertEqual(block2.upstream_blocks, [block1])
