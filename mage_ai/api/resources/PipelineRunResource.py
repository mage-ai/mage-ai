from sqlalchemy import and_, desc, func
from sqlalchemy.orm import selectinload

from mage_ai.api.operations.constants import META_KEY_LIMIT, META_KEY_OFFSET
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.api.utils import get_query_timestamps
from mage_ai.cache.tag import TagCache
from mage_ai.data_preparation.models.block.utils import get_all_descendants
from mage_ai.data_preparation.models.constants import (
    PIPELINE_RUN_STATUS_LAST_RUN_FAILED,
    PipelineType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
)
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.orchestration.pipeline_scheduler import (
    configure_pipeline_run_payload,
    stop_pipeline_run,
)
from mage_ai.settings.repo import get_repo_path


class PipelineRunResource(DatabaseResource):
    datetime_keys = ['execution_date']
    model_class = PipelineRun

    @classmethod
    @safe_db_query
    async def collection(self, query_arg, meta, user, **kwargs):
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
        pipeline_uuids = query_arg.get('pipeline_uuid[]', [])
        if pipeline_uuids:
            pipeline_uuids = pipeline_uuids[0]
        if pipeline_uuids:
            pipeline_uuids = pipeline_uuids.split(',')

        global_data_product_uuid = query_arg.get('global_data_product_uuid', [None])
        if global_data_product_uuid:
            global_data_product_uuid = global_data_product_uuid[0]

        status = query_arg.get('status', [None])
        if status:
            status = status[0]
        statuses = query_arg.get('status[]', [])
        if statuses:
            statuses = statuses[0]
        if statuses:
            statuses = statuses.split(',')

        pipeline_tags = query_arg.get('pipeline_tag[]', [None])
        pipeline_uuids_with_tags = []
        if pipeline_tags:
            pipeline_tags = pipeline_tags[0]
        if pipeline_tags:
            pipeline_tags = pipeline_tags.split(',')

            await TagCache.initialize_cache()

            pipeline_tag_cache = TagCache()
            pipeline_uuids_with_tags = pipeline_tag_cache.get_pipeline_uuids_with_tags(
                pipeline_tags,
            )

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

        repo_pipeline_schedule_ids = [s.id for s in PipelineSchedule.repo_query]

        if status == PIPELINE_RUN_STATUS_LAST_RUN_FAILED:
            """
            The initial query below is used to get the last pipeline run retry
            (or individual pipeline run if there are no retries) for each
            grouping of pipeline runs with the same execution_date,
            pipeline_uuid, and pipeline_schedule_id.
            """
            latest_pipeline_runs = PipelineRun.select(
                PipelineRun.id,
                func.row_number()
                    .over(
                        partition_by=(
                            PipelineRun.execution_date,
                            PipelineRun.pipeline_schedule_id,
                            PipelineRun.pipeline_uuid,
                        ),
                        order_by=desc(PipelineRun.id))
                    .label('row_number')
            ).cte(name='latest_pipeline_runs')
            query = (PipelineRun.select(
                    PipelineRun,
                )
                .join(latest_pipeline_runs, and_(
                    PipelineRun.id == latest_pipeline_runs.c.id,
                    latest_pipeline_runs.c.row_number == 1,
                ))
            )
        else:
            query = PipelineRun.query

        results = (
            query
            .filter(PipelineRun.pipeline_schedule_id.in_(repo_pipeline_schedule_ids))
            .options(selectinload(PipelineRun.block_runs))
            .options(selectinload(PipelineRun.pipeline_schedule))
            .join(PipelineSchedule, PipelineRun.pipeline_schedule_id == PipelineSchedule.id)
        )

        if global_data_product_uuid is not None:
            results = results.filter(
                PipelineSchedule.global_data_product_uuid == global_data_product_uuid,
            )
        else:
            results = results.filter(PipelineSchedule.global_data_product_uuid.is_(None))

        if backfill_id is not None:
            results = results.filter(PipelineRun.backfill_id == int(backfill_id))
        if pipeline_schedule_id is not None:
            results = results.filter(PipelineRun.pipeline_schedule_id == int(pipeline_schedule_id))
        if pipeline_uuid is not None:
            results = results.filter(PipelineRun.pipeline_uuid == pipeline_uuid)
        if pipeline_uuids:
            results = results.filter(PipelineRun.pipeline_uuid.in_(pipeline_uuids))
        if pipeline_uuids_with_tags:
            results = results.filter(PipelineRun.pipeline_uuid.in_(pipeline_uuids_with_tags))

        if status == PIPELINE_RUN_STATUS_LAST_RUN_FAILED:
            results = results.filter(PipelineRun.status == PipelineRun.PipelineRunStatus.FAILED)
        elif status is not None:
            results = results.filter(PipelineRun.status == status)

        if statuses:
            results = results.filter(PipelineRun.status.in_(statuses))
        if start_timestamp is not None:
            results = results.filter(PipelineRun.created_at >= start_timestamp)
        if end_timestamp is not None:
            results = results.filter(PipelineRun.created_at <= end_timestamp)

        limit = int((meta or {}).get(META_KEY_LIMIT, self.DEFAULT_LIMIT))

        # No need to order the results if limit is 0
        if limit == 0:
            return results

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
        total_results = await self.collection(query_arg, meta, user, **kwargs)
        total_count = total_results.count()

        limit = int((meta or {}).get(META_KEY_LIMIT, self.DEFAULT_LIMIT))
        offset = int((meta or {}).get(META_KEY_OFFSET, 0))

        include_pipeline_uuids = query_arg.get('include_pipeline_uuids', [False])
        if include_pipeline_uuids:
            include_pipeline_uuids = include_pipeline_uuids[0]

        pipeline_type = query_arg.get('pipeline_type', [None])
        if pipeline_type:
            pipeline_type = pipeline_type[0]

        if pipeline_type is not None:
            try:
                pipeline_type_by_pipeline_uuid = dict()
                pipeline_runs = total_results.all()
                results = []
                for run in pipeline_runs:
                    filters = []

                    # Check pipeline_type of pipeline runs if filtering by pipeline type
                    if run.pipeline_uuid not in pipeline_type_by_pipeline_uuid:
                        pipeline_type_by_pipeline_uuid[run.pipeline_uuid] = run.pipeline_type
                    run_pipeline_type = pipeline_type_by_pipeline_uuid[run.pipeline_uuid]
                    filters.append(run_pipeline_type == pipeline_type)

                    # Multiple filters can be added while iterating through pipeline_runs once
                    if all(filters):
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

        disable_retries_grouping = query_arg.get('disable_retries_grouping', [False])
        if disable_retries_grouping:
            disable_retries_grouping = disable_retries_grouping[0]
        """
        The if block below groups pipeline runs that have the same execution_date with
        its retries so that all of a run's retries may be returned in the same payload.
        In order to disable this functionality, we add the "disable_retries_grouping"
        query arg and set it to True (e.g. in order to make the number of pipeline runs
        returned consistent across pages).
        """
        if limit is not None and limit != 0 and total_count >= 1 and \
            not disable_retries_grouping and \
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

        # Expire pipeline runs that are in progress so that the latest status is returned
        # the next time they are fetched.
        for run in results:
            if run.status in (
                PipelineRun.PipelineRunStatus.RUNNING,
                PipelineRun.PipelineRunStatus.INITIAL,
            ):
                db_connection.session.expire(run)

        result_set = self.build_result_set(
            results[0:final_end_idx],
            user,
            **kwargs,
        )

        result_set.metadata = {
            'count': total_count,
            'next': has_next,
        }

        if include_pipeline_uuids:
            pipeline_uuids = Pipeline.get_all_pipelines_all_projects(get_repo_path())
            result_set.metadata['pipeline_uuids'] = pipeline_uuids

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
            schedule = PipelineSchedule.get(
                resource.pipeline_schedule_id,
            )
            if schedule and \
                schedule.status == ScheduleStatus.INACTIVE and \
                schedule.schedule_type == ScheduleType.TIME and \
                    schedule.schedule_interval == ScheduleInterval.ONCE:
                schedule.update(status=ScheduleStatus.ACTIVE)

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
                    from_block = pipeline.get_block(from_block_uuid)

                if from_block:
                    descendants = [b.uuid for b in get_all_descendants(from_block)]
                    block_runs_to_retry = []
                    for block_run in self.model.block_runs:
                        block2 = pipeline.get_block(block_run.block_uuid)
                        if block2.uuid in descendants or block2.uuid == from_block.uuid:
                            block_runs_to_retry.append(block_run)
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

    @safe_db_query
    def delete(self, **kwargs):
        block_runs = self.model.block_runs
        block_run_ids = [br.id for br in block_runs]
        BlockRun.batch_delete(block_run_ids)
        self.model.delete()
