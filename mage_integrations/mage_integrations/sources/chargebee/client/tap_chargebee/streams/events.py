from tap_chargebee.streams.base import BaseChargebeeStream


class EventsStream(BaseChargebeeStream):
    TABLE = 'events'
    ENTITY = 'event'
    REPLICATION_METHOD = 'INCREMENTAL'
    REPLICATION_KEY = 'occurred_at'
    KEY_PROPERTIES = ['id']
    BOOKMARK_PROPERTIES = ['occurred_at']
    SELECTED_BY_DEFAULT = True
    VALID_REPLICATION_KEYS = ['occurred_at']
    INCLUSION = 'available'
    API_METHOD = 'GET'
    SCHEMA = 'plan_model/events'
    SORT_BY = 'occurred_at'

    def __init__(self, config, state, catalog, client):
        BaseChargebeeStream.__init__(self, config, state, catalog, client)
        if self.config['item_model']:
            self.SCHEMA = 'item_model/events'

    def get_url(self):
        return 'https://{}.chargebee.com/api/v2/events'.format(self.config.get('site'))
