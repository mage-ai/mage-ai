from typing import Callable, Dict
import json
import requests


class BlockExecutor:
    def __init__(self, pipeline, block_uuid):
        self.pipeline = pipeline
        self.block_uuid = block_uuid
        self.block = self.pipeline.get_block(block_uuid)

    def execute(
        self,
        analyze_outputs: bool = False,
        callback_url: str = None,
        execution_partition: str = None,
        global_vars: Dict = None,
        update_status: bool = False,
        on_complete: Callable[[str], None] = None,
        on_failure: Callable[[str], None] = None,
        **kwargs,
    ) -> None:
        try:
            self.block.execute_sync(
                analyze_outputs=analyze_outputs,
                execution_partition=execution_partition,
                global_vars=global_vars,
                update_status=update_status,
            )
        except Exception as e:
            if on_failure is not None:
                on_failure(self.block_uuid)
            elif callback_url is not None:
                self.__update_block_run_status(callback_url, 'failed')
            raise e
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
        print(response.text)
