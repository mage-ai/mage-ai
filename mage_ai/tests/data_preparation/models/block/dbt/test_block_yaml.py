# import asyncio
# import os
# import secrets
# from pathlib import Path
# from unittest.mock import MagicMock, call, patch

# from dbt.cli.main import dbtRunnerResult

# from mage_ai.data_preparation.models.block import Block
# from mage_ai.data_preparation.models.block.dbt.block import DBTBlock
# from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
# from mage_ai.settings.utils import base_repo_path
# from mage_ai.tests.base_test import TestCase
# from mage_ai.tests.data_preparation.models.block.platform.test_mixins import (
#     BlockWithProjectPlatformShared,
# )
# from mage_ai.tests.shared.mixins import ProjectPlatformMixin


# def build_block(pipeline, content: str) -> DBTBlock:
#     return DBTBlock.create(
#         name='test_dbt_block_yaml',
#         uuid='test_dbt_block_yaml',
#         block_type=BlockType.DBT,
#         language=BlockLanguage.YAML,
#         pipeline=pipeline,
#         configuration={
#             'dbt_project_name': 'test_project_name',
#             'dbt_profile_target': 'dev',
#             'dbt': {'command': 'build'}
#         },
#         content=content,
#     )


# class DBTBlockYAMLTest(TestCase):
#     @classmethod
#     def setUpClass(self):
#         super().setUpClass()

#         self.pipeline = MagicMock()
#         self.pipeline.uuid = 'test'
#         self.pipeline.repo_path = 'test_repo_path'

#         self.dbt_block = build_block(
#             self.pipeline,
#             '--select model+ --exclude model --vars \'{"foo":"bar"}\'',
#         )

#     @classmethod
#     def tearDownClass(self):
#         super().tearDownClass()

#     @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Profiles')
#     @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Project')
#     def test_metadata_async(self, Project, Profiles):
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
#                     'block': {},
#                     'project': None,
#                     'projects': {
#                         'test_project_name': {
#                             'project_name': 'test_project_name',
#                             'target': 'test',
#                             'targets': ['dev', 'prod', 'test']
#                         }
#                     }
#                 }
#             }
#         )

#     def test_tags(self):
#         self.assertEqual(
#             self.dbt_block.tags(),
#             ['build']
#         )

#     def test_project_path(self):
#         self.assertEqual(
#             self.dbt_block.project_path,
#             str(Path('test_repo_path/dbt/test_project_name'))
#         )

#     @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.DBTCli.invoke')
#     @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Profiles')
#     def test_execute_block(self, Profiles, mock_invoke: MagicMock):
#         mock_invoke.return_value = dbtRunnerResult(success=True)
#         Profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'

#         self.dbt_block._execute_block(
#             {},
#             runtime_arguments={
#                 '__mage_variables': {
#                     'blocks': {
#                         'test_dbt_block_yaml': {
#                             'configuration': {
#                                 'flags': ['--full-refresh']
#                             }
#                         }
#                     }
#                 }
#             },
#             global_vars={}
#         )

#         self.assertEqual(mock_invoke.mock_calls[0], call([
#             'deps',
#             '--select', 'model+',
#             '--exclude', 'model',
#             '--vars', '{"foo": "bar"}',
#             '--project-dir', str(Path('test_repo_path/dbt/test_project_name')),
#             '--full-refresh',
#             '--target', 'dev',
#             '--profiles-dir', 'test_profiles_dir'
#         ]))
#         self.assertEqual(mock_invoke.mock_calls[1], call([
#             'build',
#             '--select', 'model+',
#             '--exclude', 'model',
#             '--vars', '{"foo": "bar"}',
#             '--project-dir', str(Path('test_repo_path/dbt/test_project_name')),
#             '--full-refresh',
#             '--target', 'dev',
#             '--profiles-dir', 'test_profiles_dir'
#         ]))

#     @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.DBTCli.invoke')
#     @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Profiles')
#     def test_execute_block_with_interpolation(self, Profiles, mock_invoke: MagicMock):
#         mock_invoke.return_value = dbtRunnerResult(success=True)
#         Profiles.return_value.__enter__.return_value.profiles_dir = 'test_profiles_dir'

#         key = secrets.token_urlsafe()
#         value = secrets.token_urlsafe()
#         os.environ[key] = value

