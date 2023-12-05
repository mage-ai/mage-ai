import os
from unittest.mock import MagicMock, patch

import yaml

from mage_ai.data_preparation.sync import GitConfig
from mage_ai.data_preparation.sync.git_sync import GitSync
from mage_ai.tests.base_test import DBTestCase


class GitSyncTest(DBTestCase):
    @patch('mage_ai.data_preparation.git.Git')
    def test_run_git_sync_data(self, mock_git_manager):
        git_manager_instance_mock = MagicMock()
        mock_git_manager.return_value = git_manager_instance_mock

        git_sync = GitSync(GitConfig(branch='dev'))
        git_sync.git_manager = git_manager_instance_mock

        with open(os.path.join(self.repo_path, '.preferences.yaml'), 'w') as f:
            f.write('test: 123\n')

        git_sync.sync_data()

        git_manager_instance_mock.reset_hard.called_once_with(branch='dev')
        git_manager_instance_mock.submodules_update.not_called()

        with open(os.path.join(self.repo_path, '.preferences.yaml'), 'r') as f:
            preferences = yaml.safe_load(f)
            self.assertEqual(preferences['test'], 123)

    @patch('mage_ai.data_preparation.git.Git')
    def test_run_git_sync_data_submodules(self, mock_git_manager):
        git_manager_instance_mock = MagicMock()
        mock_git_manager.return_value = git_manager_instance_mock

        git_sync = GitSync(GitConfig(branch='dev', sync_submodules=True))
        git_sync.git_manager = git_manager_instance_mock

        with open(os.path.join(self.repo_path, '.preferences.yaml'), 'w') as f:
            f.write('test: 123\n')

        git_sync.sync_data()

        git_manager_instance_mock.reset_hard.called_once_with(branch='dev')
        git_manager_instance_mock.submodules_update.called_once()

        with open(os.path.join(self.repo_path, '.preferences.yaml'), 'r') as f:
            preferences = yaml.safe_load(f)
            self.assertEqual(preferences['test'], 123)

    @patch('mage_ai.data_preparation.git.Git')
    def test_run_git_sync_data_with_no_preferences(self, mock_git_manager):
        git_manager_instance_mock = MagicMock()
        mock_git_manager.return_value = git_manager_instance_mock

        git_sync = GitSync(GitConfig(branch='dev'))
        git_sync.git_manager = git_manager_instance_mock

        preferences_file_path = os.path.join(self.repo_path, '.preferences.yaml')
        if os.path.exists(preferences_file_path):
            os.remove(preferences_file_path)

        git_sync.sync_data()

        git_manager_instance_mock.reset_hard.called_once_with(branch='dev')

        self.assertFalse(os.path.exists(preferences_file_path))

    @patch('mage_ai.data_preparation.git.Git')
    def test_run_git_reset(self, mock_git_manager):
        git_manager_instance_mock = MagicMock()
        mock_git_manager.return_value = git_manager_instance_mock

        git_sync = GitSync(GitConfig(branch='dev'))
        git_sync.git_manager = git_manager_instance_mock

        git_sync.reset()

        git_manager_instance_mock.clone.called_once_with(sync_submodules=False)
