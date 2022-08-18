from .base import BaseHandler
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models import BlockRun, PipelineRun, PipelineSchedule


class ApiBlockRunListHandler(BaseHandler):
    model_class = BlockRun

    def get(self, pipeline_run_id):
        block_runs = BlockRun.query.filter(
            BlockRun.pipeline_run_id == int(pipeline_run_id),
        ).all()
        collection = [r.to_dict() for r in block_runs]

        self.write(dict(block_runs=collection))
        self.finish()


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


class ApiPipelineScheduleDetailHandler(BaseHandler):
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
