from .base import BaseDetailHandler, BaseHandler
from mage_ai.orchestration.db.models import EventMatcher, PipelineSchedule
from mage_ai.orchestration.triggers.event_trigger import EventTrigger
import json


class ApiAwsEventRuleListHandler(BaseHandler):
    def get(self, provider):
        event_rules = []

        if 'aws' == provider:
            from mage_ai.services.aws.events.events import get_all_event_rules
            event_rules = get_all_event_rules()

        self.write(dict(event_rules=event_rules))


class ApiEventHandler(BaseHandler):
    def post(self):
        payload = self.get_payload()
        EventTrigger().run(payload)
        self.write(dict(event=payload))


class ApiEventMatcherDetailHandler(BaseDetailHandler):
    model_class = EventMatcher

    def get(self, event_matcher_id):
        include_attributes = []
        if self.get_bool_argument('include_pipeline_schedules', False):
            include_attributes.append('pipeline_schedules')
        super().get(event_matcher_id, include_attributes=include_attributes)

    def put(self, event_matcher_id):
        event_matcher = self.model_class.query.get(int(event_matcher_id))
        payload = self.get_payload()
        pipeline_schedule_ids = payload.pop('pipeline_schedule_ids', None)
        if pipeline_schedule_ids is not None:
            pipeline_schedules = PipelineSchedule.query.filter(
                PipelineSchedule.id.in_(pipeline_schedule_ids),
            ).all()
            payload['pipeline_schedules'] = pipeline_schedules
        event_matcher.update(**payload)
        self.write_model(event_matcher)

    def delete(self, event_matcher_id):
        super().delete(event_matcher_id)


class ApiEventMatcherListHandler(BaseHandler):
    model_class = EventMatcher

    def get(self):
        event_matchers = EventMatcher.query.all()
        collection = [e.to_dict() for e in event_matchers]
        self.write(dict(event_matchers=collection))
        self.finish()

    def post(self):
        arr = json.loads(self.request.body).get('event_matchers', [])
        if len(arr) == 0:
            arr.append(self.get_payload())

        event_matchers = EventMatcher.upsert_batch(arr)

        if len(event_matchers) >= 2:
            self.write(dict(event_matchers=[em.to_dict() for em in event_matchers]))
        else:
            self.write(dict(event_matcher=event_matchers[0].to_dict()))
