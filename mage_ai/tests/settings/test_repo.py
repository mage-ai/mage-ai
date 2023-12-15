from mage_ai.settings.repo import (
    base_repo_path_directory_name,
    get_data_dir,
    get_metadata_path,
    get_repo_name,
    get_repo_path,
    get_variables_dir,
)
from mage_ai.tests.base_test import DBTestCase


class RepoSettingsTest(DBTestCase):
    def test_base_repo_path_directory_name(self):
        self.assertEqual(base_repo_path_directory_name(), '/home/src')

    def test_get_repo_path(self):
        self.assertEqual(get_repo_path(), '/home/src/test')

    def test_get_repo_path_relative_path(self):
        self.assertEqual(get_repo_path(absolute_path=False), 'test')

    def test_get_repo_path_root_project(self):
        self.assertEqual(get_repo_path(root_project=True), '/home/src/test')
        self.assertEqual(get_repo_path(root_project=True, absolute_path=False), 'test')

    def test_get_repo_name(self):
        self.assertEqual(get_repo_name(), 'test')
        self.assertEqual(get_repo_name('/home/src/test/mage_platform'), 'mage_platform')

    def test_get_data_dir(self):
        self.assertEqual(get_data_dir(), '.')

    def test_get_metadata_path(self):
        self.assertEqual(get_metadata_path(), '/home/src/test/metadata.yaml')
        self.assertEqual(get_metadata_path(root_project=True), '/home/src/test/metadata.yaml')

    def test_get_variables_dir(self):
        self.assertEqual(get_variables_dir(), '/home/src/test')
