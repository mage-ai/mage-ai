from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.settings.repo import get_repo_path


class ExecutionStateResource(GenericResource):
    @classmethod
    async def collection(self, query, _meta, user, **kwargs):
        arr = []

        pipeline_uuid = query.get('pipeline_uuid', [False])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]

        block_uuid = query.get('block_uuid', [False])
        if block_uuid:
            block_uuid = block_uuid[0]

        if pipeline_uuid and block_uuid:
            repo_path = get_repo_path(user=user)
            pipeline = await Pipeline.get_async(pipeline_uuid, repo_path=repo_path)
            if pipeline and pipeline.type in [PipelineType.PYTHON, PipelineType.PYSPARK]:
                block = pipeline.get_block(block_uuid)
                if block and block.compute_management_enabled() and block.is_using_spark():
                    arr.append(dict(
                        spark=block.execution_states(),
                    ))

        return self.build_result_set(
            arr,
            user,
            **kwargs,
        )
