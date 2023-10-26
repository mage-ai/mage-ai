from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline


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
            pipeline = await Pipeline.get_async(pipeline_uuid)
            if pipeline and PipelineType.PYTHON == pipeline.type:
                block = pipeline.get_block(block_uuid)
                if block and block.compute_management_enabled() and block.is_using_spark():
                    jobs = block.jobs_during_execution()
                    sqls = block.sqls_during_execution(jobs=jobs)
                    stages = block.stages_during_execution(jobs=jobs)

                    arr.append(dict(
                        spark=dict(
                            jobs=[m.to_dict() for m in jobs],
                            sqls=[m.to_dict() for m in sqls],
                            stages=[m.to_dict() for m in stages],
                        ),
                    ))

        return self.build_result_set(
            arr,
            user,
            **kwargs,
        )
