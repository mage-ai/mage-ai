from typing import List, Optional, Union

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.frameworks.execution.constants import EXECUTION_FRAMEWORKS
from mage_ai.frameworks.execution.models.pipeline.base import PipelineExecutionFramework
from mage_ai.shared.array import find, flatten


def get_execution_frameworks(
    uuid: Optional[str] = None,
) -> Union[List[PipelineExecutionFramework], PipelineExecutionFramework]:
    arr = flatten([framework.get_pipelines() for framework in EXECUTION_FRAMEWORKS])
    if uuid:
        result = find(lambda framework: framework.uuid == uuid, arr)
        if result:
            return result
        else:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)
    return arr


class ExecutionFrameworkResource(GenericResource):
    @classmethod
    async def collection(cls, query, meta, user, **kwargs):
        return cls.build_result_set(
            get_execution_frameworks(),
            user,
            **kwargs,
        )

    @classmethod
    async def member(cls, pk, user, **kwargs):
        model = get_execution_frameworks(uuid=pk)

        if not model:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return cls(model, user, **kwargs)
