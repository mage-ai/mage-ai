import os
from typing import Callable
from unittest.mock import patch

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dbt.block_sql import DBTBlock, DBTBlockSQL
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.file import File
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.path_fixer import add_root_repo_path_to_relative_path
from mage_ai.tests.api.endpoints.mixins import BaseAPIEndpointTest
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


class BlockWithProjectPlatformShared:
    def build_block(self, project_platform: bool = True, block_type: BlockType = None, **kwargs):
        with patch(
            'mage_ai.data_preparation.models.block.platform.mixins.project_platform_activated',
            lambda: project_platform,
        ):
            with patch(
                'mage_ai.data_preparation.models.block.project_platform_activated',
                lambda: project_platform,
            ):
                with patch(
                    'mage_ai.settings.platform.project_platform_activated',
                    lambda: project_platform,
                ):
                    self.block = Block.create(
                        self.faker.unique.name(),
                        block_type or 'data_loader',
                        self.repo_path,
                        language='python',
                        **kwargs,
                    )
                    self.block.project_platform_activated

                    return self.block

    def run_test_file_path(self, test_value: Callable):
        self.build_block()
        value = self.faker.unique.name()

        with patch('mage_ai.shared.path_fixer.add_absolute_path', lambda value, _=value: value):
            self.assertEqual(self.block.file_path, add_root_repo_path_to_relative_path(value))

        with patch('mage_ai.shared.path_fixer.add_absolute_path', lambda value, _: None):
            self.assertEqual(self.block.file_path, test_value(self.block))


@patch('mage_ai.settings.platform.project_platform_activated', lambda: False)
class BlockWithProjectPlatformInactiveTest(BaseAPIEndpointTest, BlockWithProjectPlatformShared):
    def test_configuration_getter(self):
        self.build_block(project_platform=False, configuration=dict(mage=1))
        self.assertEqual(self.block.configuration, dict(
            mage=1,
        ))
        self.assertEqual(self.block._configuration, dict(
            mage=1,
        ))

    def test_configuration_setter(self):
        block = self.build_block(project_platform=False)
        self.assertEqual(block.configuration, {})

        with patch.object(
            block,
            'clean_file_paths',
            wraps=block.clean_file_paths,
        ) as mock_clean_file_paths:
            block.configuration = dict(mage=1)
            mock_clean_file_paths.assert_called_once_with(dict(mage=1))
            self.assertEqual(block.configuration, dict(mage=1))

    # def test_file_path(self):
    #     self.run_test_file_path(
    #         lambda block: os.path.join(base_repo_path(), f'data_loaders/{block.uuid}.py'),
    #     )

    def test_file(self):
        self.build_block(project_platform=False)
        file = File.from_path(self.block.file_path)
        for key in [
            'filename',
            'dir_path',
            'repo_path',
        ]:
            self.assertEqual(
                getattr(self.block.file, key),
                getattr(file, key),
            )

    def test_create(self):
        with patch('mage_ai.data_preparation.models.block.load_template') as mock_load_template:
            self.build_block(project_platform=False)
            mock_load_template.assert_called_once_with(
                self.block.type,
                {},
                self.block.file_path,
                language=self.block.language,
                pipeline_type=None,
            )

    def test_create_dbt(self):
        file = self.build_block(project_platform=False).file

        with patch(
            'mage_ai.data_preparation.models.block.File.from_path',
            lambda _x: file,
        ):
            with patch.object(file, 'create_parent_directories') as mock_create_parent_directories:
                with patch.object(file, 'update_content') as mock_update_content:
                    with patch.object(file, 'exists', lambda: False):
                        os.makedirs(os.path.dirname(self.block.file_path), exist_ok=True)

                        self.build_block(
                            project_platform=False,
                            block_type=BlockType.DBT,
                            configuration=dict(
                                file_path=f'data_loaders/{self.block.uuid}.py',
                            ),
                        )
                        mock_create_parent_directories.assert_called_once_with(
                            self.block.file_path,
                        )
                        mock_update_content.assert_called_once_with('')


