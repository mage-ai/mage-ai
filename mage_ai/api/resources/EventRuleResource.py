from mage_ai.api.resources.GenericResource import GenericResource


class EventRuleResource(GenericResource):
    @classmethod
    def member(self, pk, user, **kwargs):
        rules = []

        if 'aws' == pk:
            from mage_ai.services.aws.events.events import get_all_event_rules
            rules = get_all_event_rules()

        return self(dict(rules=rules), user, **kwargs)
