import os
import shutil
from pathlib import Path
from unittest.mock import patch

from mage_ai.data_preparation.models.errors import FileNotInProjectError
from mage_ai.data_preparation.models.file import File, ensure_file_is_in_project
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.array import find
from mage_ai.tests.base_test import AsyncDBTestCase
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


class FileTest(AsyncDBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.original_path = os.getcwd()
        os.chdir(self.repo_path)

    @classmethod
    def tearDownClass(self):
        super().tearDownClass()
        os.chdir(self.original_path)

    def test_ensure_file_is_in_project_relative_file_path(self):
        file_path = 'file.txt'
        self.assertIsNone(ensure_file_is_in_project(file_path))

    def test_ensure_file_is_in_project_absolute_file_path_in_project(self):
        file_path = os.path.join(self.repo_path, 'file.txt')
        self.assertIsNone(ensure_file_is_in_project(file_path))

    def test_ensure_file_is_in_project_absolute_file_path_not_in_project(self):
        file_path = str(Path(os.path.join('/', 'other', 'path', 'file.txt')).absolute())
        with self.assertRaises(FileNotInProjectError):
            ensure_file_is_in_project(file_path)

    def test_ensure_file_is_in_project_relative_file_path_outside_project(self):
        file_path = '../file.txt'
        with self.assertRaises(FileNotInProjectError):
            ensure_file_is_in_project(file_path)

    def test_create_parent_directories(self):
        file_path = os.path.join(self.repo_path, 'demo', 'file.txt')
        self.assertFalse(os.path.exists(os.path.dirname(file_path)))
        self.assertTrue(File.create_parent_directories(file_path))
        with open(file_path, 'w') as f:
            f.write('')
        self.assertFalse(File.create_parent_directories(file_path))
        shutil.rmtree(os.path.dirname(file_path))


@patch('mage_ai.settings.repo.project_platform_activated', lambda: True)
class FileProjectPlatformTest(ProjectPlatformMixin, AsyncDBTestCase):
    def tearDown(self):
        try:
            shutil.rmtree(os.path.join(base_repo_path(), 'demo'))
        except FileNotFoundError:
            pass
        try:
            shutil.rmtree(os.path.join(base_repo_path(), 'mage_platform'))
        except FileNotFoundError:
            pass
        super().tearDown()

    def test_create(self):
        with patch(
            'mage_ai.data_preparation.models.file.project_platform_activated',
            lambda: True,
        ):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
                self.assertFalse(
                    os.path.exists(os.path.join(base_repo_path(), 'mage_platform/demo/file.txt')),
                )
                File.create('file.txt', 'demo', 'mage')
                self.assertTrue(
                    os.path.exists(os.path.join(base_repo_path(), 'mage_platform/demo/file.txt')),
                )

        with patch(
            'mage_ai.data_preparation.models.file.project_platform_activated',
            lambda: False,
        ):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: False):
                with patch('mage_ai.settings.repo.project_platform_activated', lambda: False):
                    self.assertFalse(
                        os.path.exists(os.path.join(base_repo_path(), 'demo/file.txt')),
                    )
                    File.create('file.txt', 'demo', 'mage')
                    self.assertTrue(os.path.exists(os.path.join(base_repo_path(), 'demo/file.txt')))

    async def test_create_async(self):
        with patch(
            'mage_ai.data_preparation.models.file.project_platform_activated',
            lambda: True,
        ):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
                self.assertFalse(
                    os.path.exists(os.path.join(base_repo_path(), 'mage_platform/demo/file.txt')),
                )
                await File.create_async('file.txt', 'demo', 'mage')
                self.assertTrue(
                    os.path.exists(os.path.join(base_repo_path(), 'mage_platform/demo/file.txt')),
                )

        with patch(
            'mage_ai.data_preparation.models.file.project_platform_activated',
            lambda: False,
        ):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: False):
                with patch('mage_ai.settings.repo.project_platform_activated', lambda: False):
                    self.assertFalse(
                        os.path.exists(os.path.join(base_repo_path(), 'demo/file.txt')),
                    )
                    await File.create_async('file.txt', 'demo', 'mage')
                    self.assertTrue(os.path.exists(os.path.join(base_repo_path(), 'demo/file.txt')))

    def test_from_path(self):
        with patch(
            'mage_ai.data_preparation.models.file.project_platform_activated',
            lambda: True,
        ):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
                file = File.from_path('demo/file.txt')
                self.assertEqual(file.filename, 'file.txt')
                self.assertEqual(file.dir_path, 'demo')
                self.assertEqual(file.repo_path, os.path.join(base_repo_path(), 'mage_platform'))

        with patch(
            'mage_ai.data_preparation.models.file.project_platform_activated',
            lambda: False,
        ):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: False):
                with patch('mage_ai.settings.repo.project_platform_activated', lambda: False):
                    file = File.from_path('demo/file.txt')
                    self.assertEqual(file.filename, 'file.txt')
                    self.assertEqual(file.dir_path, 'demo')
                    self.assertEqual(file.repo_path, base_repo_path())

    def test_get_all_files(self):
        with patch(
            'mage_ai.data_preparation.models.file.project_platform_activated',
            lambda: True,
        ):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: True):
                File.create('file.txt', 'demo', 'mage')
                File.create('file.sql', 'demo', 'mage')
                File.create('demo.sql', 'demo', 'mage')

                full_paths = File.get_all_files(
                    base_repo_path(),
                    pattern='.sql$',
                )

                result = dict(
                    name='test',
                    children=[
                        dict(
                            name='mage_platform',
                            children=[
                                dict(name='data_exporters', children=[]),
                                dict(name='data_loaders', children=[]),
                                dict(
                                    name='demo',
                                    children=[
                                        dict(name='demo.sql', disabled=False),
                                        dict(name='file.sql', disabled=False),
                                    ],
                                ),
                                dict(name='pipelines', children=[
                                    dict(name=self.pipeline.uuid, children=[]),
                                ]),
                                dict(name='transformers', children=[]),
                            ],
                        ),
                    ],
                )

                self.assertEqual(full_paths['name'], result['name'])

                mage_platform = find(lambda x: x['name'] == 'mage_platform', full_paths['children'])

                for key in [
                    'data_exporters',
                    'data_loaders',
                    'demo',
                    'pipelines',
                    'transformers',
                ]:
                    self.assertIsNotNone(find(
                        lambda x, key=key: x['name'] == key,
                        mage_platform['children'],
                    ))

                demo = find(lambda x: x['name'] == 'demo', mage_platform['children'])

                for key in [
                    'demo.sql',
                    'file.sql',
                ]:
                    self.assertIsNotNone(find(
                        lambda x, key=key: x['name'] == key,
                        demo['children'],
                    ))

                pipelines = find(lambda x: x['name'] == 'pipelines', mage_platform['children'])

                for key in [
                    self.pipeline.uuid,
                ]:
                    self.assertIsNotNone(find(
                        lambda x, key=key: x['name'] == key,
                        pipelines['children'],
                    ))

    def test_ensure_file_is_in_project(self):
        with patch(
            'mage_ai.data_preparation.models.file.project_platform_activated',
            lambda: False,
        ):
            with patch('mage_ai.settings.platform.project_platform_activated', lambda: False):
                error = False
                try:
                    ensure_file_is_in_project('mage_data/demo/file.txt')
                except FileNotInProjectError:
                    error = True
                self.assertTrue(error)

            with patch(
                'mage_ai.data_preparation.models.file.project_platform_activated',
                lambda: True,
            ):
                with patch(
                    'mage_ai.data_preparation.models.file.project_platform_activated',
                    lambda: True,
                ):
                    ensure_file_is_in_project('mage_data/demo/file.txt')
