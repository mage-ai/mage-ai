from typing import List

from mage_ai.data_preparation.models.block import Block


class HookBlock(Block):
    def __init__(self, *args, **kwargs) -> None:
        self.hook = kwargs.get('hook')

    def _execute_block(self, *args, **kwargs) -> List:
        global_vars = kwargs.get('global_vars') or {}
        self.hook.run(**(global_vars or {}))

        return [self.hook.output]
