from typing import Callable
from unittest.mock import patch

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.file import File
from mage_ai.tests.api.endpoints.mixins import BaseAPIEndpointTest
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


class BlockWithProjectPlatformShared:
    def build_block(self, block_type: BlockType = None, **kwargs):
        self.block = Block.create(
            self.faker.unique.name(),
            block_type or 'data_loader',
            self.repo_path,
            language='python',
            **kwargs,
        )
        return self.block

    def run_test_configuration_getter(self):
        self.build_block(configuration=dict(mage=1))
        self.assertEqual(self.block.configuration, dict(mage=1))
        self.assertEqual(self.block._configuration, dict(mage=1))

    def run_test_configuration_setter(self):
        self.build_block()
        self.assertEqual(self.block.configuration, {})

        with patch.object(
            self.block,
            'clean_file_paths',
            wraps=self.block.clean_file_paths,
        ) as mock_clean_file_paths:
            self.block.configuration = dict(mage=1)
            mock_clean_file_paths.assert_called_once_with(dict(mage=1))
            self.assertEqual(self.block.configuration, dict(mage=1))

    def run_test_file_path(self, test_value: Callable):
        self.build_block()
        value = self.faker.unique.name()

        with patch.object(
            self.block,
            'get_file_path_from_source',
            lambda value=value: value,
        ):
            self.assertEqual(self.block.file_path, value)

        with patch.object(
            self.block,
            'get_file_path_from_source',
            lambda: None,
        ):
            self.assertEqual(self.block.file_path, test_value(self.block))


@patch('mage_ai.settings.platform.project_platform_activated', lambda: False)
class BlockWithProjectPlatformInactiveTest(BaseAPIEndpointTest, BlockWithProjectPlatformShared):
    def test_configuration_getter(self):
        self.run_test_configuration_getter()

    def test_configuration_setter(self):
        self.run_test_configuration_setter()

    def test_file_path(self):
        self.run_test_file_path(
            lambda block: f'/home/src/test/data_loaders/{block.uuid}.py',
        )

    def test_file(self):
        self.build_block()
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
            self.build_block()
            mock_load_template.assert_called_once_with(
                self.block.type,
                {},
                self.block.file_path,
                language=self.block.language,
                pipeline_type=None,
            )

    def test_create_dbt(self):
        file = self.build_block().file

        with patch(
            'mage_ai.data_preparation.models.block.File.from_path',
            lambda _x: file,
        ):
            with patch.object(file, 'create_parent_directories') as mock_create_parent_directories:
                with patch.object(file, 'update_content') as mock_update_content:
                    with patch.object(file, 'exists', lambda: False):
                        self.build_block(
                            block_type=BlockType.DBT,
                            configuration=dict(
                                file_path=self.faker.unique.name(),
                            ),
                        )
                        mock_create_parent_directories.assert_called_once_with(
                            self.block.file_path,
                        )
                        mock_update_content.assert_called_once_with('')


@patch('mage_ai.settings.platform.project_platform_activated', lambda: True)
class BlockWithProjectPlatformActivatedTest(ProjectPlatformMixin, BlockWithProjectPlatformShared):
    def test_configuration_getter(self):
        self.run_test_configuration_getter()

    def test_configuration_setter(self):
        self.run_test_configuration_setter()

    def test_file_path(self):
        self.run_test_file_path(
            lambda block: f'/home/src/test/mage_platform/data_loaders/{block.uuid}.py',
        )

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
                lambda x, file_path=file_path: file_path == x,
            ):
                self.build_block(configuration=dict(
                    file_source=dict(
                        path=file_path,
                    ),
                ))

                mock_load_template.assert_not_called()

    def test_create_dbt(self):
        file = self.build_block().file
        file_path = self.faker.unique.name()

        with patch.object(file, 'create_parent_directories') as mock_create_parent_directories:
            with patch.object(file, 'update_content') as mock_update_content:
                with patch.object(file, 'exists', lambda: False):
                    with patch(
                        'mage_ai.data_preparation.models.block.File.from_path',
                        lambda _x: file,
                    ):
                        with patch(
                            'mage_ai.data_preparation.models.block.from_another_project',
                            lambda x, file_path=file_path: file_path == x,
                        ):
                            self.build_block(
                                block_type=BlockType.DBT,
                                configuration=dict(
                                    file_path=self.faker.unique.name(),
                                    file_source=dict(
                                        path=file_path,
                                    ),
                                ),
                            )
                            mock_create_parent_directories.assert_not_called()
                            mock_update_content.assert_not_called()
