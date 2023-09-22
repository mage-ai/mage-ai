import os
from pathlib import Path

from mage_ai.data_preparation.models.errors import FileNotInProjectError
from mage_ai.data_preparation.models.file import ensure_file_is_in_project
from mage_ai.tests.base_test import TestCase


class FileTest(TestCase):
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