#         dbt_block = build_block(
#             self.pipeline,
#             ' '.join([
#                 '--select',
#                 'models/example/"{} {} {}".sql'.format(
#                     '{' + '{',
#                     "variables('model1')",
#                     '}' + '}',
#                 ),
#                 'models/example/"{} {} {}".sql'.format(
#                     '{' + '{',
#                     "block_output(parse=lambda arr, _variables: arr[0][0]['model2'])",
#                     '}' + '}',
#                 ),
#                 '\n',
#                 '--vars',
#                 (
#                     '\'{}"test1": "{} {} {}", '
#                     '"test2": "{} {} {}", '
#                     '"test3": "{} {} {}", '
#                     '"test4": "{} {} {}"{}\'',
#                 )[0].format(
#                     '{',
#                     '{' + '{',
#                     f'env_var("{key}")',
#                     '}' + '}',
#                     '{' + '{',
#                     "variables('model1')",
#                     '}' + '}',
#                     '{' + '{',
#                     'block_output(parse=lambda arr, _variables: arr[1])',
#                     '}' + '}',
#                     '{' + '{',
#                     'block_output("pastel_portal", parse=lambda arr, _variables: arr[2])',
#                     '}' + '}',
#                     '}',
#                 ),
#             ])
#         )

#         outputs_from_input_vars = dict(
#             df_1=[dict(model2='my_second_dbt_model')],
#             df_2=[1, 2, 3],
#             fanciful_moon=[dict(model2='my_second_dbt_model')],
#             pastel_portal=[1, 2, 3],
#         )

#         dbt_block.upstream_blocks = [
#             Block(
#                 'fanciful_moon',
#                 'fanciful_moon',
#                 BlockType.DATA_LOADER,
#             ),
#             Block(
#                 'pastel_portal',
#                 'pastel_portal',
#                 BlockType.DATA_LOADER,
#             ),
#         ]

#         dbt_block._execute_block(
#             outputs_from_input_vars,
#             runtime_arguments={
#                 '__mage_variables': {
#                     'blocks': {
#                         'test_dbt_block_yaml': {
#                             'configuration': {
#                                 'flags': ['--full-refresh']
#                             }
#                         }
#                     }
#                 }
#             },
#             global_vars=dict(
#                 foo='bar',
#                 model1='my_first_dbt_model',
#             ),
#         )

#         self.assertEqual(mock_invoke.mock_calls[0], call([
#             'deps',
#             '--select',
#             'models/example/my_first_dbt_model.sql',
#             'models/example/my_second_dbt_model.sql',
#             '--vars',
#             '{"foo": "bar", "model1": "my_first_dbt_model", '
#             f'"test1": "{value}", "test2": "my_first_dbt_model", '
#             '"test3": "[1, 2, 3]", "test4": "3"}',
#             '--project-dir',
#             str(Path('test_repo_path/dbt/test_project_name')),
#             '--full-refresh',
#             '--target',
#             'dev',
#             '--profiles-dir',
#             'test_profiles_dir',
#         ]))

#         self.assertEqual(mock_invoke.mock_calls[1], call([
#             'build',
#             '--select',
#             'models/example/my_first_dbt_model.sql',
#             'models/example/my_second_dbt_model.sql',
#             '--vars',
#             '{"foo": "bar", "model1": "my_first_dbt_model", '
#             f'"test1": "{value}", "test2": "my_first_dbt_model", '
#             '"test3": "[1, 2, 3]", "test4": "3"}',
#             '--project-dir',
#             str(Path('test_repo_path/dbt/test_project_name')),
#             '--full-refresh',
#             '--target',
#             'dev',
#             '--profiles-dir',
#             'test_profiles_dir',
#         ]))


# @patch(
#     'mage_ai.data_preparation.models.block.platform.mixins.project_platform_activated',
#     lambda: True,
# )
# @patch(
#     'mage_ai.data_preparation.models.block.platform.utils.project_platform_activated',
#     lambda: True,
# )
# @patch('mage_ai.settings.platform.project_platform_activated', lambda: True)
# class DBTBlockYAMLProjectPlatformTest(ProjectPlatformMixin, BlockWithProjectPlatformShared):
#     def test_project_path(self):
#         block = build_block(MagicMock(), '')
#         block.configuration['dbt_project_name'] = 'mage_data/dbt/demo'
#         self.assertEqual(block.project_path, os.path.join(base_repo_path(), 'mage_data/dbt/demo'))

#     @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Profiles')
#     @patch('mage_ai.data_preparation.models.block.dbt.block_yaml.Project')
#     def test_metadata_async(self, Project, Profiles):
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

#         block = build_block(MagicMock(), '')
#         # block.configuration['dbt_project_name'] = 'demo'
#         metadata = asyncio.run(block.metadata_async())

#         self.assertEqual(
#             metadata,
#             {
#                 'dbt': {
#                     'block': {},
#                     'project': None,
#                     'projects': {
#                         'test_project_name': {
#                             'project_name': 'test_project_name',
#                             'target': 'test',
#                             'targets': ['dev', 'prod', 'test']
#                         }
#                     }
#                 }
#             }
#         )
