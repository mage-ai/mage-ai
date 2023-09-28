from mage_ai.cli.main import app
from mage_ai.tests.base_test import TestCase
from typer.testing import CliRunner
from unittest import mock

runner = CliRunner()


class RunTests(TestCase):
    def test_run_with_no_arguments(self):
        result = runner.invoke(app, ['run'])
        assert result.exit_code == 2

    @mock.patch('mage_ai.data_preparation.models.pipeline.Pipeline')
    @mock.patch('mage_ai.data_preparation.executors.executor_factory.ExecutorFactory')
    def test_run_with_arguments(self, mock_executor_factory, mock_pipeline):
        result = runner.invoke(app, ['run', 'my_mage_project', 'load_titanic'])
        mock_pipeline.assert_called_once()
        mock_executor_factory.get_pipeline_executor.return_value.execute.assert_called_once()
        assert result.exit_code == 0
        assert 'Pipeline run completed.' in result.output

    @mock.patch('mage_ai.data_preparation.models.pipeline.Pipeline')
    @mock.patch('mage_ai.data_preparation.executors.executor_factory.ExecutorFactory')
    def test_run_with_tests(self, mock_executor_factory, mock_pipeline):
        result = runner.invoke(app, ['run', 'my_mage_project', 'load_titanic', '--test'])
        mock_pipeline.assert_called_once()
        mock_executor_factory.get_pipeline_executor.return_value.execute.assert_called_once_with(
            analyze_outputs=mock.ANY,
            global_vars=mock.ANY,
            run_sensors=mock.ANY,
            run_tests=True,
            update_status=mock.ANY,
        )
        assert result.exit_code == 0
        assert 'Pipeline run completed.' in result.output
