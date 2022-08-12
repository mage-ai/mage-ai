from typing import Dict


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
    ) -> None:
        self.block.execute_sync(
            analyze_outputs=analyze_outputs,
            global_vars=global_vars,
            update_status=update_status,
        )
