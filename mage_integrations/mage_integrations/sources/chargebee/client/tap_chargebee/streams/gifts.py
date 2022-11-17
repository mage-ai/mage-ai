from tap_chargebee.streams.base import BaseChargebeeStream


class GiftsStream(BaseChargebeeStream):
    TABLE = 'gifts'
    ENTITY = 'gift'
    REPLICATION_METHOD = 'INCREMENTAL'
    REPLICATION_KEY = 'updated_at'
    KEY_PROPERTIES = ['id']
    BOOKMARK_PROPERTIES = ['updated_at']
    SELECTED_BY_DEFAULT = True
    VALID_REPLICATION_KEYS = ['updated_at']
    INCLUSION = 'available'
    API_METHOD = 'GET'
    SCHEMA = 'common/gifts'
    SORT_BY = None

    def get_url(self):
        return 'https://{}.chargebee.com/api/v2/gifts'.format(self.config.get('site'))
