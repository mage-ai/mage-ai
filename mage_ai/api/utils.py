from datetime import datetime
from typing import List, Tuple

from mage_ai.api.errors import ApiError
from mage_ai.orchestration.db.models.oauth import (
    Oauth2AccessToken,
    Permission,
    Role,
    User,
)
from mage_ai.settings import (
    DISABLE_NOTEBOOK_EDIT_ACCESS,
    REQUIRE_USER_AUTHENTICATION,
    is_disable_pipeline_edit_access,
)
from mage_ai.shared.environments import is_test


def authenticate_client_and_token(client_id: str, token: str) -> Tuple[Oauth2AccessToken, bool]:
    oauth_token = Oauth2AccessToken.query.filter(
        Oauth2AccessToken.oauth2_application_id == client_id,
        Oauth2AccessToken.token == token,
    ).first()

    valid = False
    if oauth_token:
        valid = oauth_token.is_valid()

    return oauth_token, valid


def is_owner(
    user: User,
    entity: Permission.Entity = None,
    entity_id: str = None,
) -> bool:
    return (user and user.owner) or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        (user and user.get_access(entity, entity_id) & Permission.Access.OWNER != 0)


def has_at_least_admin_role(
    user: User,
    entity: Permission.Entity = None,
    entity_id: str = None,
) -> bool:
    return not user or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        is_owner(user, entity, entity_id) or \
        (user.roles and user.roles & 1 != 0) or \
        (user and user.get_access(entity, entity_id) & Permission.Access.ADMIN != 0)


def has_at_least_editor_role(
    user: User,
    entity: Permission.Entity = None,
    entity_id: str = None,
) -> bool:
    return not user or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        is_owner(user, entity, entity_id) or \
        has_at_least_admin_role(user, entity, entity_id) or \
        (user.roles and user.roles & 2 != 0) or \
        (user and user.get_access(entity, entity_id) & Permission.Access.EDITOR != 0)


def has_at_least_editor_role_and_notebook_edit_access(
    user: User,
    entity: Permission.Entity = None,
    entity_id: str = None,
) -> bool:
    return DISABLE_NOTEBOOK_EDIT_ACCESS != 1 and \
        has_at_least_editor_role(user, entity, entity_id)


def has_at_least_editor_role_and_pipeline_edit_access(
    user: User,
    entity: Permission.Entity = None,
    entity_id: str = None,
) -> bool:
    return not is_disable_pipeline_edit_access() and \
        has_at_least_editor_role(user, entity, entity_id)


def has_at_least_viewer_role(
    user: User,
    entity: Permission.Entity = None,
    entity_id: str = None,
) -> bool:
    return not user or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        is_owner(user, entity, entity_id) or \
        has_at_least_admin_role(user, entity, entity_id) or \
        has_at_least_editor_role(user, entity, entity_id) or \
        (user.roles and user.roles & 4 != 0) or \
        (user and user.get_access(entity, entity_id) & Permission.Access.VIEWER != 0)


def get_access_for_roles(
    roles: List[Role],
    entity: Permission.Entity,
    entity_id: str = None,
):
    access = 0
    for role in roles:
        if role:
            access = access | role.get_access(entity, entity_id=entity_id)
    return access


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


def get_query_timestamps(query_arg) -> Tuple[datetime, datetime]:
    start_timestamp = query_arg.get('start_timestamp', [None])
    if start_timestamp:
        start_timestamp = start_timestamp[0]
    end_timestamp = query_arg.get('end_timestamp', [None])
    if end_timestamp:
        end_timestamp = end_timestamp[0]

    error = ApiError.RESOURCE_INVALID.copy()
    if start_timestamp:
        try:
            start_timestamp = datetime.fromtimestamp(int(start_timestamp))
        except (ValueError, OverflowError):
            error.update(message='Value is invalid for start_timestamp.')
            raise ApiError(error)
    if end_timestamp:
        try:
            end_timestamp = datetime.fromtimestamp(int(end_timestamp))
        except (ValueError, OverflowError):
            error.update(message='Value is invalid for end_timestamp.')
            raise ApiError(error)

    return start_timestamp, end_timestamp
