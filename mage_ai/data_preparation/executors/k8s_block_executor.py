from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from typing import Dict


class K8sBlockExecutor(BlockExecutor):
    def execute(
        self,
        analyze_outputs: bool = False,
        global_vars: Dict = None,
        update_status: bool = False,
        **kwargs,
    ) -> None:
        """
        TODO: Implement this method
        """
        self.block.execute_sync(
            analyze_outputs=analyze_outputs,
            global_vars=global_vars,
            update_status=update_status,
        )
