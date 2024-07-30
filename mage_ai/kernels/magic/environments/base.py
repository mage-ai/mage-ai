from typing import Any, Dict, Optional, Union

from mage_ai.kernels.magic.constants import ResultType


class BaseEnvironment:
    def __init__(
        self,
        uuid: str,
        kernel: Any,
        output_manager: Any,
        message: str,
        code_after: Optional[str] = None,
        code_before: Optional[str] = None,
        environment_variables: Optional[Dict] = None,
        variables: Optional[Dict] = None,
    ):
        self.code_after = code_after
        self.code_before = code_before
        self.environment_variables = environment_variables
        self.kernel = kernel
        self.output_manager = output_manager
        self.uuid = uuid
        self.variables = variables

        self.code_before = code_before
        self.code_after = code_after
        self.message = message
        self.metadata = {}

    async def run_process(
        self,
        message_request_uuid: Optional[str] = None,
        **process_options,
    ):
        await self.store_variables()

        process = self.kernel.build_process(
            self.message,
            message_request_uuid=message_request_uuid,
            output_manager=self.output_manager,
            callback=lambda x: print('Execution finished...', x),
            execution_options=await self.build_execution_options(),
            **(process_options or {}),
        )

        return self.kernel.run_process(process)

    async def hydrate_variables(self) -> Dict[str, Union[Any, Dict]]:
        self.variables = self.variables or {}
        return self.variables

    async def store_variables(self):
        if self.environment_variables:
            await self.output_manager.store_environment_variables(self.environment_variables)

        await self.hydrate_variables()
        if self.variables:
            await self.output_manager.store_variables(self.variables)

    async def build_execution_variables(self) -> Dict[str, Any]:
        return dict(
            message=self.message,
            variables=self.variables,
        )

    async def build_success_result_options_metadata(self) -> Dict[str, Any]:
        return dict(
            namespace=self.output_manager.namespace,
            path=self.output_manager.path,
            uuid=self.output_manager.uuid,
        )

    async def build_success_result_options(self) -> Dict[str, Any]:
        return dict(
            data_type=None,
            metadata=await self.build_success_result_options_metadata(),
            output='',
            type=ResultType.OUTPUT,
        )

    async def build_execution_options(self) -> Dict[str, Any]:
        return dict(
            code_after=self.code_after,
            code_before=self.code_before,
            environment_variable=self.environment_variables,
            execution_variables=await self.build_execution_variables(),
            success_result_options=await self.build_success_result_options(),
        )
