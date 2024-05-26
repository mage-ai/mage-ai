from sqlalchemy.orm import aliased

from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.shared.strings import is_number


class BlockRunResource(DatabaseResource):
    model_class = BlockRun

    @classmethod
    @safe_db_query
    def build_result_set(self, arr, user, **kwargs):
        block_runs = []
        for tup in arr:
            if isinstance(tup, BlockRun):
                block_uuid = tup.block_uuid if hasattr(tup, 'block_uuid') else None
                completed_at = tup.completed_at if hasattr(tup, 'completed_at') else None
                created_at = tup.created_at if hasattr(tup, 'created_at') else None
                model_id = tup.id if hasattr(tup, 'id') else None
                pipeline_run_id = tup.pipeline_run_id if hasattr(tup, 'pipeline_run_id') else None
                started_at = tup.started_at if hasattr(tup, 'started_at') else None
                status = tup.status if hasattr(tup, 'status') else None
                updated_at = tup.updated_at if hasattr(tup, 'updated_at') else None
                pipeline_schedule_id = (
                    tup.pipeline_schedule_id
                    if hasattr(
                        tup,
                        'pipeline_schedule_id',
                    )
                    else None
                )
                pipeline_schedule_name = (
                    tup.pipeline_schedule_name
                    if hasattr(
                        tup,
                        'pipeline_schedule_name',
                    )
                    else None
                )
            else:
                (
                    block_uuid,
                    completed_at,
                    created_at,
                    model_id,
                    pipeline_run_id,
                    started_at,
                    status,
                    updated_at,
                    pipeline_schedule_id,
                    pipeline_schedule_name,
                ) = tup

            block_run = dict(
                block_uuid=block_uuid,
                completed_at=completed_at,
                created_at=created_at,
                id=model_id,
                pipeline_run_id=pipeline_run_id,
                started_at=started_at,
                status=status,
                updated_at=updated_at,
                pipeline_schedule_id=pipeline_schedule_id,
                pipeline_schedule_name=pipeline_schedule_name,
            )

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
            a.started_at,
            a.status,
            a.updated_at,
            c.id.label('pipeline_schedule_id'),
            c.name.label('pipeline_schedule_name'),
        ]

        query = (
            BlockRun.select(*columns)
            .join(b, a.pipeline_run_id == b.id)
            .join(c, b.pipeline_schedule_id == c.id)
        )

        pipeline_run_id = query_arg.get('pipeline_run_id', [None])
        if pipeline_run_id:
            pipeline_run_id = pipeline_run_id[0]
        if pipeline_run_id and is_number(pipeline_run_id):
            query = query.filter(a.pipeline_run_id == int(pipeline_run_id))

        pipeline_uuid = query_arg.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]
        if pipeline_uuid:
            query = query.filter(c.pipeline_uuid == pipeline_uuid)

        # The order_by value should be an attribute on the BlockRun model.
        order_by_arg = query_arg.get('order_by', [None])
        if order_by_arg:
            order_by_arg = order_by_arg[0]
        if order_by_arg:
            order_by_parts = order_by_arg.split(' ')
            if len(order_by_parts) >= 2:
                order_by = (order_by_parts[0], order_by_parts[1])
            else:
                order_by = (order_by_parts[0], 'asc')

            col, asc_desc = order_by
            asc_desc = asc_desc.lower()
            try:
                br_col = getattr(a, col)
                initial_results = query.order_by(getattr(br_col, asc_desc)())
            except AttributeError:
                raise Exception(
                    'Block run sort column/query is invalid. The sort column '
                    + 'must be an attribute of the BlockRun model. The sort direction '
                    + 'is either "asc" (ascending order) or "desc" (descending order).'
                )
        else:
            initial_results = query.order_by(
                a.started_at.desc(),
                a.created_at.desc(),
                a.completed_at.desc(),
            )

        return initial_results
