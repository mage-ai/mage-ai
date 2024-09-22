import os
import shutil
from unittest.mock import patch

from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_config, init_repo
from mage_ai.settings.utils import base_repo_path
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


@patch('mage_ai.settings.platform.project_platform_activated', lambda: True)
@patch('mage_ai.settings.repo.project_platform_activated', lambda: True)
class RepoManagerProjectPlatformTest(ProjectPlatformMixin):
    def test_init(self):
        repo = RepoConfig(root_project=False)
        self.assertFalse(repo.root_project)
        self.assertEqual(repo.repo_path, os.path.join(base_repo_path(), 'mage_platform'))
        self.assertEqual(repo.variables_dir, os.path.join(base_repo_path(), 'mage_platform'))

        repo = RepoConfig(root_project=True)
        self.assertTrue(repo.root_project)
        self.assertEqual(repo.repo_path, base_repo_path())
        self.assertEqual(repo.variables_dir, base_repo_path())

    def test_from_dict(self):
        repo = RepoConfig.from_dict(dict(), root_project=False)
        self.assertFalse(repo.root_project)
        self.assertEqual(repo.repo_path, os.path.join(base_repo_path(), 'mage_platform'))
        self.assertEqual(repo.variables_dir, os.path.join(base_repo_path(), 'mage_platform'))

        repo = RepoConfig.from_dict(dict(), root_project=True)
        self.assertTrue(repo.root_project)
        self.assertEqual(repo.repo_path, base_repo_path())
        self.assertEqual(repo.variables_dir, base_repo_path())

    def test_metadata_path(self):
        repo = RepoConfig(root_project=False)
        self.assertEqual(
            repo.metadata_path, os.path.join(base_repo_path(), 'mage_platform/metadata.yaml'),
        )

        repo = RepoConfig(root_project=True)
        self.assertEqual(repo.metadata_path, os.path.join(base_repo_path(), 'metadata.yaml'))

    def test_get_repo_config(self):
        repo = get_repo_config(root_project=False)
        self.assertFalse(repo.root_project)
        self.assertEqual(repo.repo_path, os.path.join(base_repo_path(), 'mage_platform'))
        self.assertEqual(repo.variables_dir, os.path.join(base_repo_path(), 'mage_platform'))

        repo = get_repo_config(root_project=True)
        self.assertTrue(repo.root_project)
        self.assertEqual(repo.repo_path, base_repo_path())
        self.assertEqual(repo.variables_dir, base_repo_path())

    def test_init_repo(self):
        path = os.path.join(os.path.dirname(base_repo_path()), 'test2')
        try:
            shutil.rmtree(path)
        except Exception:
            pass
        with patch('mage_ai.data_preparation.repo_manager.get_repo_config') as mock_get_repo_config:
            init_repo(path, root_project=True)
            mock_get_repo_config.assert_called_once_with(path, root_project=True)
        try:
            shutil.rmtree(path)
        except Exception:
            pass
