from datetime import datetime
from typing import List

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
    if user:
        query.filter(Oauth2Application.user_id == user.id)

    oauth_client = query.first()

    access_tokens = []
    if oauth_client:
        access_tokens = Oauth2AccessToken.query.filter(
            Oauth2AccessToken.expires > datetime.utcnow(),
            Oauth2AccessToken.oauth2_application_id == oauth_client.id,
        )

    return [row for row in access_tokens]
