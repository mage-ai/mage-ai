from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db.models import BlockRun, PipelineRun, PipelineSchedule
from mage_ai.orchestration.db import safe_db_query
from sqlalchemy.orm import aliased


class BlockRunResource(DatabaseResource):
    model_class = BlockRun

    @classmethod
    @safe_db_query
    def build_result_set(self, arr, user, **kwargs):
        block_runs = []
        for tup in arr:
            (
                block_uuid,
                completed_at,
                created_at,
                id,
                pipeline_run_id,
                status,
                updated_at,
                pipeline_schedule_id,
                pipeline_schedule_name,
            ) = tup

            block_run = BlockRun()
            block_run.block_uuid = block_uuid
            block_run.completed_at = completed_at
            block_run.created_at = created_at
            block_run.id = id
            block_run.pipeline_run_id = pipeline_run_id
            block_run.status = status
            block_run.updated_at = updated_at
            block_run.pipeline_schedule_id = pipeline_schedule_id
            block_run.pipeline_schedule_name = pipeline_schedule_name

            block_runs.append(block_run)

        return super().build_result_set(
            block_runs,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        pipeline_run = kwargs.get('parent_model')

        if pipeline_run:
            pipeline_run_id = pipeline_run.id

            return BlockRun.query.filter(BlockRun.pipeline_run_id == pipeline_run_id)

        query = BlockRun.query

        a = aliased(BlockRun, name='a')
        b = aliased(PipelineRun, name='b')
        c = aliased(PipelineSchedule, name='c')

        columns = [
            a.block_uuid,
            a.completed_at,
            a.created_at,
            a.id,
            a.pipeline_run_id,
            a.status,
            a.updated_at,
            c.id.label('pipeline_schedule_id'),
            c.name.label('pipeline_schedule_name'),
        ]

        query = (
            BlockRun.
            select(*columns).
            join(b, a.pipeline_run_id == b.id).
            join(c, b.pipeline_schedule_id == c.id)
        )

        pipeline_run_id = query_arg.get('pipeline_run_id', [None])
        if pipeline_run_id:
            pipeline_run_id = pipeline_run_id[0]
        if pipeline_run_id:
            query = (
                query.
                filter(a.pipeline_run_id == int(pipeline_run_id))
            )

        pipeline_uuid = query_arg.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]
        if pipeline_uuid:
            query = (
                query.
                filter(c.pipeline_uuid == pipeline_uuid)
            )

        return query.order_by(a.created_at.desc(), a.completed_at.desc())
