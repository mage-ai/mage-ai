from sqlalchemy.orm import selectinload

from mage_ai.api.operations.constants import META_KEY_LIMIT, META_KEY_OFFSET
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.api.utils import get_query_timestamps
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.orchestration.pipeline_scheduler import (
    configure_pipeline_run_payload,
    start_scheduler,
    stop_pipeline_run,
)


class PipelineRunResource(DatabaseResource):
    datetime_keys = ['execution_date']
    model_class = PipelineRun

    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        pipeline_schedule_id = None
        parent_model = kwargs.get('parent_model')
        if parent_model:
            pipeline_schedule_id = parent_model.id

        start_timestamp, end_timestamp = get_query_timestamps(query_arg)
        backfill_id = query_arg.get('backfill_id', [None])
        if backfill_id:
            backfill_id = backfill_id[0]

        pipeline_uuid = query_arg.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]

        status = query_arg.get('status', [None])
        if status:
            status = status[0]

        order_by_arg = query_arg.get('order_by[]', [None])
        if order_by_arg:
            order_by_arg = order_by_arg[0]

        order_by = None
        if order_by_arg:
            order_by = []
            for s in order_by_arg.split(','):
                parts = s.strip().split(' ')
                if len(parts) >= 2:
                    order_by.append((parts[0], parts[1]))
                else:
                    order_by.append((parts[0], 'asc'))

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
        if start_timestamp is not None:
            results = results.filter(PipelineRun.created_at >= start_timestamp)
        if end_timestamp is not None:
            results = results.filter(PipelineRun.created_at <= end_timestamp)

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

        return initial_results

    @classmethod
    @safe_db_query
    async def process_collection(self, query_arg, meta, user, **kwargs):
        total_results = self.collection(query_arg, meta, user, **kwargs)
        total_count = total_results.count()

        limit = int(meta.get(META_KEY_LIMIT, self.DEFAULT_LIMIT))
        offset = int(meta.get(META_KEY_OFFSET, 0))

        pipeline_type = query_arg.get('pipeline_type', [None])
        if pipeline_type:
            pipeline_type = pipeline_type[0]

        if pipeline_type is not None:
            pipeline_type_by_pipeline_uuid = dict()
            try:
                pipeline_runs = total_results.all()
                results = []
                for run in pipeline_runs:
                    if run.pipeline_uuid not in pipeline_type_by_pipeline_uuid:
                        pipeline_type_by_pipeline_uuid[run.pipeline_uuid] = run.pipeline_type
                    run_pipeline_type = pipeline_type_by_pipeline_uuid[run.pipeline_uuid]
                    if run_pipeline_type == pipeline_type:
                        results.append(run)
                total_count = len(results)
                results = results[offset:(offset + limit)]
            except Exception as err:
                print('ERROR filtering pipeline runs:', err)
                results = total_results.limit(limit + 1).offset(offset).all()
        else:
            results = total_results.limit(limit + 1).offset(offset).all()

        pipeline_schedule_id = None
        parent_model = kwargs.get('parent_model')
        if parent_model:
            pipeline_schedule_id = parent_model.id

        pipeline_uuid = query_arg.get('pipeline_uuid', [None])
        if pipeline_uuid:
            pipeline_uuid = pipeline_uuid[0]

        if meta.get(META_KEY_LIMIT, None) is not None and \
            total_results.count() >= 1 and \
                (pipeline_uuid is not None or pipeline_schedule_id is not None):

            first_result = results[0]
            first_execution_date = first_result.execution_date
            additional_results = total_results.filter(
                PipelineRun.execution_date == first_execution_date,
            )
            first_additional_results = additional_results.first()
            filter_dates = []
            if first_additional_results.id != first_result.id:
                filter_dates.append(first_execution_date)

            last_result = results[-1]
            last_execution_date = last_result.execution_date
            additional_results = total_results.filter(
                PipelineRun.execution_date == last_execution_date,
            )
            filter_dates.append(last_result.execution_date)
            results = list(
                filter(
                    lambda x: x.execution_date not in filter_dates,
                    results,
                ),
            ) + additional_results.all()

        results_size = len(results)
        has_next = results_size > limit
        final_end_idx = results_size - 1 if has_next else results_size

        result_set = self.build_result_set(
            results[0:final_end_idx],
            user,
            **kwargs,
        )

        result_set.metadata = {
            'count': total_count,
            'next': has_next,
        }

        return result_set

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        pipeline_schedule = kwargs.get('parent_model')

        pipeline = Pipeline.get(pipeline_schedule.pipeline_uuid)
        configured_payload, _ = configure_pipeline_run_payload(
            pipeline_schedule,
            pipeline.type,
            payload,
        )

        def _create_callback(resource):
            pipeline_run = resource.model
            start_scheduler(pipeline_run)

        self.on_create_callback = _create_callback

        return super().create(configured_payload, user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        if 'retry_blocks' == payload.get('pipeline_run_action'):
            self.model.refresh()
            pipeline = Pipeline.get(self.model.pipeline_uuid)
            block_runs_to_retry = []
            from_block_uuid = payload.get('from_block_uuid')
            if from_block_uuid is not None:
                is_integration = pipeline.type == PipelineType.INTEGRATION
                if is_integration:
                    from_block = pipeline.block_from_block_uuid_with_stream(from_block_uuid)
                else:
                    from_block = pipeline.blocks_by_uuid.get(from_block_uuid)

                if from_block:
                    downstream_blocks = from_block.get_all_downstream_blocks()
                    if is_integration:
                        block_uuid_suffix = from_block_uuid[len(from_block.uuid):]
                        downstream_block_uuids = [from_block_uuid] + \
                            [f'{b.uuid}{block_uuid_suffix}' for b in downstream_blocks]
                    else:
                        downstream_block_uuids = [from_block_uuid] + \
                            [b.uuid for b in downstream_blocks]

                    block_runs_to_retry = \
                        list(
                            filter(
                                lambda br: br.block_uuid in downstream_block_uuids,
                                self.model.block_runs
                            )
                        )
            elif PipelineRun.PipelineRunStatus.COMPLETED != self.model.status:
                block_runs_to_retry = \
                    list(
                        filter(
                            lambda br: br.status != BlockRun.BlockRunStatus.COMPLETED,
                            self.model.block_runs
                        )
                    )

            # Update block run status to INITIAL
            BlockRun.batch_update_status(
                [b.id for b in block_runs_to_retry],
                BlockRun.BlockRunStatus.INITIAL,
            )

            from mage_ai.orchestration.execution_process_manager import (
                execution_process_manager,
            )

            if PipelineType.STREAMING != pipeline.type:
                if PipelineType.INTEGRATION == pipeline.type:
                    execution_process_manager.terminate_pipeline_process(self.model.id)
                else:
                    for br in block_runs_to_retry:
                        execution_process_manager.terminate_block_process(
                            self.model.id,
                            br.id,
                        )

            return super().update(dict(status=PipelineRun.PipelineRunStatus.RUNNING))
        elif PipelineRun.PipelineRunStatus.CANCELLED == payload.get('status'):
            pipeline = Pipeline.get(
                self.model.pipeline_uuid,
                check_if_exists=True,
            )

            stop_pipeline_run(self.model, pipeline)

        return self
