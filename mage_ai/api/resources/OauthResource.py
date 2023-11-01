import json
import os
import urllib.parse
import uuid
from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlparse

import aiohttp

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.authentication.oauth2 import generate_access_token
from mage_ai.authentication.oauth.constants import (
    ACTIVE_DIRECTORY_CLIENT_ID,
    GHE_CLIENT_ID_ENV_VAR,
    GHE_CLIENT_SECRET_ENV_VAR,
    GITHUB_CLIENT_ID,
    GITHUB_STATE,
    OAUTH_PROVIDER_ACTIVE_DIRECTORY,
    OAUTH_PROVIDER_GHE,
    OAUTH_PROVIDER_GITHUB,
    VALID_OAUTH_PROVIDERS,
    get_ghe_hostname,
)
from mage_ai.authentication.oauth.utils import (
    access_tokens_for_client,
    add_access_token_to_query,
)
from mage_ai.data_preparation.git.api import get_oauth_client_id
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, Oauth2Application
from mage_ai.settings import ACTIVE_DIRECTORY_DIRECTORY_ID, ROUTES_BASE_PATH


class OauthResource(GenericResource):
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
            if OAUTH_PROVIDER_GHE == pk:
                # Fetch access token for GitHub Enterprise and add it to the redirect URI.

                # 1. Get GHE client credentials from environment variables.
                # 2. Obtain an access token from the GitHub Enterprise OAuth service.
                # 3. Update uri query parameters with provider and access token from GHE API.
                # 4. Recreate and return the uri to include the access token and provider.
                parsed_url = urlparse(urllib.parse.unquote(redirect_uri))
                parsed_url_query = parse_qs(parsed_url.query)

                query = {'provider': pk}
                for k, v in parsed_url_query.items():
                    if type(v) is list:
                        v = ','.join(v)
                    query[k] = v

                data = dict()
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f'{ghe_hostname}/login/oauth/access_token',
                        headers={
                            'Accept': 'application/json',
                        },
                        data=dict(
                            client_id=os.getenv(GHE_CLIENT_ID_ENV_VAR),
                            client_secret=os.getenv(GHE_CLIENT_SECRET_ENV_VAR),
                            code=code,
                        ),
                        timeout=20,
                    ) as response:
                        data = await response.json()

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
            if OAUTH_PROVIDER_GITHUB == pk:
                if ghe_hostname:
                    parsed_url = urlparse(urllib.parse.unquote(redirect_uri))
                    base_url = parsed_url.scheme + '://' + parsed_url.netloc
                    if ROUTES_BASE_PATH:
                        base_url += f'/{ROUTES_BASE_PATH}'
                    redirect_uri_query = urllib.parse.urlencode(
                        dict(
                            provider=OAUTH_PROVIDER_GHE,
                            redirect_uri=redirect_uri,
                        )
                    )
                    query = dict(
                        client_id=os.getenv(GHE_CLIENT_ID_ENV_VAR),
                        redirect_uri=urllib.parse.quote_plus(
                            f'{base_url}/oauth?{redirect_uri_query}',
                        ),
                        scope='repo',
                        state=uuid.uuid4().hex,
                    )
                    host = ghe_hostname
                else:
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
                    host = 'https://github.com'
                query_strings = []
                for k, v in query.items():
                    query_strings.append(f'{k}={v}')

                model['url'] = f"{host}/login/oauth/authorize?{'&'.join(query_strings)}"
            elif OAUTH_PROVIDER_ACTIVE_DIRECTORY == pk:
                ad_directory_id = ACTIVE_DIRECTORY_DIRECTORY_ID
                if ad_directory_id:
                    from requests.models import PreparedRequest

                    req = PreparedRequest()
                    req.prepare_url(redirect_uri, dict(provider=pk))
                    query = dict(
                        client_id=ACTIVE_DIRECTORY_CLIENT_ID,
                        redirect_uri=f'https://api.mage.ai/v1/oauth/{pk}',
                        response_type='code',
                        scope='User.Read',
                        state=urllib.parse.quote_plus(
                            json.dumps(
                                dict(
                                    redirect_uri=req.url,
                                    tenant_id=ad_directory_id,
                                )
                            )
                        ),
                    )
                    query_strings = []
                    for k, v in query.items():
                        query_strings.append(f'{k}={v}')
                    model[
                        'url'
                    ] = f"https://login.microsoftonline.com/{ad_directory_id}/oauth2/v2.0/authorize?{'&'.join(query_strings)}"  # noqa: E501

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
