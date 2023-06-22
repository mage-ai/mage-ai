import urllib.parse
from datetime import datetime, timedelta

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.authentication.oauth2 import generate_access_token
from mage_ai.authentication.oauth.constants import (
    GITHUB_CLIENT_ID,
    GITHUB_STATE,
    OAUTH_PROVIDER_GITHUB,
)
from mage_ai.authentication.oauth.utils import access_tokens_for_provider
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, Oauth2Application


class OauthResource(GenericResource):
    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        error = ApiError.RESOURCE_INVALID.copy()

        provider = payload.get('provider')
        token = payload.get('token')

        if not provider or provider not in [OAUTH_PROVIDER_GITHUB]:
            error.update(dict(message='Invalid provider.'))
            raise ApiError(error)

        if not token:
            error.update(dict(message='Invalid token.'))
            raise ApiError(error)

        oauth_client = Oauth2Application.query.filter(
            Oauth2Application.client_id == provider,
        ).first()
        if not oauth_client:
            oauth_client = Oauth2Application.create(
                client_id=provider,
                client_type=Oauth2Application.ClientType.PRIVATE,
                name=provider,
                user_id=user.id,
            )

        access_token = Oauth2AccessToken.query.filter(
            Oauth2AccessToken.token == token,
        ).first()
        if access_token:
            access_token.expires = datetime.utcnow() + timedelta(days=30)
            access_token.save()
        else:
            access_token = generate_access_token(
                user,
                oauth_client,
                token=token,
            )

        return self(dict(
            authenticated=True,
            expires=access_token.expires,
            provider=provider,
        ), user, **kwargs)

    @classmethod
    def member(self, pk, user, **kwargs):
        model = dict(provider=pk)

        error = ApiError.RESOURCE_INVALID.copy()
        if pk not in [OAUTH_PROVIDER_GITHUB]:
            error.update(dict(message='Invalid provider.'))
            raise ApiError(error)

        access_tokens = access_tokens_for_provider(pk)
        authenticated = len(access_tokens) >= 1
        if authenticated:
            model['authenticated'] = authenticated
            model['expires'] = max([access_token.expires for access_token in access_tokens])
        else:
            redirect_uri = kwargs.get('query', {}).get('redirect_uri', [None])
            if redirect_uri:
                redirect_uri = redirect_uri[0]

            if OAUTH_PROVIDER_GITHUB == pk:
                query = dict(
                    client_id=GITHUB_CLIENT_ID,
                    redirect_uri=urllib.parse.quote_plus('?'.join([
                        f'https://api.mage.ai/v1/oauth/{pk}',
                        f'redirect_uri={urllib.parse.unquote(redirect_uri)}',
                    ])),
                    scope='repo',
                    state=GITHUB_STATE,
                )
                query_strings = []
                for k, v in query.items():
                    query_strings.append(f'{k}={v}')

                model['url'] = f"https://github.com/login/oauth/authorize?{'&'.join(query_strings)}"

        return self(model, user, **kwargs)
