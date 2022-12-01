from .base import META_KEY_LIMIT
from datetime import datetime

from mage_ai.orchestration.db.models import BlockRun, PipelineRun, PipelineSchedule
from mage_ai.server.api.base import BaseHandler
from sqlalchemy.orm import aliased

MAX_LOG_FILES = 20


class ApiPipelineLogListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        start_timestamp = self.get_argument('start_timestamp', None)
        end_timestamp = self.get_argument('end_timestamp', None)
        if start_timestamp:
            try:
                start_timestamp = datetime.fromtimestamp(int(start_timestamp))
            except (ValueError, OverflowError):
                raise Exception(f'Value is invalid for start_timestamp')
        if end_timestamp:
            try:
                end_timestamp = datetime.fromtimestamp(int(end_timestamp))
            except (ValueError, OverflowError):
                raise Exception(f'Value is invalid for end_timestamp')

        pipeline_schedule_ids = self.get_argument('pipeline_schedule_id[]', None)
        if pipeline_schedule_ids:
            pipeline_schedule_ids = pipeline_schedule_ids.split(',')
        else:
            pipeline_schedule_ids = []

        block_uuids = self.get_argument('block_uuid[]', None)
        if block_uuids:
            block_uuids = block_uuids.split(',')
        else:
            block_uuids = []

        pipeline_run_ids = self.get_argument('pipeline_run_id[]', None)
        if pipeline_run_ids:
            pipeline_run_ids = pipeline_run_ids.split(',')
        else:
            pipeline_run_ids = []

        block_run_ids = self.get_argument('block_run_id[]', None)
        if block_run_ids:
            block_run_ids = block_run_ids.split(',')
        else:
            block_run_ids = []

        a = aliased(PipelineRun, name='a')
        b = aliased(PipelineSchedule, name='b')

        columns = [
            a.execution_date,
            a.pipeline_schedule_id,
            a.pipeline_schedule_id,
            a.pipeline_uuid,
        ]

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

        total_pipeline_run_log_count = 0
        pipeline_run_logs = []
        if not len(block_uuids) and not len(block_run_ids):
            total_pipeline_run_log_count = query.count()
            if self.get_argument(META_KEY_LIMIT, None) is not None:
                rows = self.limit(query)
            else:
                rows = query.all()

            for row in rows:
                model = PipelineRun()
                model.execution_date = row.execution_date
                model.pipeline_schedule_id = row.pipeline_schedule_id
                model.pipeline_uuid = row.pipeline_uuid

                pipeline_run_logs.append(model.logs)
                if len(pipeline_run_logs) >= MAX_LOG_FILES:
                    break

        c = aliased(BlockRun, name='c')
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

        if self.get_argument(META_KEY_LIMIT, None) is not None:
            rows = self.limit(query)
        else:
            rows = query.all()

        total_block_run_log_count = query.count()
        block_run_logs = []

        for row in rows:
            model = PipelineRun()
            model.execution_date = row.execution_date
            model.pipeline_schedule_id = row.pipeline_schedule_id
            model.pipeline_uuid = row.pipeline_uuid

            model2 = BlockRun()
            model2.block_uuid = row.block_uuid
            model2.pipeline_run = model

            block_run_logs.append(model2.logs)

            if len(block_run_logs) >= MAX_LOG_FILES:
                break

        self.write(dict(logs=[
            dict(
                block_run_logs=block_run_logs,
                pipeline_run_logs=pipeline_run_logs,
                total_block_run_log_count=total_block_run_log_count,
                total_pipeline_run_log_count=total_pipeline_run_log_count,
            ),
        ]))
