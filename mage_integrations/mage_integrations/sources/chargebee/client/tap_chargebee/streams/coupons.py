from tap_chargebee.streams.base import BaseChargebeeStream


class CouponsStream(BaseChargebeeStream):
    TABLE = 'coupons'
    ENTITY = 'coupon'
    REPLICATION_METHOD = 'INCREMENTAL'
    REPLICATION_KEY = 'updated_at'
    KEY_PROPERTIES = ['id']
    BOOKMARK_PROPERTIES = ['updated_at']
    SELECTED_BY_DEFAULT = True
    VALID_REPLICATION_KEYS = ['updated_at']
    INCLUSION = 'available'
    API_METHOD = 'GET'
    SCHEMA = 'plan_model/coupons'
    SORT_BY = 'created_at'

    def __init__(self, config, state, catalog, client):
        BaseChargebeeStream.__init__(self, config, state, catalog, client)
        if self.config['item_model']:
            self.SCHEMA = 'item_model/coupons'

    def get_url(self):
        return 'https://{}.chargebee.com/api/v2/coupons'.format(self.config.get('site'))
