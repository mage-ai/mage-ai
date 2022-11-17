from tap_chargebee.streams.base import BaseChargebeeStream


class ItemPricesStream(BaseChargebeeStream):
    TABLE = 'item_prices'
    ENTITY = 'item_price'
    REPLICATION_METHOD = 'INCREMENTAL'
    REPLICATION_KEY = 'updated_at'
    KEY_PROPERTIES = ['id']
    BOOKMARK_PROPERTIES = ['updated_at']
    SELECTED_BY_DEFAULT = True
    VALID_REPLICATION_KEYS = ['updated_at']
    INCLUSION = 'available'
    API_METHOD = 'GET'
    SCHEMA = 'item_model/item_prices'
    SORT_BY = 'updated_at'

    def get_url(self):
        return 'https://{}.chargebee.com/api/v2/item_prices'.format(self.config.get('site'))
