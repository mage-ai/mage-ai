from .base import (
    META_KEY_LIMIT,
    BaseDetailHandler,
    BaseHandler,
)
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from sqlalchemy.orm import aliased, selectinload
from typing import List


class ApiAllBlockRunListHandler(BaseHandler):
    model_class = BlockRun

    @safe_db_query
    def get(self):
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

        pipeline_run_id = self.get_argument('pipeline_run_id', None)
        if pipeline_run_id:
            query = (
                query.
                filter(a.pipeline_run_id == int(pipeline_run_id))
            )

        pipeline_uuid = self.get_argument('pipeline_uuid', None)
        if pipeline_uuid:
            query = (
                query.
                filter(c.pipeline_uuid == pipeline_uuid)
            )

        query = (
            query.
            order_by(a.created_at.desc(), a.completed_at.desc())
        ).all()
        collection = [r for r in query]

        self.write(dict(block_runs=collection))
        self.finish()


class ApiBlockRunListHandler(BaseHandler):
    model_class = BlockRun

    @safe_db_query
    def get(self, pipeline_run_id):
        block_runs = BlockRun.query.filter(
            BlockRun.pipeline_run_id == int(pipeline_run_id),
        ).all()
        collection = [r.to_dict() for r in block_runs]

        self.write(dict(block_runs=collection))
        self.finish()


def process_pipeline_runs(
    handler,
    backfill_id: int = None,
    pipeline_schedule_id: int = None,
    pipeline_uuid: str = None,
    status: str = None,
    order_by: List[str] = None,
):
    results = (
        PipelineRun.
        query.
        options(selectinload(PipelineRun.block_runs)).
        options(selectinload(PipelineRun.pipeline_schedule))
    )
    if backfill_id is not None:
        results = results.filter(PipelineRun.backfill_id == int(backfill_id))
    if pipeline_schedule_id is not None:
        results = results.filter(PipelineRun.pipeline_schedule_id == int(pipeline_schedule_id))
    if pipeline_uuid is not None:
        results = results.filter(PipelineRun.pipeline_uuid == pipeline_uuid)
    if status is not None:
        results = results.filter(PipelineRun.status == status)

    if order_by:
        arr = []
        for tup in order_by:
            col, asc_desc = tup
            asc_desc = asc_desc.lower()
            pr_col = getattr(PipelineRun, col)
            arr.append(getattr(pr_col, asc_desc)())
        initial_results = results.order_by(*arr)
    else:
        initial_results = \
            results.order_by(PipelineRun.execution_date.desc(), PipelineRun.id.desc())

    results = handler.limit(initial_results)

    collection = [r.to_dict(include_attributes=[
                                'block_runs',
                                'block_runs_count',
                                'pipeline_schedule_name',
                                'pipeline_schedule_token',
                                'pipeline_schedule_type',
                            ])
                  for r in results]

    # If runs from a certain execution date are included in the results, then
    # we want to include all of the attempts for that execution date. We need
    # to do this because the frontend groups retries.
    if handler.get_argument(META_KEY_LIMIT, None) is not None and \
        len(collection) > 0 and \
            (pipeline_uuid is not None or pipeline_schedule_id is not None):

        first_execution_date = results[0].execution_date
        additional_results = \
            initial_results.filter(PipelineRun.execution_date == first_execution_date)
        filter_dates = []
        if additional_results[0].id != results[0].id:
            filter_dates.append(collection[0]['execution_date'])

        last_execution_date = results[results.count() - 1].execution_date
        additional_results = \
            initial_results.filter(PipelineRun.execution_date == last_execution_date)
        addons = [
            r.to_dict(include_attributes=[
                        'block_runs',
                        'block_runs_count',
                        'pipeline_schedule_name',
                        'pipeline_schedule_token',
                        'pipeline_schedule_type',
                    ])
            for r in additional_results
        ]
        filter_dates.append(collection[-1]['execution_date'])
        collection = \
            list(filter(lambda x: x['execution_date'] not in filter_dates, collection)) + addons

    handler.write(dict(
        pipeline_runs=collection,
        total_count=initial_results.count(),
    ))
    handler.finish()


class ApiPipelineRunDetailHandler(BaseDetailHandler):
    model_class = PipelineRun

    @safe_db_query
    def get(self, pipeline_run_id):
        pipeline_run = PipelineRun.query.get(int(pipeline_run_id))
        block_runs = pipeline_run.block_runs

        pipeline_run_dict = pipeline_run.to_dict()
        block_runs_json = []
        for r in block_runs:
            block_run = r.to_dict()
            block_run['pipeline_schedule_id'] = pipeline_run.pipeline_schedule_id
            block_run['pipeline_schedule_name'] = pipeline_run.pipeline_schedule.name
            block_runs_json.append(block_run)
        block_runs_json.sort(key=lambda b: b.get('created_at'))
        pipeline_run_dict['block_runs'] = block_runs_json

        self.write(dict(pipeline_run=pipeline_run_dict))

    @safe_db_query
    def put(self, pipeline_run_id):
        payload = self.get_payload()
        pipeline_run = PipelineRun.query.get(int(pipeline_run_id))

        if payload.get('action') == 'retry_blocks':
            if pipeline_run.status != PipelineRun.PipelineRunStatus.COMPLETED:
                pipeline_run.refresh()
                pipeline = Pipeline.get(pipeline_run.pipeline_uuid)
                incomplete_block_runs = \
                    list(
                        filter(
                            lambda br: br.status != BlockRun.BlockRunStatus.COMPLETED,
                            pipeline_run.block_runs
                        )
                    )
                # Update block run status to INITIAL
                BlockRun.batch_update_status(
                    [b.id for b in incomplete_block_runs],
                    BlockRun.BlockRunStatus.INITIAL,
                )

                from mage_ai.orchestration.execution_process_manager \
                    import execution_process_manager
                if PipelineType.STREAMING != pipeline.type:
                    if PipelineType.INTEGRATION == pipeline.type:
                        execution_process_manager.terminate_pipeline_process(pipeline_run.id)
                    else:
                        for br in incomplete_block_runs:
                            execution_process_manager.terminate_block_process(
                                pipeline_run.id,
                                br.id,
                            )

                pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        elif payload.get('status') == PipelineRun.PipelineRunStatus.CANCELLED:
            from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler
            PipelineScheduler(pipeline_run).stop()
        self.write(dict(pipeline_run=pipeline_run.to_dict()))


class ApiPipelineRunLogHandler(BaseHandler):
    @safe_db_query
    def get(self, pipeline_run_id):
        pipeline_run = PipelineRun.query.get(int(pipeline_run_id))
        self.write(
            dict(
                log=pipeline_run.logs,
            ),
        )
