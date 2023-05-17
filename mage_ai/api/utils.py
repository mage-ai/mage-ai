from typing import Tuple, Union

from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, Permission, User
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


def is_owner(user: User, entity=None, entity_id=None) -> bool:
    return (user and user.owner) or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        (get_access_for_user(user, entity, entity_id) & 1 != 0)


def has_at_least_admin_role(user: User, entity=None, entity_id=None) -> bool:
    return not user or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        is_owner(user) or \
        (user.roles and user.roles & 1 != 0) or \
        (get_access_for_user(user, entity, entity_id) & 2 != 0)


def has_at_least_editor_role(user: User, entity=None, entity_id=None) -> bool:
    return not user or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        is_owner(user) or \
        has_at_least_admin_role(user) or \
        (user.roles and user.roles & 2 != 0) or \
        (get_access_for_user(user, entity, entity_id) & 4 != 0)


def has_at_least_editor_role_and_notebook_edit_access(
    user: User,
    entity=None,
    entity_id=None,
) -> bool:
    return DISABLE_NOTEBOOK_EDIT_ACCESS != 1 and \
        has_at_least_editor_role(user, entity, entity_id)


def has_at_least_editor_role_and_pipeline_edit_access(
    user: User,
    entity=None,
    entity_id=None,
) -> bool:
    return not is_disable_pipeline_edit_access() and \
        has_at_least_editor_role(user, entity, entity_id)


def has_at_least_viewer_role(user: User, entity=None, entity_id=None) -> bool:
    return not user or \
        (not REQUIRE_USER_AUTHENTICATION and not is_test()) or \
        is_owner(user) or \
        has_at_least_admin_role(user) or \
        has_at_least_editor_role(user) or \
        (user.roles and user.roles & 4 != 0) or \
        (get_access_for_user(user, entity, entity_id) & 8 != 0)


def get_access_for_user(
    user: User,
    entity: Union[Permission.Entity, None],
    entity_id: Union[str, None] = None,
) -> int:
    '''
    If entity is None, we will go through all of the user's permissions and
    get the "highest" permission regardless of entity type. This should only be
    used for resources that are not entity dependent.

    Otherwise, search for permissions for the specified entity and entity_id, and
    return the access of the user for that entity.
    '''
    if not user:
        return 0
    permissions = []
    for role in user.roles_new:
        if entity is None:
            permissions.extend(role.permissions)
        else:
            entity_permissions = list(filter(
                lambda perm: perm.entity == entity and
                (entity_id is None or perm.entity_id == entity_id),
                role.permissions,
            ))
            if entity_permissions:
                permissions.extend(entity_permissions)

    access = 0
    if permissions:
        for permission in permissions:
            access = access | permission
    else:
        get_parent_access_for_entity(user, entity)
    return access


def get_parent_access_for_entity(user: User, entity) -> int:
    '''
    This method is used when a user does not have a permission for a specified entity. Then,
    we will go up the entity chain to see if they permissions for the parent entity.
    '''
    if entity == Permission.Entity.PIPELINE:
        return get_access_for_user(user, Permission.Entity.PROJECT, get_repo_path())
    elif entity == Permission.Entity.PROJECT:
        return get_access_for_user(user, Permission.Entity.GLOBAL)
    else:
        return 0


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
