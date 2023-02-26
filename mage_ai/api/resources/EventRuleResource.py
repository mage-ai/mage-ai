from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db import safe_db_query


class EventRuleResource(GenericResource):
    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        rules = []

        if 'aws' == pk:
            from mage_ai.services.aws.events.events import get_all_event_rules
            rules = get_all_event_rules()

        return self(dict(rules=rules), user, **kwargs)
