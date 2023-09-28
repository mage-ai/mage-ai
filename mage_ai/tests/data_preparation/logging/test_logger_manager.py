import os
from datetime import datetime, timedelta
from unittest.mock import patch

from mage_ai.data_preparation.logging.logger_manager import LoggerManager
from mage_ai.data_preparation.storage.local_storage import LocalStorage
from mage_ai.tests.base_test import TestCase


class LoggerManagerTest(TestCase):
    def test_delete_old_logs_no_retention_period(self):
        # Test the scenario when retention_period is not set,
        # it should return without doing anything
        mock_pipeline_uuid = 'pipeline_uuid_1'
        logger_manager = LoggerManager(
            pipeline_uuid=mock_pipeline_uuid,
        )
        logger_manager.logging_config.retention_period = None
        # Mock the storage object to avoid actual deletion of files
        logger_manager.storage = MockStorage()
        self.__create_log_dir(logger_manager, mock_pipeline_uuid)
        logger_manager.delete_old_logs()
        # Assert that no files were deleted
        self.assertEqual(logger_manager.storage.remove_dir_calls, [])

    def test_delete_old_logs_with_retention_period(self):
        # Test the scenario when retention_period is set, it should delete old log files
        mock_pipeline_uuid = 'pipeline_uuid_2'
        logger_manager = LoggerManager(
            pipeline_uuid=mock_pipeline_uuid,
        )
        retention_period = '7d'  # Set your desired retention period here
        logger_manager.logging_config.retention_period = retention_period
        # Mock the storage object to capture the calls to remove_dir
        logger_manager.storage = MockStorage()
        mock_old_log_folder = self.__create_log_dir(logger_manager, mock_pipeline_uuid)
        logger_manager.delete_old_logs()
        # Assert that the folder with old log files was deleted
        self.assertIn(mock_old_log_folder, logger_manager.storage.remove_dir_calls)

    @patch('mage_ai.data_preparation.models.pipeline.Pipeline.get_all_pipelines')
    def test_delete_old_logs_with_no_pipeline_uuid(self, mock_get_all_pipelines):
        # Test the scenario when pipeline_uuid is None, it should delete old logs for all pipelines
        logger_manager = LoggerManager()
        retention_period = '7d'  # Set your desired retention period here
        logger_manager.logging_config.retention_period = retention_period
        logger_manager.pipeline_uuid = None
        # Mock the storage object to capture the calls to remove_dir
        logger_manager.storage = MockStorage()
        mock_pipeline_uuids = ['pipeline_uuid_3', 'pipeline_uuid_4']
        mock_get_all_pipelines.return_value = mock_pipeline_uuids
        mock_pipeline_configs = [
            dict(
                pipeline_uuid='pipeline_uuid_3',
                days_ago=10,
                trigger_id=1,
            ),
            dict(
                pipeline_uuid='pipeline_uuid_4',
                days_ago=5,
                trigger_id=2,
            ),
            dict(
                pipeline_uuid='pipeline_uuid_4',
                days_ago=15,
                trigger_id=3,
            )
        ]
        for mock_pipeline_config in mock_pipeline_configs:
            mock_log_folder = self.__create_log_dir(
                logger_manager,
                mock_pipeline_config['pipeline_uuid'],
                days_ago=mock_pipeline_config['days_ago'],
                trigger_id=mock_pipeline_config['trigger_id'],
            )
            mock_pipeline_config['log_folder'] = mock_log_folder

        logger_manager.delete_old_logs()

        # Assert that the folders with old log files were deleted for each pipeline
        for mock_pipeline_config in mock_pipeline_configs:
            if mock_pipeline_config['days_ago'] >= 7:
                self.assertIn(
                    mock_pipeline_config['log_folder'],
                    logger_manager.storage.remove_dir_calls,
                )
            else:
                self.assertNotIn(
                    mock_pipeline_config['log_folder'],
                    logger_manager.storage.remove_dir_calls,
                )

    def __create_log_dir(
        self,
        logger_manager: LoggerManager,
        pipeline_uuid: str,
        days_ago: int = 10,
        trigger_id: int = 1,
    ) -> str:
        mock_log_path_prefix = logger_manager.get_log_filepath_prefix(
            pipeline_uuid=pipeline_uuid
        )
        mock_old_log_date = (
            datetime.utcnow() -
            timedelta(days=days_ago)
        ).strftime(format='%Y%m%dT%H%M%S')
        mock_log_folder = os.path.join(
            mock_log_path_prefix,
            str(trigger_id),
            mock_old_log_date,
        )
        logger_manager.storage.makedirs(mock_log_folder)
        return mock_log_folder


class MockStorage(LocalStorage):
    def __init__(self):
        super().__init__()
        self.remove_dir_calls = []

    def remove_dir(self, path):
        super().remove_dir(path)
        self.remove_dir_calls.append(path)
