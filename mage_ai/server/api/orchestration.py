from .base import BaseHandler
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models import BlockRun, PipelineRun, PipelineSchedule


class ApiBlockRunDetailHandler(BaseHandler):
    model_class = BlockRun

    def put(self, block_run_id):
        payload = self.get_payload()
        # Only allow update block run status
        status = payload.get('status')
        if status is not None:
            block_run = BlockRun.query.get(int(block_run_id))
            if status != block_run.status:
                block_run.update(status=status)
        self.write(dict(block_run=block_run.to_dict()))


class ApiBlockRunListHandler(BaseHandler):
    model_class = BlockRun

    def get(self, pipeline_run_id):
        block_runs = BlockRun.query.filter(
            BlockRun.pipeline_run_id == int(pipeline_run_id),
        ).all()
        collection = [r.to_dict() for r in block_runs]

        self.write(dict(block_runs=collection))
        self.finish()


class ApiBlockRunLogHandler(BaseHandler):
    def get(self, block_run_id):
        block_run = BlockRun.query.get(int(block_run_id))
        self.write(
            dict(
                log=block_run.log_file.to_dict(include_content=True),
            ),
        )


class ApiBlockRunOutputHandler(BaseHandler):
    def get(self, block_run_id):
        block_run = BlockRun.query.get(int(block_run_id))
        outputs = block_run.get_outputs()
        self.write(dict(outputs=outputs))


class ApiPipelineRunListHandler(BaseHandler):
    model_class = PipelineRun

    def get(self, pipeline_schedule_id):
        pipeline_runs = PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id == int(pipeline_schedule_id),
        ).all()
        collection = [r.to_dict() for r in pipeline_runs]

        self.write(dict(pipeline_runs=collection))
        self.finish()

    def post(self, pipeline_schedule_id):
        pipeline_schedule = PipelineSchedule.query.get(int(pipeline_schedule_id))

        payload = self.get_payload()
        payload['pipeline_schedule_id'] = pipeline_schedule.id
        payload['pipeline_uuid'] = pipeline_schedule.pipeline_uuid
        pipeline_run = PipelineRun.create(**payload)

        from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler
        PipelineScheduler(pipeline_run).start()

        self.write(dict(pipeline_run=pipeline_run.to_dict()))


class ApiPipelineRunLogHandler(BaseHandler):
    def get(self, pipeline_run_id):
        pipeline_run = PipelineRun.query.get(int(pipeline_run_id))
        self.write(
            dict(
                log=pipeline_run.log_file.to_dict(include_content=True),
            ),
        )


class ApiPipelineScheduleDetailHandler(BaseHandler):
    datetime_keys = ['start_time']
    model_class = PipelineSchedule

    def get(self, pipeline_schedule_id):
        pipeline_schedule = PipelineSchedule.query.get(int(pipeline_schedule_id))

        self.write(dict(pipeline_schedule=pipeline_schedule.to_dict()))

    def put(self, pipeline_schedule_id):
        pipeline_schedule = PipelineSchedule.query.get(int(pipeline_schedule_id))
        payload = self.get_payload()

        pipeline_schedule.update(**payload)

        self.write(dict(pipeline_schedule=pipeline_schedule.to_dict()))

    def delete(self, pipeline_schedule_id):
        pipeline_schedule = PipelineSchedule.query.get(int(pipeline_schedule_id))
        pipeline_schedule.delete()
        self.write(dict(pipeline_schedule=pipeline_schedule.to_dict()))


class ApiPipelineScheduleListHandler(BaseHandler):
    datetime_keys = ['start_time']
    model_class = PipelineSchedule

    def get(self, pipeline_uuid=None):
        if pipeline_uuid is not None:
            pipeline = Pipeline.get(pipeline_uuid)
            schedules = PipelineSchedule.query.filter(
                PipelineSchedule.pipeline_uuid == pipeline.uuid,
            ).all()
        else:
            schedules = PipelineSchedule.query.all()
        collection = [s.to_dict() for s in schedules]

        self.write(dict(pipeline_schedules=collection))
        self.finish()

    def post(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)

        payload = self.get_payload()
        payload['pipeline_uuid'] = pipeline.uuid
        pipeline_schedule = PipelineSchedule.create(**payload)

        self.write(dict(pipeline_schedule=pipeline_schedule.to_dict()))
