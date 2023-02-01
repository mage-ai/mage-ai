from datetime import datetime, timedelta
from mage_ai.orchestration.db.models import Oauth2AccessToken, Oauth2Application, User
import secrets


def generate_access_token(user: User, application: Oauth2Application = None) -> Oauth2AccessToken:
    token = secrets.token_urlsafe()

    token_count = Oauth2AccessToken.query.filter(Oauth2AccessToken.token == token).count()
    while token_count >= 1:
        token = secrets.token_urlsafe()
        token_count = Oauth2AccessToken.query.filter(Oauth2AccessToken.token == token).count()

    attributes_data = dict(
        expires=datetime.utcnow() + timedelta(days=30),
        token=token,
        user_id=user.id,
    )

    if application:
        attributes_data['application_id'] = application.id

    return Oauth2AccessToken.create(**attributes_data)


def get_access_token(token: str) -> Oauth2AccessToken:
    return Oauth2AccessToken.query.filter(Oauth2AccessToken.token == token).first()
