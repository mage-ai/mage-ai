from .base import (
    META_KEY_LIMIT,
    BaseHandler,
)
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import PipelineRun
from sqlalchemy.orm import selectinload
from typing import List


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


class ApiPipelineRunLogHandler(BaseHandler):
    @safe_db_query
    def get(self, pipeline_run_id):
        pipeline_run = PipelineRun.query.get(int(pipeline_run_id))
        self.write(
            dict(
                log=pipeline_run.logs,
            ),
        )
