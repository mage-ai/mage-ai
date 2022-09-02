from mage_ai.orchestration.db.models import BlockRun, PipelineRun, PipelineSchedule
from mage_ai.server.api.base import BaseHandler
from sqlalchemy.orm import aliased


class ApiPipelineLogListHandler(BaseHandler):
    def get(self, pipeline_uuid):
        pipeline_schedule_id = self.get_argument('pipeline_schedule_id', None)
        pipeline_run_id = self.get_argument('pipeline_run_id', None)
        block_uuid = self.get_argument('block_uuid', None)
        block_uuids = self.get_argument('block_uuid[]', None)
        if block_uuids:
            block_uuids = block_uuids.split(',')
        else:
            block_uuids = []
        block_run_id = self.get_argument('block_run_id', None)

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

        if pipeline_schedule_id:
            query = (
                query.
                filter(a.pipeline_schedule_id == int(pipeline_schedule_id))
            )

        if pipeline_run_id:
            query = (
                query.
                filter(a.id == int(pipeline_run_id))
            )

        pipeline_run_logs = []
        if not block_uuid and not len(block_uuids):
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

        if block_uuid:
            query = (
                query.
                filter(c.block_uuid == block_uuid)
            )

        if len(block_uuids):
            query = (
                query.
                filter(c.block_uuid.in_(block_uuids))
            )

        if block_run_id:
            query = (
                query.
                filter(c.id == int(block_run_id))
            )

        if pipeline_schedule_id:
            query = (
                query.
                filter(a.pipeline_schedule_id == int(pipeline_schedule_id))
            )

        if pipeline_run_id:
            query = (
                query.
                filter(a.id == int(pipeline_run_id))
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
