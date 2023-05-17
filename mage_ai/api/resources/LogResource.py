from datetime import datetime
from typing import Dict, List

from sqlalchemy.orm import aliased

from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import META_KEY_LIMIT
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)

MAX_LOG_FILES = 20


class LogResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        parent_model = kwargs['parent_model']

        arr = []
        if type(parent_model) is BlockRun:
            arr = parent_model.logs
        elif issubclass(parent_model.__class__, Pipeline):
            arr = await self.__pipeline_logs(parent_model, query, meta)

        return self.build_result_set(
            arr,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    async def __pipeline_logs(self, pipeline: Pipeline, query_arg, meta) -> List[Dict]:
        pipeline_uuid = pipeline.uuid

        start_timestamp = query_arg.get('start_timestamp', [None])
        if start_timestamp:
            start_timestamp = start_timestamp[0]
        end_timestamp = query_arg.get('end_timestamp', [None])
        if end_timestamp:
            end_timestamp = end_timestamp[0]

        error = ApiError.RESOURCE_INVALID.copy()
        if start_timestamp:
            try:
                start_timestamp = datetime.fromtimestamp(int(start_timestamp))
            except (ValueError, OverflowError):
                error.update(message='Value is invalid for start_timestamp.')
                raise ApiError(error)
        if end_timestamp:
            try:
                end_timestamp = datetime.fromtimestamp(int(end_timestamp))
            except (ValueError, OverflowError):
                error.update(message='Value is invalid for end_timestamp.')
                raise ApiError(error)

        pipeline_schedule_ids = query_arg.get('pipeline_schedule_id[]', [None])
        if pipeline_schedule_ids:
            pipeline_schedule_ids = pipeline_schedule_ids[0]
        if pipeline_schedule_ids:
            pipeline_schedule_ids = pipeline_schedule_ids.split(',')
        else:
            pipeline_schedule_ids = []

        block_uuids = query_arg.get('block_uuid[]', [None])
        if block_uuids:
            block_uuids = block_uuids[0]
        if block_uuids:
            block_uuids = block_uuids.split(',')
        else:
            block_uuids = []

        pipeline_run_ids = query_arg.get('pipeline_run_id[]', [None])
        if pipeline_run_ids:
            pipeline_run_ids = pipeline_run_ids[0]
        if pipeline_run_ids:
            pipeline_run_ids = pipeline_run_ids.split(',')
        else:
            pipeline_run_ids = []

        block_run_ids = query_arg.get('block_run_id[]', [None])
        if block_run_ids:
            block_run_ids = block_run_ids[0]
        if block_run_ids:
            block_run_ids = block_run_ids.split(',')
        else:
            block_run_ids = []

        a = aliased(PipelineRun, name='a')
        b = aliased(PipelineSchedule, name='b')
        c = aliased(BlockRun, name='c')

        columns = [
            a.execution_date,
            a.pipeline_schedule_id,
            a.pipeline_schedule_id,
            a.pipeline_uuid,
            a.variables,
        ]

        total_pipeline_run_log_count = 0
        pipeline_run_logs = []

        @safe_db_query
        def get_pipeline_runs():
            query = (
                PipelineRun.
                select(*columns).
                join(b, a.pipeline_schedule_id == b.id).
                filter(b.pipeline_uuid == pipeline_uuid).
                order_by(a.created_at.desc())
            )

            if len(pipeline_schedule_ids):
                query = (
                    query.
                    filter(a.pipeline_schedule_id.in_(pipeline_schedule_ids))
                )

            if len(pipeline_run_ids):
                query = (
                    query.
                    filter(a.id.in_(pipeline_run_ids))
                )

            if start_timestamp:
                query = (
                    query.
                    filter(a.execution_date >= start_timestamp)
                )

            if end_timestamp:
                query = (
                    query.
                    filter(a.execution_date <= end_timestamp)
                )
            total_pipeline_run_log_count = query.count()
            if meta.get(META_KEY_LIMIT, None) is not None:
                rows = query.limit(meta[META_KEY_LIMIT])
            else:
                rows = query.all()
            return dict(
                total_pipeline_run_log_count=total_pipeline_run_log_count,
                rows=rows,
            )

        if not len(block_uuids) and not len(block_run_ids):
            pipeline_run_results = get_pipeline_runs()
            total_pipeline_run_log_count = pipeline_run_results['total_pipeline_run_log_count']
            pipeline_run_rows = pipeline_run_results['rows']

            processed_pipeline_run_log_files = set()
            for row in pipeline_run_rows:
                model = PipelineRun()
                model.execution_date = row.execution_date
                model.pipeline_schedule_id = row.pipeline_schedule_id
                model.pipeline_uuid = row.pipeline_uuid
                model.variables = row.variables
                logs = await model.logs_async()
                pipeline_log_file_path = logs.get('path')
                if pipeline_log_file_path not in processed_pipeline_run_log_files:
                    pipeline_run_logs.append(logs)
                    processed_pipeline_run_log_files.add(pipeline_log_file_path)
                if len(pipeline_run_logs) >= MAX_LOG_FILES:
                    break

        @safe_db_query
        def get_block_runs():
            query = (
                BlockRun.
                select(*(columns + [
                    c.block_uuid,
                ])).
                join(a, a.id == c.pipeline_run_id).
                join(b, a.pipeline_schedule_id == b.id).
                filter(b.pipeline_uuid == pipeline_uuid).
                order_by(c.started_at.desc())
            )

            if len(block_uuids):
                query = (
                    query.
                    filter(c.block_uuid.in_(block_uuids))
                )

            if len(block_run_ids):
                query = (
                    query.
                    filter(c.id.in_(block_run_ids))
                )

            if len(pipeline_schedule_ids):
                query = (
                    query.
                    filter(a.pipeline_schedule_id.in_(pipeline_schedule_ids))
                )

            if len(pipeline_run_ids):
                query = (
                    query.
                    filter(a.id.in_(pipeline_run_ids))
                )

            if start_timestamp:
                query = (
                    query.
                    filter(a.execution_date >= start_timestamp)
                )

            if end_timestamp:
                query = (
                    query.
                    filter(a.execution_date <= end_timestamp)
                )

            if meta.get(META_KEY_LIMIT, None) is not None:
                rows = query.limit(meta[META_KEY_LIMIT])
            else:
                rows = query.all()

            total_block_run_log_count = query.count()
            return dict(
                total_block_run_log_count=total_block_run_log_count,
                rows=rows,
            )

        block_run_results = get_block_runs()
        total_block_run_log_count = block_run_results['total_block_run_log_count']
        rows = block_run_results['rows']

        block_run_logs = []

        processed_block_run_log_files = set()
        for row in rows:
            model = PipelineRun()
            model.execution_date = row.execution_date
            model.pipeline_schedule_id = row.pipeline_schedule_id
            model.pipeline_uuid = row.pipeline_uuid
            model.variables = row.variables

            model2 = BlockRun()
            model2.block_uuid = row.block_uuid
            model2.pipeline_run = model

            logs = await model2.logs_async()
            block_log_file_path = logs.get('path')
            if block_log_file_path not in processed_block_run_log_files:
                block_run_logs.append(logs)
                processed_block_run_log_files.add(block_log_file_path)

            if len(block_run_logs) >= MAX_LOG_FILES:
                break

        return [
            dict(
                block_run_logs=block_run_logs,
                pipeline_run_logs=pipeline_run_logs,
                total_block_run_log_count=total_block_run_log_count,
                total_pipeline_run_log_count=total_pipeline_run_log_count,
            ),
        ]
