from datetime import datetime
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken


class OauthAccessTokenResource(DatabaseResource):
    model_class = Oauth2AccessToken

    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        results = Oauth2AccessToken.query.filter(Oauth2AccessToken.user_id == user.id)

        show_all = query_arg.get('show_all', [None])
        if show_all:
            show_all = show_all[0]

        if not show_all:
            results = results.filter(Oauth2AccessToken.expires > datetime.utcnow())

        results = results.order_by(Oauth2AccessToken.expires.desc())

        return results
