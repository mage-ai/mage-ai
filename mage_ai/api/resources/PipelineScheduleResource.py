from mage_ai.shared.hash import merge_dict
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import (
    EventMatcher,
    PipelineSchedule,
    pipeline_schedule_event_matcher_association_table,
)
from sqlalchemy.orm import selectinload
import uuid


class PipelineScheduleResource(DatabaseResource):
    datetime_keys = ['start_time']
    model_class = PipelineSchedule

    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        pipeline = kwargs.get('parent_model')

        if pipeline:
            return (
                PipelineSchedule.
                query.
                options(selectinload(PipelineSchedule.event_matchers)).
                options(selectinload(PipelineSchedule.pipeline_runs)).
                filter(PipelineSchedule.pipeline_uuid == pipeline.uuid).
                order_by(PipelineSchedule.id.desc(), PipelineSchedule.start_time.desc())
            )

        return PipelineSchedule.query.all()

    @classmethod
    def create(self, payload, user, **kwargs):
        pipeline = kwargs['parent_model']
        payload['pipeline_uuid'] = pipeline.uuid

        if 'token' not in payload:
            payload['token'] = uuid.uuid4().hex

        return super().create(payload, user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        arr = payload.pop('event_matchers', None)
        event_matchers = []
        if arr is not None:
            if len(arr) >= 1:
                event_matchers = EventMatcher.upsert_batch(
                    [merge_dict(p, dict(pipeline_schedule_ids=[self.id])) for p in arr],
                )

            ems = (
                EventMatcher.
                query.
                join(
                    pipeline_schedule_event_matcher_association_table,
                    EventMatcher.id ==
                    pipeline_schedule_event_matcher_association_table.c.event_matcher_id
                ).
                join(
                    PipelineSchedule,
                    PipelineSchedule.id ==
                    pipeline_schedule_event_matcher_association_table.c.pipeline_schedule_id
                ).
                filter(
                    PipelineSchedule.id == int(self.id),
                    EventMatcher.id.not_in([em.id for em in event_matchers]),
                )
            )
            for em in ems:
                new_ids = [schedule for schedule in em.pipeline_schedules if schedule.id != self.id]
                ps = [p for p in PipelineSchedule.query.filter(PipelineSchedule.id.in_(new_ids))]
                em.update(pipeline_schedules=ps)

        super().update(payload)

        return self
