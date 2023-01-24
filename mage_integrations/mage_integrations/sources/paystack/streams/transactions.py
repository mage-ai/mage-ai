from mage_integrations.sources.paystack.streams.base import BasePaystackStream


class TransactionsStream(BasePaystackStream):
    TABLE = 'transactions'
    ENTITY = 'transaction'
    REPLICATION_METHOD = 'INCREMENTAL'
    REPLICATION_KEY = 'createdAt'
    KEY_PROPERTIES = ['id']
    BOOKMARK_PROPERTIES = ['createdAt']
    SELECTED_BY_DEFAULT = True
    VALID_REPLICATION_KEYS = ['createdAt']
    INCLUSION = 'available'
    API_METHOD = 'GET'
    SCHEMA = 'transactions'

    def get_url(self):
        return 'https://api.paystack.co/transaction'
