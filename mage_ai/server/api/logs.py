from mage_ai.orchestration.db.models import BlockRun, PipelineRun, PipelineSchedule
from mage_ai.server.api.base import BaseHandler
from sqlalchemy.orm import aliased


class ApiPipelineLogListHandler(BaseHandler):
    def get(self, pipeline_uuid):
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
            filter(b.pipeline_uuid == pipeline_uuid)
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

        pipeline_run_logs = []
        if not len(block_uuids) and not len(block_run_ids):
            rows = query.all()
            for row in rows:
                model = PipelineRun()
                model.execution_date = row.execution_date
                model.pipeline_schedule_id = row.pipeline_schedule_id
                model.pipeline_schedule_id = row.pipeline_schedule_id
                model.pipeline_uuid = row.pipeline_uuid

                pipeline_run_logs.append(model.log_file.to_dict(include_content=True))

        c = aliased(BlockRun, name='c')
        query = (
            BlockRun.
            select(*(columns + [
                c.block_uuid,
            ])).
            join(a, a.id == c.pipeline_run_id).
            join(b, a.pipeline_schedule_id == b.id).
            filter(b.pipeline_uuid == pipeline_uuid)
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

        rows = query.all()
        block_run_logs = []
        for row in rows:
            model = PipelineRun()
            model.execution_date = row.execution_date
            model.pipeline_schedule_id = row.pipeline_schedule_id
            model.pipeline_schedule_id = row.pipeline_schedule_id
            model.pipeline_uuid = row.pipeline_uuid

            model2 = BlockRun()
            model2.block_uuid = row.block_uuid
            model2.pipeline_run = model

            block_run_logs.append(model2.log_file.to_dict(include_content=True))

        self.write(dict(logs=[
            dict(
                block_run_logs=block_run_logs,
                pipeline_run_logs=pipeline_run_logs,
            ),
        ]))
