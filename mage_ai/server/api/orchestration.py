from .base import BaseHandler
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models import PipelineSchedule


class ApiPipelineScheduleDetailHandler(BaseHandler):
    model_class = PipelineSchedule

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
            schedules = PipelineSchedule.query.filter(pipeline_uuid=pipeline.uuid).all()
        else:
            schedules = PipelineSchedule.query.all()
        collection = [s.to_dict() for s in schedules]

        self.write(dict(pipeline_schedules=collection))
        self.finish()

    def post(self, pipeline_uuid):
        pipeline = Pipeline.get(pipeline_uuid)

        payload = self.get_payload()
        pipeline_schedule = PipelineSchedule(**payload)
        pipeline_schedule.pipeline_uuid = pipeline.uuid
        pipeline_schedule.save()

        self.write(dict(pipeline_schedule=pipeline_schedule.to_dict()))
