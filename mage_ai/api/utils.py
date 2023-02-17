from mage_ai.orchestration.db.models import Oauth2AccessToken
from mage_ai.settings import REQUIRE_USER_AUTHENTICATION
from mage_ai.shared.environments import is_test
from typing import Tuple


def authenticate_client_and_token(client_id: str, token: str) -> Tuple[Oauth2AccessToken, bool]:
    oauth_token = Oauth2AccessToken.query.filter(
        Oauth2AccessToken.oauth2_application_id == client_id,
        Oauth2AccessToken.token == token,
    ).first()

    valid = False
    if oauth_token:
        valid = oauth_token.is_valid()

    return oauth_token, valid


def is_owner(user) -> bool:
    return (user and user.owner) or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test())


def has_at_least_admin_role(user) -> bool:
    return not user or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        is_owner(user) or \
        (user.roles and user.roles & 1 != 0)


def has_at_least_editor_role(user) -> bool:
    return not user or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        is_owner(user) or \
        has_at_least_admin_role(user) or \
        (user.roles and user.roles & 2 != 0)


def has_at_least_viewer_role(user) -> bool:
    return not user or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        is_owner(user) or \
        has_at_least_admin_role(user) or \
        has_at_least_editor_role(user) or \
        (user.roles and user.roles & 4 != 0)
