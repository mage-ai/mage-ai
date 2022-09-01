from .base import BaseDetailHandler, BaseHandler
from mage_ai.orchestration.db.models import EventMatcher
from mage_ai.orchestration.triggers.event_trigger import EventTrigger


class ApiEventHandler(BaseHandler):
    def post(self):
        payload = self.get_payload()
        EventTrigger().run(payload)
        self.write(dict(event=payload))


class ApiEventMatcherDetailHandler(BaseDetailHandler):
    model_class = EventMatcher

    def get(self, event_matcher_id):
        super().get(event_matcher_id)

    def put(self, event_matcher_id):
        super().put(event_matcher_id)

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
        payload = self.get_payload()
        event_matcher = EventMatcher.create(**payload)

        self.write(dict(event_matcher=event_matcher.to_dict()))
