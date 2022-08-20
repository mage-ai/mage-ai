from typing import Callable, Dict


class BlockExecutor:
    def __init__(self, pipeline, block_uuid):
        self.pipeline = pipeline
        self.block_uuid = block_uuid
        self.block = self.pipeline.get_block(block_uuid)

    def execute(
        self,
        analyze_outputs: bool = False,
        global_vars: Dict = None,
        update_status: bool = False,
        on_complete: Callable[[str], None] = None,
        on_failure: Callable[[str], None] = None,
    ) -> None:
        try:
            self.block.execute_sync(
                analyze_outputs=analyze_outputs,
                global_vars=global_vars,
                update_status=update_status,
            )
        except Exception as e:
            if on_failure is not None:
                on_failure(self.block_uuid)
            raise e
        if on_complete is not None:
            on_complete(self.block_uuid)
