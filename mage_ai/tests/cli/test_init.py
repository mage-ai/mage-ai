from mage_ai.cli.main import app
from mage_ai.tests.base_test import TestCase
from typer.testing import CliRunner
from unittest import mock

runner = CliRunner()


class InitTests(TestCase):
    @mock.patch('mage_ai.data_preparation.repo_manager.init_repo')
    @mock.patch('mage_ai.cli.main.os.getcwd')
    def test_init_project_with_path(self, mock_getcwd, mock_init_repo):
        mock_getcwd.return_value = 'home'
        result = runner.invoke(app, ['init', 'my_mage_project'])
        mock_init_repo.assert_called_once_with('home/my_mage_project')
        assert result.exit_code == 0
        assert 'Initialized Mage project' in result.output

    def test_init_project_without_path(self):
        result = runner.invoke(app, ['init'])
        assert result.exit_code == 2
        assert 'Initialized Mage project' not in result.output

    @mock.patch('mage_ai.data_preparation.repo_manager.init_repo')
    def test_init_project_with_existing_path(self, mock_init_repo):
        mock_init_repo.side_effect = FileExistsError()
        result = runner.invoke(app, ['init', 'my_mage_project'])
        mock_init_repo.assert_called_once()
        assert 'Initialized Mage project' not in result.output
