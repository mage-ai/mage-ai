from datetime import datetime, timedelta
from typing import Awaitable, Dict, List, Optional

from mage_ai.authentication.oauth2 import generate_access_token
from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.authentication.providers.oauth import OauthProvider
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import (
    Oauth2AccessToken,
    Oauth2Application,
    User,
)
from mage_ai.server.logger import Logger

logger = Logger().new_server_logger(__name__)


@safe_db_query
def access_tokens_for_client(
    client_id: str,
    user: User = None,
) -> List[Oauth2AccessToken]:
    query = Oauth2Application.query.filter(Oauth2Application.client_id == client_id)
    query.cache = True

    oauth_client = query.first()

    access_tokens = []
    if oauth_client:
        access_tokens_query = Oauth2AccessToken.query
        access_tokens_query.cache = True
        access_tokens_query = access_tokens_query.filter(
            Oauth2AccessToken.expires > datetime.utcnow(),
            Oauth2AccessToken.oauth2_application_id == oauth_client.id,
        )
        if user:
            access_tokens = access_tokens_query.filter(
                Oauth2AccessToken.user_id == user.id
            )
        else:
            access_tokens = access_tokens_query.filter(
                Oauth2AccessToken.user_id.is_(None)
            )

    return [row for row in access_tokens]


@safe_db_query
async def refresh_token_for_client(
    client_id: str,
    provider_instance: OauthProvider,
    user: User = None,
) -> Awaitable[Optional[Oauth2AccessToken]]:
    query = Oauth2Application.query.filter(Oauth2Application.client_id == client_id)
    query.cache = True

    oauth_client = query.first()

    refreshable_tokens = []
    if oauth_client:
        access_tokens_query = Oauth2AccessToken.query
        access_tokens_query.cache = True
        access_tokens_query = access_tokens_query.filter(
            Oauth2AccessToken.refresh_token.is_not(None),
            Oauth2AccessToken.oauth2_application_id == oauth_client.id,
        )
        if user:
            refreshable_tokens = access_tokens_query.filter(
                Oauth2AccessToken.user_id == user.id
            )
        else:
            refreshable_tokens = access_tokens_query.filter(
                Oauth2AccessToken.user_id.is_(None)
            )

    new_token = None
    if refreshable_tokens:
        # Try a limited number of tokens just in case there are too many
        tokens = refreshable_tokens[:5]
        for idx, token in enumerate(tokens):
            try:
                data = await provider_instance.get_refresh_token_response(
                    token.refresh_token
                )
                if 'access_token' in data:
                    expire_duration = int(
                        data['expires_in']
                        if 'expires_in' in data
                        else get_default_expire_time(
                            provider_instance.provider
                        ).total_seconds()
                    )
                    new_token = generate_access_token(
                        user,
                        application=oauth_client,
                        duration=expire_duration,
                        refresh_token=data.get('refresh_token'),
                        token=data.get('access_token'),
                    )
                    logger.info(
                        'Access token refreshed for client %s, expires on %s',
                        oauth_client.name,
                        new_token.expires.isoformat(),
                    )
                    break
            except Exception:
                logger.exception(
                    'Token refresh failed for client %s, attempt %d of %d',
                    oauth_client.name,
                    idx,
                    len(tokens),
                )
            finally:
                token.delete()

    return new_token


def get_default_expire_time(provider: ProviderName) -> timedelta:
    expire_timedelta = timedelta(days=30)
    if provider == ProviderName.BITBUCKET:
        expire_timedelta = timedelta(hours=1)
    elif provider == ProviderName.GITLAB:
        expire_timedelta = timedelta(hours=2)

    return expire_timedelta


def add_access_token_to_query(data: Dict, query: Dict) -> Dict:
    """
    Add an access token or error details to a query dictionary.

    1. If an access token exists, it is added to the query dictionary.
    2. If there's no access token, it checks for error-related information in the data dictionary:
      - 'error': The error code or message.
      - 'error_description': A description of the error.
      - 'error_uri': A URI with details about the error.
    3. It constructs a combined error message by joining non-empty error-related elements with
      a period (.) separator.
    4. If no error information is found, it sets a default error message.
    5. The resulting error message is added to the query dictionary.

    Args:
        data (Dict): A dictionary containing access token and error information.
        query (Dict): The query dictionary to be updated.

    Returns:
        Dict: The updated query dictionary.
    """
    access_token = data.get('access_token')

    if access_token:
        query['access_token'] = access_token
    else:
        error = data.get('error')
        error_description = data.get('error_description')
        error_uri = data.get('error_uri')

        if error:
            error = '. '.join(
                list(
                    filter(
                        lambda x: x,
                        [
                            error,
                            error_description,
                            error_uri,
                        ],
                    )
                )
            )
        else:
            error = 'Access token was not created.'

        query['error'] = error

    if 'refresh_token' in data:
        query['refresh_token'] = data['refresh_token']

    if 'expires_in' in data:
        query['expires_in'] = data['expires_in']

    return query
