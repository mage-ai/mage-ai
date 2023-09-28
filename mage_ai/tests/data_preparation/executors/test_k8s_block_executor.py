import os
import unittest
from unittest.mock import MagicMock, patch

from mage_ai.data_preparation.executors.k8s_block_executor import K8sBlockExecutor
from mage_ai.services.k8s.config import K8sExecutorConfig


class K8sBlockExecutorTestCase(unittest.TestCase):
    def setUp(self):
        self.pipeline = MagicMock()
        self.pipeline.uuid = 'pipeline_uuid'
        self.pipeline.repo_config = MagicMock()
        self.pipeline.repo_config.variables_dir = os.path.join(os.getcwd(), 'mage_data')
        self.block_uuid = 'block-uuid'

        self.logger_manager = MagicMock()
        self.logger = MagicMock()
        self.logger_manager.logger = self.logger

        self.executor = K8sBlockExecutor(self.pipeline, self.block_uuid)

        self.executor.logger_manager = self.logger_manager
        self.executor.logger = self.logger

    @patch('mage_ai.data_preparation.executors.k8s_block_executor.K8sJobManager')
    def test_execute(self, job_manager_mock):
        # Mock the necessary objects and methods
        self.executor._run_commands = MagicMock(return_value='mocked_cmd')
        job_manager_instance_mock = MagicMock()
        job_manager_mock.return_value = job_manager_instance_mock

        # Call the method to test
        self.executor._execute(block_run_id=1, global_vars={'key': 'value'})

        # Assertions
        self.executor._run_commands.assert_called_once_with(
            block_run_id=1,
            global_vars={'key': 'value'},
        )
        job_manager_mock.assert_called_once_with(
            job_name='mage-data-prep-block-1',
            logger=self.executor.logger,
            logging_tags={},
            namespace='default',
        )
        job_manager_instance_mock.run_job.assert_called_once_with(
            'mocked_cmd',
            k8s_config=K8sExecutorConfig.load(config={}),
        )

    @patch('mage_ai.data_preparation.executors.k8s_block_executor.K8sJobManager')
    def test_execute_with_custom_job_name_prefix(self, job_manager_mock):
        # Mock the necessary objects and methods
        self.executor._run_commands = MagicMock(return_value='mocked_cmd')
        job_manager_instance_mock = MagicMock()
        job_manager_mock.return_value = job_manager_instance_mock

        # Set a custom job name prefix
        self.executor.executor_config.job_name_prefix = 'custom-prefix'

        # Call the method to test
        self.executor._execute(block_run_id=1, global_vars={'key': 'value'})

        # Assertions
        self.executor._run_commands.assert_called_once_with(
            block_run_id=1,
            global_vars={'key': 'value'},
        )
        job_manager_mock.assert_called_once_with(
            job_name='mage-custom-prefix-block-1',
            logger=self.executor.logger,
            logging_tags={},
            namespace='default',
        )
        job_manager_instance_mock.run_job.assert_called_once_with(
            'mocked_cmd',
            k8s_config=K8sExecutorConfig.load(config={'job_name_prefix': 'custom-prefix'}),
        )
