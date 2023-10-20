from datetime import datetime
from typing import Dict, List

from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import (
    Oauth2AccessToken,
    Oauth2Application,
    User,
)


@safe_db_query
def access_tokens_for_client(
    client_id: str, user: User = None
) -> List[Oauth2AccessToken]:
    query = Oauth2Application.query.filter(Oauth2Application.client_id == client_id)
    query.cache = True
    if user:
        query.filter(Oauth2Application.user_id == user.id)

    oauth_client = query.first()

    access_tokens = []
    if oauth_client:
        access_tokens = Oauth2AccessToken.query
        access_tokens.cache = True
        access_tokens = access_tokens.filter(
            Oauth2AccessToken.expires > datetime.utcnow(),
            Oauth2AccessToken.oauth2_application_id == oauth_client.id,
        )

    return [row for row in access_tokens]


def add_access_token_to_query(data: Dict, query: Dict) -> Dict:
    access_token = data.get('access_token')

    if access_token:
        query['access_token'] = access_token
    else:
        error = data.get('error')
        error_description = data.get('error_description')
        error_uri = data.get('error_uri')

        if error:
            error = '. '.join(list(filter(lambda x: x, [
                error,
                error_description,
                error_uri,
            ])))
        else:
            error = 'Access token was not created.'

        query['error'] = error

    return query
