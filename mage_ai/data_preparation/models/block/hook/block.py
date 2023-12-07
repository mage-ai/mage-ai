from typing import List

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.global_hooks.models import HookStrategy


class HookBlock(Block):
    def _execute_block(self, *args, **kwargs) -> List:
        global_vars = kwargs.get('global_vars') or {}
        self.hook.run(
            check_status=True,
            error_on_failure=True,
            poll_timeout=5,
            strategies=[HookStrategy.RAISE],
            with_trigger=True,
            **(global_vars or {}),
        )

        return [self.hook.output]

    def run_tests(self, *args, **kwargs) -> None:
        pass
