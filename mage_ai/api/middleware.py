from json.decoder import JSONDecodeError
from mage_ai.api.errors import ApiError
from mage_ai.orchestration.db.models import Oauth2AccessToken, Oauth2Application
from mage_ai.settings import OAUTH2_APPLICATION_CLIENT_ID, REQUIRE_USER_AUTHENTICATION
from mage_ai.server.api.constants import (
    ENDPOINTS_BYPASS_OAUTH_CHECK,
    HEADER_API_KEY,
    HEADER_OAUTH_TOKEN,
    URL_PARAMETER_API_KEY,
)
from tornado.web import RequestHandler
import json


class OAuthMiddleware(RequestHandler):
    def prepare(self):
        self.request.__setattr__('current_user', None)
        self.request.__setattr__('error', None)
        self.request.__setattr__('oauth_client', None)
        self.request.__setattr__('oauth_token', None)

        if not REQUIRE_USER_AUTHENTICATION:
            return

        paths = [path for path in self.request.uri.split('/') if path]
        if any(p in ENDPOINTS_BYPASS_OAUTH_CHECK for p in paths):
            return

        api_key = self.request.headers.get(HEADER_API_KEY, None)
        if not api_key:
            if self.request.method == 'POST':
                try:
                    api_key = json.loads(
                        self.request.body).get(URL_PARAMETER_API_KEY)
                except (JSONDecodeError, UnicodeDecodeError):
                    # UnicodeDecodeError happens when there is invalid characters in the
                    # file upload when creating a new feature set
                    api_key = self.request.query_arguments.get(
                        URL_PARAMETER_API_KEY)
            else:
                api_key = self.request.query_arguments.get(
                    URL_PARAMETER_API_KEY)

        if api_key:
            if isinstance(api_key, list):
                api_key = api_key[0]
            if not isinstance(api_key, str):
                api_key = api_key.decode()

        token_from_header = self.request.headers.get(HEADER_OAUTH_TOKEN, None)
        if not token_from_header:
            token_from_header = self.request.query_arguments.get(
                'HTTP_AUTHORIZATION', None)
            if token_from_header:
                token_from_header = token_from_header.replace(
                    'Bearer ', '').replace('bearer ', '')

        if api_key:
            oauth_client = Oauth2Application.query.filter(
                Oauth2Application.client_id == api_key,
            ).first()
            self.request.__setattr__('oauth_client', oauth_client)
            if not oauth_client:
                self.request.__setattr__('error', ApiError.INVALID_API_KEY)
            elif oauth_client.client_id != OAUTH2_APPLICATION_CLIENT_ID:
                self.request.__setattr__('error', ApiError.INVALID_API_KEY)
            elif token_from_header:
                oauth_token = Oauth2AccessToken.query.filter(
                    Oauth2AccessToken.oauth2_application_id == oauth_client.id,
                    Oauth2AccessToken.token == token_from_header,
                ).first()

                if oauth_token:
                    if oauth_token.is_valid():
                        self.request.__setattr__('oauth_token', oauth_token)
                        self.request.__setattr__(
                            'current_user', oauth_token.user)
                    else:
                        self.request.__setattr__(
                            'error', ApiError.EXPIRED_OAUTH_TOKEN)
                else:
                    self.request.__setattr__(
                        'error', ApiError.INVALID_OAUTH_TOKEN)
        else:
            self.request.__setattr__('error', ApiError.INVALID_API_KEY)
