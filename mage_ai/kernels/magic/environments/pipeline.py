import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.errors.utils import USER_CODE_MARKER
from mage_ai.kernels.magic.constants import ResultType
from mage_ai.kernels.magic.environments.setup_helpers import execute, get_block
from mage_ai.shared.constants import ENV_DEV
from mage_ai.shared.path_fixer import remove_repo_names
from mage_ai.shared.strings import singularize


class Pipeline:
    def __init__(
        self,
        uuid: str,
        kernel: Any,
        output_manager: Any,
        environment_variables: Optional[Dict] = None,
        variables: Optional[Dict] = None,
    ):
        self.environment_variables = environment_variables
        self.kernel = kernel
        self.output_manager = output_manager
        self.uuid = uuid
        self.variables = variables

    async def run_process(
        self,
        message: str,
        message_request_uuid: Optional[str] = None,
        **process_options,
    ):
        if self.environment_variables:
            await self.output_manager.store_environment_variables(self.environment_variables)

        variables = await self.__hydrate_variables()
        if self.variables:
            await self.output_manager.store_variables(variables)

        # mlops/memory_upgrade_v2/data_loaders/meteoric_quantum.py
        # -> data_loaders/meteoric_quantum.py
        block_file_path = remove_repo_names(self.output_manager.path)
        # ['data_loaders', 'meteoric_quantum.py']
        parts = os.path.split(block_file_path)
        # meteoric_quantum.py
        block_filename = os.path.join(*parts[1:])
        # data_loader
        block_type = singularize(parts[0])
        # meteoric_quantum
        block_uuid = os.path.splitext(block_filename)[0]

        execution_variables = dict(
            block_type=block_type,
            block_uuid=block_uuid,
            message=f'{USER_CODE_MARKER}\n{message}',
            pipeline_uuid=self.uuid,
            variables=variables,
        )

        block = await get_block(**execution_variables)
        if block.configuration and block.configuration.get('templates'):
            templates = block.configuration.get('templates')
            for value in (templates or {}).values():
                vars = value.get('variables', {}) or {}
                for key, value in vars.items():
                    execution_variables['variables'] = (
                        execution_variables.get('variables', {}) or {}
                    )
                    if not isinstance(execution_variables['variables'], dict):
                        execution_variables['variables'] = {}
                    execution_variables['variables'][key] = value

        process = self.kernel.build_process(
            message,
            message_request_uuid=message_request_uuid,
            output_manager=self.output_manager,
            callback=lambda x: print('Execution finished...', x),
            execution_options=dict(
                execute=execute,
                environment_variable=self.environment_variables,
                execution_variables=execution_variables,
                store_locals=True,
                store_output=True,
                success_result_options=dict(
                    data_type=None,
                    metadata=dict(
                        block_type=block_type,
                        block_uuid=block_uuid,
                        execution_partition=variables.get('execution_partition'),
                        namespace=self.output_manager.namespace,
                        path=self.output_manager.path,
                        pipeline_uuid=self.uuid,
                        uuid=self.output_manager.uuid,
                    ),
                    output='',
                    type=ResultType.OUTPUT,
                ),
            ),
            **(process_options or {}),
        )

        return self.kernel.run_process(process)

    async def __hydrate_variables(self) -> Dict[str, Union[Any, Dict]]:
        # Add default trigger runtime variables so the code can run successfully.
        global_vars = get_global_variables(self.uuid)
        global_vars['env'] = ENV_DEV

        if 'execution_date' not in global_vars:
            now = datetime.now()
            global_vars['execution_date'] = now
            global_vars['interval_end_datetime'] = now + timedelta(days=1)
            global_vars['interval_seconds'] = None
            global_vars['interval_start_datetime'] = now
            global_vars['interval_start_datetime_previous'] = None

        global_vars['event'] = dict()

        return {
            **global_vars,
            **(self.variables or {}),
        }
