from typing import List

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.global_hooks.models import HookStrategy


class HookBlock(Block):
    def _execute_block(self, *args, **kwargs) -> List:
        global_vars = kwargs.get('global_vars') or {}
        self.hook.run(
            check_status=True,
            error_on_failure=True,
            poll_interval=10,
            strategies=[HookStrategy.RAISE],
            with_trigger=True,
            **(global_vars or {}),
        )

        output = None
        if self.hook.status and (self.hook.status.error or self.hook.status.errors):
            errors = []

            if self.hook.status.errors:
                for error_details in self.hook.status.errors:
                    errors.append(str(error_details.error))
            elif self.hook.status.error:
                errors.append(str(self.hook.status.error))

            error = '\n'.join(errors)

            if HookStrategy.RAISE == self.hook.status.strategy:
                raise Exception(error)

            output = [error]
        elif output is not None:
            output = [self.hook.output]

        return output

    def run_tests(self, *args, **kwargs) -> None:
        pass
