import urllib.parse
from typing import Optional

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.PipelineExecutionFrameworkResource import (
    PipelineExecutionFrameworkResource,
)
from mage_ai.frameworks.execution.models.pipeline.base import PipelineExecutionFramework
from mage_ai.frameworks.execution.models.pipeline.utils import (
    get_all_frameworks,
    get_framework,
)


class ExecutionFrameworkResource(GenericResource):
    @classmethod
    async def collection(cls, query, meta, user, **kwargs):
        level = query.get('level', [None])
        if level:
            level = level[0]
        if level is not None:
            level = int(level)

        return cls.build_result_set(
            await get_all_frameworks(level=level),
            user,
            **kwargs,
        )

    @classmethod
    async def get_model(cls, pk: str, **kwargs) -> Optional[PipelineExecutionFramework]:
        model = await get_framework(urllib.parse.unquote(pk))
        return model

    @classmethod
    async def member(cls, pk, user, **kwargs):
        model = cls.get_model(urllib.parse.unquote(pk), **kwargs)

        if not model:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return cls(model, user, **kwargs)


ExecutionFrameworkResource.register_child_resource('pipelines', PipelineExecutionFrameworkResource)
