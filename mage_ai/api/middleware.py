from json.decoder import JSONDecodeError
from mage_ai.api.errors import ApiError
from mage_ai.api.utils import authenticate_client_and_token, parse_cookie_header
from mage_ai.authentication.oauth2 import decode_token
from mage_ai.orchestration.db.models.oauth import Oauth2Application
from mage_ai.settings import OAUTH2_APPLICATION_CLIENT_ID, REQUIRE_USER_AUTHENTICATION
from mage_ai.server.api.constants import (
    COOKIE_OAUTH_TOKEN,
    ENDPOINTS_BYPASS_OAUTH_CHECK,
    HEADER_API_KEY,
    HEADER_OAUTH_TOKEN,
    URL_PARAMETER_API_KEY,
)
from mage_ai.shared.array import find
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
            token_from_header = self.request.headers.get('Authorization')
            if token_from_header:
                tokens = token_from_header.split(',')
                token_from_header = find(lambda x: 'bearer' in x.lower(), tokens)
                if token_from_header:
                    token_from_header = (
                        token_from_header.
                        replace('Bearer ', '').
                        replace('bearer ', '')
                    )
                else:
                    token_from_header = None
            else:
                token_from_header = self.request.query_arguments.get('HTTP_AUTHORIZATION', None)

        cookies = parse_cookie_header(self.request.headers.get('Cookie', ''))

        if api_key:
            oauth_client = Oauth2Application.query_client(api_key)

            self.request.__setattr__('oauth_client', oauth_client)
            if not oauth_client:
                self.request.__setattr__('error', ApiError.INVALID_API_KEY)
            elif oauth_client.client_id != OAUTH2_APPLICATION_CLIENT_ID:
                self.request.__setattr__('error', ApiError.INVALID_API_KEY)
            else:
                should_check = False
                oauth_token = None
                if token_from_header:
                    oauth_token, valid = authenticate_client_and_token(
                        oauth_client.id,
                        token_from_header,
                    )
                    should_check = True
                elif COOKIE_OAUTH_TOKEN in cookies:
                    token_data = decode_token(cookies[COOKIE_OAUTH_TOKEN])
                    if 'token' in token_data:
                        oauth_token, valid = authenticate_client_and_token(
                            oauth_client.id,
                            decode_token(cookies[COOKIE_OAUTH_TOKEN])['token'],
                        )
                    should_check = True

                if should_check:
                    if oauth_token:
                        if valid:
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
