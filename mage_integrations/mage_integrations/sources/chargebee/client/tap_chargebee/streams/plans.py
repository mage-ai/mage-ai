from tap_chargebee.streams.base import BaseChargebeeStream


class PlansStream(BaseChargebeeStream):
    TABLE = 'plans'
    ENTITY = 'plan'
    REPLICATION_METHOD = 'INCREMENTAL'
    REPLICATION_KEY = 'updated_at'
    KEY_PROPERTIES = ['id']
    BOOKMARK_PROPERTIES = ['updated_at']
    SELECTED_BY_DEFAULT = True
    VALID_REPLICATION_KEYS = ['updated_at']
    INCLUSION = 'available'
    API_METHOD = 'GET'
    SCHEMA = 'plan_model/plans'
    SORT_BY = None

    def get_url(self):
        return 'https://{}.chargebee.com/api/v2/plans'.format(self.config.get('site'))
