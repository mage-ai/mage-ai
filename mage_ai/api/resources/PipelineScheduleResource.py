from mage_ai.api.errors import ApiError
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.api.resources.shared.collections import limit_collection
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import PipelineSchedule
from sqlalchemy.orm import selectinload


class PipelineScheduleResource(DatabaseResource):
    model_class = PipelineSchedule

    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        pipeline = kwargs.get('parent_model')

        if pipeline:
            results = (
                PipelineSchedule.
                query.
                options(selectinload(PipelineSchedule.event_matchers)).
                options(selectinload(PipelineSchedule.pipeline_runs)).
                filter(PipelineSchedule.pipeline_uuid == pipeline.uuid).
                order_by(PipelineSchedule.start_time.desc(), PipelineSchedule.id.desc())
            )
            results = limit_collection(results, query_arg).all()
            results.sort(key=lambda x: x.id, reverse=True)
        else:
            results = PipelineSchedule.query.all()

        return self.build_result_set(results, user, **kwargs)

    @classmethod
    def create(self, payload, user, **kwargs):
        pipeline = kwargs['parent_model']
        payload['pipeline_uuid'] = pipeline.uuid
        return super().create(payload, user, **kwargs)
