from tap_chargebee.streams.base import BaseChargebeeStream


class CreditNotesStream(BaseChargebeeStream):
    TABLE = 'credit_notes'
    ENTITY = 'credit_note'
    REPLICATION_METHOD = 'INCREMENTAL'
    REPLICATION_KEY = 'updated_at'
    KEY_PROPERTIES = ['id']
    BOOKMARK_PROPERTIES = ['updated_at']
    SELECTED_BY_DEFAULT = True
    VALID_REPLICATION_KEYS = ['updated_at']
    INCLUSION = 'available'
    API_METHOD = 'GET'
    SCHEMA = 'common/credit_notes'
    SORT_BY = 'date'

    def get_url(self):
        return 'https://{}.chargebee.com/api/v2/credit_notes'.format(self.config.get('site'))
