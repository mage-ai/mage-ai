from mage_ai.data_preparation.logger_manager import LoggerManager
from typing import Callable, Dict
import json
import requests


class BlockExecutor:
    def __init__(self, pipeline, block_uuid, execution_partition=None):
        self.pipeline = pipeline
        self.block_uuid = block_uuid
        self.block = self.pipeline.get_block(block_uuid)
        self.execution_partition = execution_partition
        self.logger = LoggerManager.get_logger(
            pipeline_uuid=self.pipeline.uuid,
            block_uuid=self.block_uuid,
            partition=self.execution_partition,
        )

    def execute(
        self,
        analyze_outputs: bool = False,
        callback_url: str = None,
        global_vars: Dict = None,
        update_status: bool = False,
        on_complete: Callable[[str], None] = None,
        on_failure: Callable[[str], None] = None,
        **kwargs,
    ) -> None:
        self.logger.info('Start executing block.')
        try:
            self.block.execute_sync(
                analyze_outputs=analyze_outputs,
                execution_partition=self.execution_partition,
                global_vars=global_vars,
                logger=self.logger,
                update_status=update_status,
            )
        except Exception as e:
            self.logger.info('Failed to execute block.')
            if on_failure is not None:
                on_failure(self.block_uuid)
            elif callback_url is not None:
                self.__update_block_run_status(callback_url, 'failed')
            raise e
        self.logger.info('Finish executing block.')
        if on_complete is not None:
            on_complete(self.block_uuid)
        elif callback_url is not None:
            self.__update_block_run_status(callback_url, 'completed')

    def __update_block_run_status(self, callback_url: str, status: str):
        response = requests.put(
            callback_url,
            data=json.dumps({
                'block_run': {
                    'status': status,
                },
            }),
            headers={
                'Content-Type': 'application/json',
            },
        )
        self.logger.info(f'Callback response: {response.text}')
