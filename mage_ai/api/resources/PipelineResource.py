import asyncio

from sqlalchemy.orm import aliased

from mage_ai.api.operations.constants import DELETE
from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.data_preparation.models.block.dbt.utils import (
    add_blocks_upstream_from_refs,
)
from mage_ai.data_preparation.models.constants import PipelineStatus
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import ScheduleStatus
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.pipeline_scheduler import (
    PipelineScheduler,
    retry_pipeline_run,
)
from mage_ai.server.active_kernel import switch_active_kernel
from mage_ai.server.kernels import PIPELINE_TO_KERNEL_NAME
from mage_ai.shared.hash import group_by, ignore_keys
from mage_ai.usage_statistics.logger import UsageStatisticLogger


class PipelineResource(BaseResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        include_schedules = query.get('include_schedules', [False])
        if include_schedules:
            include_schedules = include_schedules[0]

        pipeline_types = query.get('type[]', [])
        if pipeline_types:
            pipeline_types = pipeline_types[0]
        if pipeline_types:
            pipeline_types = pipeline_types.split(',')

        pipeline_statuses = query.get('status[]', [])
        if pipeline_statuses:
            pipeline_statuses = pipeline_statuses[0]
        if pipeline_statuses:
            pipeline_statuses = pipeline_statuses.split(',')

        pipeline_uuids = Pipeline.get_all_pipelines(get_repo_path())

        await UsageStatisticLogger().pipelines_impression(lambda: len(pipeline_uuids))

        async def get_pipeline(uuid):
            try:
                return await Pipeline.get_async(uuid)
            except Exception as err:
                err_message = f'Error loading pipeline {uuid}: {err}.'
                if err.__class__.__name__ == 'OSError' and 'Too many open files' in err.strerror:
                    raise Exception(err_message)
                else:
                    print(err_message)
                    return None

        pipelines = await asyncio.gather(
            *[get_pipeline(uuid) for uuid in pipeline_uuids]
        )
        pipelines = [p for p in pipelines if p is not None]

        @safe_db_query
        def query_pipeline_schedules(pipeline_uuids):
            a = aliased(PipelineSchedule, name='a')
            result = (
                PipelineSchedule.
                select(*[
                    a.created_at,
                    a.id,
                    a.name,
                    a.pipeline_uuid,
                    a.schedule_interval,
                    a.schedule_type,
                    a.start_time,
                    a.status,
                    a.updated_at,
                ]).
                filter(
                    a.pipeline_uuid.in_(pipeline_uuids),
                    a.repo_path == get_repo_path(),
                )
            ).all()
            return group_by(lambda x: x.pipeline_uuid, result)

        mapping = {}
        if include_schedules:
            mapping = query_pipeline_schedules(pipeline_uuids)
        if pipeline_types:
            pipelines = [p for p in pipelines if p.type in pipeline_types]

        filtered_pipelines = []
        for pipeline in pipelines:
            schedules = []
            if mapping.get(pipeline.uuid):
                schedules = mapping[pipeline.uuid]
            pipeline.schedules = schedules

            if pipeline_statuses and (
                (PipelineStatus.ACTIVE in pipeline_statuses and
                    any(s.status == ScheduleStatus.ACTIVE
                        for s in pipeline.schedules)) or
                (PipelineStatus.INACTIVE in pipeline_statuses and
                    len(pipeline.schedules) > 0 and
                    all(s.status == ScheduleStatus.INACTIVE
                        for s in pipeline.schedules)) or
                (PipelineStatus.NO_SCHEDULES in pipeline_statuses and
                    len(pipeline.schedules) == 0)
            ):
                filtered_pipelines.append(pipeline)

        if include_schedules and pipeline_statuses:
            pipelines = filtered_pipelines

        return self.build_result_set(
            pipelines,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        clone_pipeline_uuid = payload.get('clone_pipeline_uuid')
        name = payload.get('name')
        pipeline_type = payload.get('type')

        if clone_pipeline_uuid is None:
            pipeline = Pipeline.create(
                name,
                pipeline_type=pipeline_type,
                repo_path=get_repo_path(),
            )
        else:
            source = Pipeline.get(clone_pipeline_uuid)
            pipeline = Pipeline.duplicate(source, name)

        return self(pipeline, user, **kwargs)

    @classmethod
    @safe_db_query
    async def get_model(self, pk):
        return await Pipeline.get_async(pk)

    @classmethod
    @safe_db_query
    async def member(self, pk, user, **kwargs):
        pipeline = await Pipeline.get_async(pk)

        if kwargs.get('api_operation_action', None) != DELETE:
            switch_active_kernel(PIPELINE_TO_KERNEL_NAME[pipeline.type])

        return self(pipeline, user, **kwargs)

    @safe_db_query
    def delete(self, **kwargs):
        return self.model.delete()

    @safe_db_query
    async def update(self, payload, **kwargs):
        if 'add_upstream_for_block_uuid' in payload:
            block_uuid = payload['add_upstream_for_block_uuid']
            block = self.model.get_block(block_uuid, widget=False)
            arr = add_blocks_upstream_from_refs(block)
            upstream_block_uuids = [b.uuid for b in arr]

            for b in block.upstream_blocks:
                upstream_block_uuids.append(b.uuid)

            self.model.add_block(
                block,
                upstream_block_uuids,
                priority=len(upstream_block_uuids),
                widget=False,
            )

            return self

        query = kwargs.get('query', {})
        update_content = query.get('update_content', [False])
        if update_content:
            update_content = update_content[0]

        await self.model.update(
            ignore_keys(payload, ['add_upstream_for_block_uuid']),
            update_content=update_content,
        )
        switch_active_kernel(PIPELINE_TO_KERNEL_NAME[self.model.type])

        @safe_db_query
        def update_schedule_status(status, pipeline_uuid):
            schedules = (
                PipelineSchedule.
                query.
                filter(PipelineSchedule.pipeline_uuid == pipeline_uuid)
            ).all()
            for schedule in schedules:
                schedule.update(status=status)

        @safe_db_query
        def cancel_pipeline_runs(status, pipeline_uuid):
            pipeline_runs = (
                PipelineRun.
                query.
                filter(PipelineRun.pipeline_uuid == pipeline_uuid).
                filter(PipelineRun.status.in_([
                    PipelineRun.PipelineRunStatus.INITIAL,
                    PipelineRun.PipelineRunStatus.RUNNING,
                ]))
            )
            for pipeline_run in pipeline_runs:
                PipelineScheduler(pipeline_run).stop()

        def retry_pipeline_runs(pipeline_runs):
            for run in pipeline_runs:
                retry_pipeline_run(run)

        status = payload.get('status')
        pipeline_uuid = self.model.uuid

        def _update_callback(resource):
            if status:
                if status in [
                    ScheduleStatus.ACTIVE.value,
                    ScheduleStatus.INACTIVE.value,
                ]:
                    update_schedule_status(status, pipeline_uuid)
                elif status == PipelineRun.PipelineRunStatus.CANCELLED.value:
                    cancel_pipeline_runs(status, pipeline_uuid)
                elif status == 'retry' and payload.get('pipeline_runs'):
                    retry_pipeline_runs(payload.get('pipeline_runs'))

        self.on_update_callback = _update_callback

        return self
