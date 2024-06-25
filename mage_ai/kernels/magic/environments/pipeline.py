import os
from datetime import datetime, timedelta
from typing import Any, Dict, Union

from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.errors.utils import USER_CODE_MARKER
from mage_ai.kernels.magic.environments.base import BaseEnvironment
from mage_ai.kernels.magic.environments.setup_helpers import execute, get_block
from mage_ai.shared.constants import ENV_DEV
from mage_ai.shared.path_fixer import remove_repo_names
from mage_ai.shared.strings import singularize


class Pipeline(BaseEnvironment):
    async def hydrate_variables(self) -> Dict[str, Union[Any, Dict]]:
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

    async def build_success_result_options_metadata(self) -> Dict[str, Any]:
        return dict(
            **(await super().build_success_result_options_metadata()),
            **self.metadata,
            pipeline_uuid=self.uuid,
        )

    async def build_execution_options(self) -> Dict[str, Any]:
        return dict(
            **(await super().build_execution_options()),
            execute=execute,
            store_locals=True,
            store_output=True,
        )

    async def build_execution_variables(self) -> Dict[str, Any]:
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
            **(await super().build_execution_variables()),
            block_type=block_type,
            block_uuid=block_uuid,
            pipeline_uuid=self.uuid,
        )
        execution_variables['message'] = f'{USER_CODE_MARKER}\n{self.message}'

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

        self.metadata['block_type'] = block_type
        self.metadata['block_uuid'] = block_uuid
        self.metadata['execution_partition'] = execution_variables.get('execution_partition')

        return execution_variables
