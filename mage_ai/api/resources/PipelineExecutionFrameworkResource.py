from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.frameworks.execution.models.pipeline.adapter import Pipeline


class PipelineExecutionFrameworkResource(GenericResource):
    @classmethod
    async def collection(cls, query, meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')
        pipelines = await Pipeline.load_pipelines(
            execution_framework_uuids=[parent_model.uuid] if parent_model is not None else None
        )
        return cls.build_result_set(
            pipelines,
            user,
            **kwargs,
        )

    @classmethod
    async def member(cls, pk, user, **kwargs):
        parent_model = kwargs.get('parent_model')
        pipelines = await Pipeline.load_pipelines(
            execution_framework_uuids=[parent_model.uuid] if parent_model is not None else None,
            uuids=[pk],
        )

        model = pipelines[0] if pipelines and len(pipelines) >= 1 else None

        if not model:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        return cls(model, user, **kwargs)
