from mage_integrations.sources.chargebee.streams.base import BaseChargebeeStream


class CommentsStream(BaseChargebeeStream):
    TABLE = 'comments'
    ENTITY = 'comment'
    REPLICATION_METHOD = 'INCREMENTAL'
    REPLICATION_KEY = 'created_at'
    KEY_PROPERTIES = ['id']
    BOOKMARK_PROPERTIES = ['created_at']
    SELECTED_BY_DEFAULT = True
    VALID_REPLICATION_KEYS = ['created_at']
    INCLUSION = 'available'
    API_METHOD = 'GET'
    SCHEMA = 'common/comments'
    SORT_BY = 'created_at'

    def get_url(self):
        return 'https://{}.chargebee.com/api/v2/comments'.format(self.config.get('site'))
