import urllib.parse
from typing import Dict

from mage_ai.api.operations.constants import OperationType
from mage_ai.api.resources.OauthResource import OauthResource
from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.command_center.constants import (
    ItemType,
    ModeType,
    ObjectType,
    ValidationType,
)
from mage_ai.command_center.models import PageMetadata
from mage_ai.command_center.shared.utils import build_action_fetch_items

ACTIVATE_MODE = dict(
    item_type=ItemType.MODE_ACTIVATION,
    mode=dict(
        disable_cache_items=True,
        type=ModeType.VERSION_CONTROL,
    ),
    title='Activate version control mode',
    description='Transform into a version control master',
)


DEACTIVATE_MODE = dict(
    item_type=ItemType.MODE_DEACTIVATION,
    mode=dict(
        type=ModeType.VERSION_CONTROL,
    ),
    title='Deactivate current mode',
    description='Shape shift back to a normal sorcerer',
)


async def build_reset_authentication_github(oauth_resource: OauthResource, user=None) -> Dict:
    expires_on = oauth_resource.expires
    if expires_on:
        expires_on = expires_on.strftime('%b %-d, %y')
    return dict(
        uuid=f'reset_authentication_github_version_control_{user.id if user else "user"}',
        item_type=ItemType.DELETE,
        object_type=ObjectType.AUTHENTICATION,
        title='GitHub authenticated',
        description='to re-authenticate, select this action and reset',
        subtitle=f'Expires {expires_on}',
        display_settings_by_attribute=dict(
            description=dict(
                text_styles=dict(
                    small=True,
                ),
            ),
            icon=dict(
                color_uuid='background.success',
                icon_uuid='PowerOnOffButton',
            ),
        ),
        actions=[
            dict(
                request=dict(
                    operation=OperationType.UPDATE,
                    payload=dict(oauth=dict(action_type='reset')),
                    resource='oauths',
                    resource_id=ProviderName.GITHUB,
                    response_resource_key='oauth',
                ),
                validations=[
                    ValidationType.CONFIRMATION,
                ],
                uuid='reset_authentication_github_version_control',
            ),
            build_action_fetch_items({}),
        ],
    )


async def build_authenticate_github(page: PageMetadata, user=None) -> Dict:
    if not page:
        return

    oauth_resource = await OauthResource.member(ProviderName.GITHUB, user, query=dict(
        redirect_uri=[urllib.parse.quote_plus(f'{page.origin}/version-control')],
    ))

    if oauth_resource.authenticated:
        return await build_reset_authentication_github(
            oauth_resource,
            user=user,
        )

    return dict(
        uuid=f'authenticate_github_version_control_{user.id if user else "user"}',
        item_type=ItemType.CREATE,
        object_type=ObjectType.AUTHENTICATION,
        title='Authenticate with GitHub',
        description='to easily pull, push, and create pull requests',
        subtitle='Authentication',
        display_settings_by_attribute=dict(
            description=dict(
                text_styles=dict(
                    small=True,
                ),
            ),
            icon=dict(
                stroke_uuid='accent.purple',
                icon_uuid='GitHubIcon',
            ),
        ),
        actions=[
            dict(
                page=dict(
                    external=True,
                    path=oauth_resource.url,
                ),
                uuid='authenticate_github_version_control',
            ),
        ],
    )