@patch('mage_ai.settings.platform.project_platform_activated', lambda: True)
@patch('mage_ai.settings.repo.project_platform_activated', lambda: True)
class BlockWithProjectPlatformActivatedTest(ProjectPlatformMixin, BlockWithProjectPlatformShared):
    def test_configuration_getter(self):
        block = self.build_block(configuration=dict(mage=1))
        self.assertEqual(self.block.configuration, dict(
            file_source=dict(
                path=f'mage_platform/data_loaders/{block.uuid}.py',
            ),
            mage=1,
        ))
        self.assertEqual(self.block._configuration, dict(
            file_source=dict(
                path=f'mage_platform/data_loaders/{block.uuid}.py',
            ),
            mage=1,
        ))

    def test_configuration_setter(self):
        block = self.build_block()
        self.assertEqual(self.block.configuration, dict(
            file_source=dict(
                path=f'mage_platform/data_loaders/{block.uuid}.py',
            ),
        ))

        with patch.object(
            self.block,
            'clean_file_paths',
            wraps=self.block.clean_file_paths,
        ) as mock_clean_file_paths:
            self.block.configuration = dict(mage=1)
            mock_clean_file_paths.assert_called_once_with(dict(mage=1))
            self.assertEqual(self.block.configuration, dict(mage=1))

    # def test_file_path(self):
    #     with patch('mage_ai.shared.path_fixer.get_repo_path', lambda x: base_repo_path()):
    #         self.run_test_file_path(
    #             lambda block: os.path.join(
    #                 base_repo_path(),
    #                 f'mage_platform/data_loaders/{block.uuid}.py',
    #             ),
    #         )

    def test_file(self):
        self.build_block()
        file = File.from_path(self.block.file_path)

        with patch.object(self.block, 'build_file', lambda: file):
            for key in [
                'filename',
                'dir_path',
                'repo_path',
            ]:
                self.assertEqual(
                    getattr(self.block.file, key),
                    getattr(file, key),
                )

    def test_create(self):
        file_path = self.faker.unique.name()

        with patch('mage_ai.data_preparation.models.block.load_template') as mock_load_template:
            with patch(
                'mage_ai.data_preparation.models.block.from_another_project',
                lambda file_path, other_file_path, x=file_path: file_path == x,
            ):
                self.build_block(configuration=dict(
                    file_source=dict(
                        path=file_path,
                    ),
                ))

                mock_load_template.assert_not_called()

    def test_create_dbt(self):
        block = self.build_block()
        file = block.file
        file_path = f'mage_platform/data_loaders/{block.uuid}.py'
        with open(os.path.join(base_repo_path(), 'mage_platform', 'dbt_project.yml'), 'w') as f:
            f.write('')

        with patch.object(file, 'create_parent_directories') as mock_create_parent_directories:
            with patch.object(file, 'update_content') as mock_update_content:
                with patch.object(file, 'exists', lambda: False):
                    with patch(
                        'mage_ai.data_preparation.models.block.File.from_path',
                        lambda _x: file,
                    ):
                        with patch(
                            'mage_ai.data_preparation.models.block.from_another_project',
                            lambda file_path, other_file_path, x=file_path: file_path == x,
                        ):
                            self.build_block(
                                block_type=BlockType.DBT,
                                configuration=dict(
                                    file_path=f'mage_platform/data_loaders/{block.uuid}.py',
                                    file_source=dict(
                                        path=file_path,
                                    ),
                                ),
                            )
                            mock_create_parent_directories.assert_not_called()
                            mock_update_content.assert_not_called()


