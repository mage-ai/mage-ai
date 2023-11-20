import urllib.parse
from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlparse

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.authentication.oauth2 import generate_access_token
from mage_ai.authentication.oauth.constants import (
    GITHUB_CLIENT_ID,
    GITHUB_STATE,
    OAUTH_PROVIDER_GHE,
    OAUTH_PROVIDER_GITHUB,
    VALID_OAUTH_PROVIDERS,
    get_ghe_hostname,
)
from mage_ai.authentication.oauth.utils import (
    access_tokens_for_client,
    add_access_token_to_query,
)
from mage_ai.authentication.providers.constants import NAME_TO_PROVIDER
from mage_ai.data_preparation.git.api import get_oauth_client_id
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, Oauth2Application


class OauthResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        redirect_uri = query.get('redirect_uri', [None])
        if redirect_uri:
            redirect_uri = redirect_uri[0]

        oauths = []
        for provider, provider_class in NAME_TO_PROVIDER.items():
            try:
                provider_instance = provider_class()
                auth_url_response = provider_instance.get_auth_url_response(
                    redirect_uri=redirect_uri
                )
                if auth_url_response:
                    auth_url_response['provider'] = provider
                    oauths.append(auth_url_response)
            except Exception:
                continue

        return self.build_result_set(oauths, user, **kwargs)

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        error = ApiError.RESOURCE_INVALID.copy()

        provider = payload.get('provider')
        token = payload.get('token')

        if not provider or provider not in VALID_OAUTH_PROVIDERS:
            error.update(dict(message='Invalid provider.'))
            raise ApiError(error)

        if not token:
            error.update(dict(message='Invalid token.'))
            raise ApiError(error)

        client_id = get_oauth_client_id(provider)

        oauth_client = Oauth2Application.query.filter(
            Oauth2Application.client_id == client_id,
        ).first()
        if not oauth_client:
            oauth_client = Oauth2Application.create(
                client_id=client_id,
                client_type=Oauth2Application.ClientType.PRIVATE,
                name=provider,
                user_id=user.id if user else None,
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
                application=oauth_client,
                duration=int(timedelta(days=30).total_seconds()),
                token=token,
            )

        return self(
            dict(
                authenticated=True,
                expires=access_token.expires,
                provider=provider,
            ),
            user,
            **kwargs,
        )

    @classmethod
    async def member(self, pk, user, **kwargs):
        error = ApiError.RESOURCE_INVALID.copy()
        if pk not in VALID_OAUTH_PROVIDERS:
            error.update(dict(message='Invalid provider.'))
            raise ApiError(error)

        request_query = kwargs.get('query', {})
        code = request_query.get('code', [None])
        if code:
            code = code[0]
        redirect_uri = request_query.get('redirect_uri', [None])
        if redirect_uri:
            redirect_uri = redirect_uri[0]

        ghe_hostname = get_ghe_hostname()

        if pk == OAUTH_PROVIDER_GITHUB and ghe_hostname:
            provider = OAUTH_PROVIDER_GHE
        else:
            provider = pk

        provider_class = NAME_TO_PROVIDER.get(provider)
        provider_instance = None
        if provider_class is not None:
            provider_instance = provider_class()

        access_tokens = access_tokens_for_client(
            get_oauth_client_id(provider),
            user=user,
        )
        model = dict(provider=provider)
        authenticated = len(access_tokens) >= 1
        if authenticated:
            model['authenticated'] = authenticated
            model['expires'] = max(
                [access_token.expires for access_token in access_tokens]
            )
        # If an oauth code is provided, we need to exchange it for an access token for
        # the provider and return the redirect uri.
        elif code:
            if provider_instance is not None:
                # 1. Obtain an access token from the Oauth provider.
                # 2. Update uri query parameters with provider and access token from response.
                # 3. Recreate and return the uri to include the access token and provider.
                parsed_url = urlparse(urllib.parse.unquote(redirect_uri))
                parsed_url_query = parse_qs(parsed_url.query)

                query = {'provider': provider}
                for k, v in parsed_url_query.items():
                    if isinstance(v, list):
                        v = ','.join(v)
                    query[k] = v

                data = await provider_instance.get_access_token_response(
                    code, redirect_uri=redirect_uri
                )
                query = add_access_token_to_query(data, query)

                parts = redirect_uri.split('?')
                base_url = parts[0]

                redirect_uri_final = '?'.join(
                    [
                        base_url,
                        urllib.parse.urlencode(query),
                    ]
                )

                model['url'] = redirect_uri_final
        # Otherwise, return the authorization url to start the oauth flow.
        else:
            if OAUTH_PROVIDER_GITHUB == provider:
                query = dict(
                    client_id=GITHUB_CLIENT_ID,
                    redirect_uri=urllib.parse.quote_plus(
                        '?'.join(
                            [
                                f'https://api.mage.ai/v1/oauth/{pk}',
                                f'redirect_uri={urllib.parse.unquote(redirect_uri)}',
                            ]
                        )
                    ),
                    scope='repo',
                    state=GITHUB_STATE,
                )
                query_strings = []
                for k, v in query.items():
                    query_strings.append(f'{k}={v}')

                model[
                    'url'
                ] = f"https://github.com/login/oauth/authorize?{'&'.join(query_strings)}"
            elif provider_instance is not None:
                resp = provider_instance.get_auth_url_response(
                    redirect_uri=redirect_uri
                )
                if resp:
                    model.update(resp)

        return self(model, user, **kwargs)

    def update(self, payload, **kwargs):
        provider = self.model.get('provider')

        action_type = payload.get('action_type')
        if action_type == 'reset':
            access_tokens = access_tokens_for_client(
                get_oauth_client_id(provider),
                user=self.current_user,
            )
            for access_token in access_tokens:
                access_token.delete()

        return self
