from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken
from mage_ai.settings import (
    is_disable_pipeline_edit_access,
    DISABLE_NOTEBOOK_EDIT_ACCESS,
    REQUIRE_USER_AUTHENTICATION,
)
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


def has_at_least_editor_role_and_notebook_edit_access(user) -> bool:
    return DISABLE_NOTEBOOK_EDIT_ACCESS != 1 and has_at_least_editor_role(user)


def has_at_least_editor_role_and_pipeline_edit_access(user) -> bool:
    return not is_disable_pipeline_edit_access() and has_at_least_editor_role(user)


def has_at_least_viewer_role(user) -> bool:
    return not user or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        is_owner(user) or \
        has_at_least_admin_role(user) or \
        has_at_least_editor_role(user) or \
        (user.roles and user.roles & 4 != 0)


def parse_cookie_header(cookies_raw):
    cookies = {}
    if cookies_raw:
        for cookie_string in cookies_raw.split(';'):
            cookie_string = cookie_string.strip()
            if "=" in cookie_string:
                cookie_name, cookie_value = cookie_string.split('=', 1)
            else:
                # Assume an empty name per
                # https://bugzilla.mozilla.org/show_bug.cgi?id=169091
                cookie_name, cookie_value = "", cookie_string
            cookies[cookie_name] = cookie_value

    return cookies