@patch(
    'mage_ai.data_preparation.models.block.platform.mixins.project_platform_activated',
    lambda: True,
)
@patch(
    'mage_ai.data_preparation.models.block.platform.utils.project_platform_activated',
    lambda: True,
)
@patch('mage_ai.settings.platform.project_platform_activated', lambda: True)
@patch('mage_ai.settings.repo.project_platform_activated', lambda: True)
class ProjectPlatformAccessibleTest(ProjectPlatformMixin, BlockWithProjectPlatformShared):
    def test_project_platform_activated(self):
        self.assertFalse(self.build_block(project_platform=False).project_platform_activated)

        self.assertTrue(self.build_block().project_platform_activated)

    def test_clean_file_paths(self):
        os.makedirs(f'{self.repo_path}/dir3/dir4', exist_ok=True)
        with open(f'{self.repo_path}/dir3/dbt_project.yml', 'w') as f:
            f.write('')
        with open(f'{self.repo_path}/dir3/dir4/filename.sql', 'w') as f:
            f.write('')

        configuration = dict(
            file_path='mage_platform/dir1/dir2/filename.sql',
            file_source=dict(
                path='mage_platform/dir3/dir4/filename.sql',
            ),
        )
        block = self.build_block()
        block.type = BlockType.DBT

        self.assertEqual(block.clean_file_paths(configuration), dict(
            file_path='mage_platform/dir1/dir2/filename.sql',
            file_source=dict(
                path='mage_platform/dir3/dir4/filename.sql',
                project_path='mage_platform/dir3',
            ),
        ))

        configuration['file_source']['project_path'] = self.faker.unique.name()
        configuration_new = block.clean_file_paths(configuration)
        self.assertEqual(configuration_new, dict(
            file_path='mage_platform/dir1/dir2/filename.sql',
            file_source=dict(
                path='mage_platform/dir3/dir4/filename.sql',
                project_path='mage_platform/dir3',
            ),
        ))

        block.configuration = configuration_new
        project_path = self.faker.unique.name()
        configuration_new['file_source']['project_path'] = project_path
        self.assertEqual(block.clean_file_paths(configuration_new), dict(
            file_path='mage_platform/dir1/dir2/filename.sql',
            file_source=dict(
                path='mage_platform/dir3/dir4/filename.sql',
                project_path='mage_platform/dir3',
            ),
        ))

    def test_is_from_another_project(self):
        with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
            with patch(
                'mage_ai.data_preparation.models.block.platform.utils.project_platform_activated',
                lambda: True,
            ):
                block = self.build_block()
                block._configuration = dict(
                    file_source=dict(path='mage_platform/mage.py'),
                )
                block._project_platform_activated = True
                self.assertFalse(block.is_from_another_project())

                block._configuration = dict(
                    file_source=dict(path='mage_data/mage.py'),
                )
                self.assertTrue(block.is_from_another_project())

        with patch('mage_ai.settings.platform.project_platform_activated', lambda: False):
            with patch(
                'mage_ai.data_preparation.models.block.platform.utils.project_platform_activated',
                lambda: False,
            ):
                block = self.build_block()
                block._configuration = dict(
                    file_source=dict(path='test/mage_platform/mage.py'),
                )
                block._project_platform_activated = True
                self.assertFalse(block.is_from_another_project())

    def test_get_file_path_from_source(self):
        block = self.build_block()
        block._configuration = dict(
            file_source=dict(path='test/mage_platform/mage.py'),
        )
        with patch.object(block, 'is_from_another_project', lambda: True):
            self.assertEqual(block.get_file_path_from_source(), 'test/mage_platform/mage.py')

    def test_get_project_path_from_source(self):
        block = self.build_block()

        block._configuration = dict(
            file_source=dict(project_path='mage_platform/mage.py'),
        )
        with patch.object(block, 'is_from_another_project', lambda: True):
            self.assertEqual(
                block.get_project_path_from_source(),
                os.path.join(base_repo_path(), 'mage_platform/mage.py'),
            )

        block._configuration = dict(
            file_source=dict(project_path='/mage_platform/mage.py'),
        )
        with patch.object(block, 'is_from_another_project', lambda: True):
            self.assertEqual(
                block.get_project_path_from_source(),
                '/mage_platform/mage.py',
            )

    def test_get_project_path_from_project_name(self):
        block = self.build_block()
        # self.assertIsNone(block.get_project_path_from_project_name('test/mage_platform/dir1'))

        self.assertEqual(
            block.get_project_path_from_project_name('mage_data/dir1'),
            os.path.join(base_repo_path(), 'mage_data/dir1'),
        )

    def test_get_base_project_from_source(self):
        block = self.build_block()
        block._configuration = dict(
            dbt_project_name='mage_data/fire',
            file_source=dict(path='mage_data/mage.py'),
        )
        self.assertEqual(
            block.get_base_project_from_source(),
            os.path.join(base_repo_path(), 'mage_data'),
        )

    def test_build_file(self):
        block = self.build_block()
        block._configuration = dict(
            file_source=dict(path='mage_data/utils/mage.py'),
        )
        file = block.build_file()
        self.assertEqual(str(file.filename), 'utils/mage.py')
        self.assertEqual(str(file.dir_path), 'mage_data')
        self.assertEqual(str(file.repo_path), base_repo_path())

    def test_hydrate_dbt_nodes(self):
        block = self.build_block()
        block.project_path = os.path.join(base_repo_path(), 'mage_data/dbt/demo')

        nodes_default = 'fire'
        nodes_init = [
            dict(
                depends_on=dict(nodes=['water']),
                original_file_path='models/users.sql',
                unique_id='ice',
            ),
        ]

        # block._configuration = dict(
        #     file_source=dict(path='mage_platform/utils/mage.py'),
        # )
        # self.assertEqual(block.hydrate_dbt_nodes(nodes_default, nodes_init), nodes_default)

        block._configuration = dict(
            file_source=dict(path='mage_data/utils/mage.py'),
        )
        self.assertEqual(block.hydrate_dbt_nodes(nodes_default, nodes_init), dict(
            ice=dict(
                file_path='test/mage_data/dbt/demo/models/users.sql',
                original_file_path='models/users.sql',
                upstream_nodes=set(['water']),
            ),
        ))

    def test_node_uuids_mapping(self):
        block = self.build_block()
        block.project_path = os.path.join(base_repo_path(), 'mage_data/dbt/demo')

        nodes_init = [
            dict(
                depends_on=dict(nodes=['water']),
                original_file_path='models/users.sql',
                unique_id='ice',
            ),
        ]

        # default_value = 'fire'
        # block._configuration = dict(
        #     file_source=dict(path='mage_platform/utils/mage.py'),
        # )
        # self.assertEqual(block.node_uuids_mapping(default_value, None), default_value)

        block._configuration = dict(
            file_source=dict(path='mage_data/utils/mage.py'),
        )
        nodes = block.hydrate_dbt_nodes(None, nodes_init)
        self.assertEqual(block.node_uuids_mapping(None, nodes), dict(
            ice='mage_data/dbt/demo/models/users',
        ))

    def test_build_dbt_block(self):
        block = self.build_block()
        block._configuration = dict(
            file_source=dict(path='mage_data/utils/mage.py'),
        )
        block.project_path = os.path.join(base_repo_path(), 'mage_data/dbt/demo')

        os.makedirs(os.path.join(base_repo_path(), 'mage_data/dbt/demo/models'), exist_ok=True)
        with open(os.path.join(base_repo_path(), 'mage_data/dbt/demo/models/users.sql'), 'w') as f:
            f.write('')
        with open(os.path.join(base_repo_path(), 'mage_data/dbt/dbt_project.yml'), 'w') as f:
            f.write('')

        name = self.faker.unique.name()
        block = block.build_dbt_block(
            block_class=DBTBlock,
            block_dict=dict(
                block_type=BlockType.DBT,
                configuration=None,
                language=BlockLanguage.SQL,
                name=name,
                uuid=self.faker.unique.name(),
                pipeline=None,
            ),
            node=dict(original_file_path='models/users.sql'),
        )

        self.assertTrue(isinstance(block, DBTBlockSQL))
        self.assertEqual(block.type, BlockType.DBT)
        self.assertEqual(block.configuration, dict(
            file_source=dict(
                path='mage_data/dbt/demo/models/users.sql',
                project_path='mage_data/dbt',
            ),
        ))
        self.assertEqual(block.language, BlockLanguage.SQL)
        self.assertEqual(block.name, name)
