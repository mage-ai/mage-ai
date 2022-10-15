from mage_ai.data_preparation.logger_manager import StreamToLogger
from typing import Callable, Dict


class ExecuteWithOutputMixin():
    def execute(
        self,
        build_block_output_stdout: Callable[..., object] = None,
        global_vars: Dict = None,
        **kwargs,
    ) -> None:
        # TODOs:
        # 1. Support multiple sources and sinks
        # 2. Support flink pipeline
        if build_block_output_stdout:
            stdout = build_block_output_stdout(self.pipeline.uuid)
        else:
            stdout = StreamToLogger(self.logger)
        try:
            with redirect_stdout(stdout):
                self.execute_in_python()
        except Exception as e:
            if not build_block_output_stdout:
                self.logger.exception(
                        f'Failed to execute streaming pipeline {self.pipeline.uuid}',
                        error=e,
                    )
            raise e

    def execute_in_python(self):
        raise Exception(
            f'{self.__class__.__name__} must implement the execute_in_python method.',
        )
