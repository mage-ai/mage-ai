from datetime import datetime
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, Oauth2Application
from typing import List


def access_tokens_for_provider(provider: str) -> List[Oauth2AccessToken]:
    oauth_client = Oauth2Application.query.filter(
        Oauth2Application.client_id == provider,
    ).first()

    access_tokens = []
    if oauth_client:
        access_tokens = Oauth2AccessToken.query.filter(
            Oauth2AccessToken.expires > datetime.utcnow(),
            Oauth2AccessToken.oauth2_application_id == oauth_client.id,
        )

    return [row for row in access_tokens]
