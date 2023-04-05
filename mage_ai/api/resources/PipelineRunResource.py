from datetime import datetime
from mage_ai.api.operations.constants import META_KEY_LIMIT, META_KEY_OFFSET
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.data_integrations.utils.scheduler import initialize_state_and_runs
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.orchestration.pipeline_scheduler import get_variables, stop_pipeline_run
from sqlalchemy.orm import selectinload


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

        if 'variables' not in payload:
            payload['variables'] = {}

        payload['pipeline_schedule_id'] = pipeline_schedule.id
        payload['pipeline_uuid'] = pipeline_schedule.pipeline_uuid
        if payload.get('execution_date') is None:
            payload['execution_date'] = datetime.utcnow()

        is_integration = PipelineType.INTEGRATION == pipeline.type
        if is_integration:
            payload['create_block_runs'] = False

        def _create_callback(resource):
            from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler

            pipeline_run = resource.model
            pipeline_scheduler = PipelineScheduler(pipeline_run)

            if is_integration:
                initialize_state_and_runs(
                    pipeline_run,
                    pipeline_scheduler.logger,
                    get_variables(pipeline_run),
                )
            else:
                pipeline_run.create_block_runs()

            pipeline_scheduler.start(should_schedule=False)

        self.on_create_callback = _create_callback

        return super().create(payload, user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        if 'retry_blocks' == payload.get('pipeline_run_action') and \
                PipelineRun.PipelineRunStatus.COMPLETED != self.model.status:
            self.model.refresh()

            pipeline = Pipeline.get(self.model.pipeline_uuid)

            incomplete_block_runs = \
                list(
                    filter(
                        lambda br: br.status != BlockRun.BlockRunStatus.COMPLETED,
                        self.model.block_runs
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
                    execution_process_manager.terminate_pipeline_process(self.model.id)
                else:
                    for br in incomplete_block_runs:
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
