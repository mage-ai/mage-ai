from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.models.constants import LOGS_DIR
import logging
import os


class LoggerManager:
    @classmethod
    def get_logger(
        self,
        repo_path: str = None,
        logs_dir: str = None,
        pipeline_uuid: str = None,
        block_uuid: str = None,
        partition: str = None,
    ):
        log_filepath = self.get_log_filepath(
            repo_path=repo_path,
            logs_dir=logs_dir,
            pipeline_uuid=pipeline_uuid,
            block_uuid=block_uuid,
            partition=partition,
            create_dir=True,
        )

        logger_name_parts = [pipeline_uuid]
        if partition is not None:
            logger_name_parts.append(partition)
        if block_uuid is not None:
            logger_name_parts.append(block_uuid)
        logger_name = '/'.join(logger_name_parts)

        logger = logging.getLogger(logger_name)

        if not len(logger.handlers):
            logger.setLevel(logging.INFO)
            formatter = logging.Formatter(
                '%(levelname)s %(asctime)s - %(message)s'
            )

            file_handler = logging.FileHandler(log_filepath)
            file_handler.setLevel(logging.INFO)
            file_handler.setFormatter(formatter)

            logger.addHandler(file_handler)
        return logger

    @classmethod
    def get_log_filepath(
        self,
        repo_path: str = None,
        logs_dir: str = None,
        pipeline_uuid: str = None,
        block_uuid: str = None,
        partition: str = None,
        create_dir: bool = False,
    ):
        repo_path = repo_path or get_repo_path()
        logs_dir = logs_dir or repo_path

        if pipeline_uuid is None:
            raise Exception('Please specify a pipeline uuid in your logger.')

        logs_dir_path = os.path.join(
            logs_dir,
            'pipelines',
            pipeline_uuid,
            LOGS_DIR,
            partition or '',
        )

        if create_dir and not os.path.exists(logs_dir_path):
            os.makedirs(logs_dir_path)

        if block_uuid is None:
            log_filepath = os.path.join(logs_dir_path, 'pipeline.log')
        else:
            log_filepath = os.path.join(logs_dir_path, f'{block_uuid}.log')
        return log_filepath
