from mage_integrations.sources.chargebee.streams.base import BaseChargebeeStream


class SubscriptionsStream(BaseChargebeeStream):
    TABLE = 'subscriptions'
    ENTITY = 'subscription'
    REPLICATION_METHOD = 'INCREMENTAL'
    REPLICATION_KEY = 'updated_at'
    KEY_PROPERTIES = ['id']
    BOOKMARK_PROPERTIES = ['updated_at']
    SELECTED_BY_DEFAULT = True
    VALID_REPLICATION_KEYS = ['updated_at']
    INCLUSION = 'available'
    API_METHOD = 'GET'
    SCHEMA = 'plan_model/subscriptions'
    SORT_BY = 'updated_at'

    def __init__(self, config, state, catalog, client, logger=None):
        BaseChargebeeStream.__init__(self, config, state, catalog, client, logger=logger)
        if self.config.get('item_model'):
            self.SCHEMA = 'item_model/subscriptions'

    def get_url(self):
        return 'https://{}.chargebee.com/api/v2/subscriptions'.format(self.config.get('site'))
