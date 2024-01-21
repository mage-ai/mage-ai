from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.settings import REQUIRE_USER_AUTHENTICATION, REQUIRE_USER_PERMISSIONS
from mage_ai.settings.platform.constants import project_platform_activated

ITEMS = [
    dict(
        title='Account profile',
        path='/settings/account/profile',
        condition=lambda opts: REQUIRE_USER_AUTHENTICATION,
    ),
    dict(
        title='Compute management',
        path='/compute',
        condition=lambda opts: opts['project'].is_feature_enabled(FeatureUUID.COMPUTE_MANAGEMENT),
    ),
    dict(
        title='Custom templates',
        path='/templates',
    ),
    dict(
        title='Files',
        path='/files',
    ),
    dict(
        title='Git sync settings',
        path='/settings/workspace/sync-data',
    ),
    dict(
        title='Global data products',
        path='/global-data-products',
    ),
    dict(
        title='Global hooks',
        path='/global-hooks',
        condition=lambda opts: opts['project'].is_feature_enabled(FeatureUUID.GLOBAL_HOOKS),
    ),
    dict(
        title='Overview',
        path='/overview',
    ),
    dict(
        title='Permissions',
        path='/settings/workspace/permissions',
        condition=lambda opts: REQUIRE_USER_PERMISSIONS,
    ),
    dict(
        title='Pipeline runs',
        path='/pipeline-runs',
    ),
    dict(
        title='Pipelines',
        path='/pipelines',
    ),
    dict(
        title='Platform global hooks',
        path='/platform/global-hooks',
        condition=lambda opts: opts['project'].is_feature_enabled(
            FeatureUUID.GLOBAL_HOOKS,
        ) and project_platform_activated(),
    ),
    dict(
        title='Platform preferences',
        path='/settings/platform/preferences',
        condition=lambda _opts: project_platform_activated(),
    ),
    dict(
        title='Platform settings',
        path='/settings/platform/settings',
        condition=lambda _opts: project_platform_activated(),
    ),
    dict(
        title='Project preferences',
        path='/settings/workspace/preferences',
    ),
    dict(
        title='Roles',
        path='/settings/workspace/roles',
        condition=lambda opts: REQUIRE_USER_PERMISSIONS,
    ),
    dict(
        title='Terminal',
        path='/terminal',
    ),
    dict(
        title='Triggers',
        path='/triggers',
    ),
    dict(
        title='User management',
        path='/settings/workspace/users',
        condition=lambda opts: REQUIRE_USER_AUTHENTICATION,
    ),
    dict(
        title='Version control',
        path='/version-control',
    ),
]
