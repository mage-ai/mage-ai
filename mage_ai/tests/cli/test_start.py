from mage_ai.cli.main import app
from mage_ai.tests.base_test import TestCase
import os
from typer.testing import CliRunner
from unittest import mock

runner = CliRunner()


@mock.patch('mage_ai.server.server.start_server')
class StartTests(TestCase):
    def tests_start_with_no_arguments(self, mock_start_sever):
        result = runner.invoke(app, ['start'])
        mock_start_sever.assert_called_once_with(
            'localhost',
            '6789',
            os.getcwd(),
            False,
            False
        )
        assert result.exit_code == 0
        assert 'Mage is running at http://' in result.output

    def test_with_host(self, mock_start_sever):
        result = runner.invoke(app, ['start', '--host', '127.0.0.1'])
        mock_start_sever.assert_called_once_with(
            '127.0.0.1',
            '6789',
            os.getcwd(),
            False,
            False
        )
        assert result.exit_code == 0
        assert 'Mage is running at http://127.0.0.1:6789' in result.output

    def test_start_with_port(self, mock_start_sever):
        result = runner.invoke(app, ['start', '--port', '8000'])
        mock_start_sever.assert_called_once_with(
            'localhost',
            '8000',
            os.getcwd(),
            False,
            False
        )
        assert result.exit_code == 0
        assert 'Mage is running at http://localhost:8000' in result.output

    @mock.patch('mage_ai.cli.main.os.path.abspath')
    def test_start_with_project_path(self, mock_abspath, mock_start_sever):
        mock_abspath.side_effect = lambda x: x
        result = runner.invoke(app, ['start', 'my_mage_project'])
        mock_start_sever.assert_called_once_with(
            'localhost',
            '6789',
            'my_mage_project',
            False,
            False
        )
        assert result.exit_code == 0
        assert ('Mage is running at http://localhost:6789'
                ' and serving project my_mage_project') in result.output
