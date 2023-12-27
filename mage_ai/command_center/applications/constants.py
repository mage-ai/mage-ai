from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.settings import REQUIRE_USER_AUTHENTICATION, REQUIRE_USER_PERMISSIONS

ITEMS = [
    dict(
        uuid='Account profile',
        path='/settings/account/profile',
        condition=lambda opts: REQUIRE_USER_AUTHENTICATION,
    ),
    dict(
        uuid='Compute management',
        path='/compute',
        condition=lambda opts: opts['project'].is_feature_enabled(FeatureUUID.COMPUTE_MANAGEMENT),
    ),
    dict(
        uuid='Custom templates',
        path='/templates',
    ),
    dict(
        uuid='Files',
        path='/files',
    ),
    dict(
        uuid='Git sync settings',
        path='/settings/workspace/sync-data',
    ),
    dict(
        uuid='Global data products',
        path='/global-data-products',
    ),
    dict(
        uuid='Global hooks',
        path='/global-hooks',
        condition=lambda opts: opts['project'].is_feature_enabled(FeatureUUID.GLOBAL_HOOKS),
    ),
    dict(
        uuid='Overview',
        path='/overview',
    ),
    dict(
        uuid='Permissions',
        path='/settings/workspace/permissions',
        condition=lambda opts: REQUIRE_USER_PERMISSIONS,
    ),
    dict(
        uuid='Pipeline runs',
        path='/pipeline-runs',
    ),
    dict(
        uuid='Pipelines',
        path='/pipelines',
    ),
    dict(
        uuid='Platform global hooks',
        path='/platform/global-hooks',
        condition=lambda opts: opts['project'].is_feature_enabled(
            FeatureUUID.GLOBAL_HOOKS,
        ) and opts['project'].is_feature_enabled(FeatureUUID.PROJECT_PLATFORM),
    ),
    dict(
        uuid='Platform preferences',
        path='/settings/platform/preferences',
        condition=lambda opts: opts['project'].is_feature_enabled(FeatureUUID.PROJECT_PLATFORM),
    ),
    dict(
        uuid='Platform settings',
        path='/settings/platform/settings',
        condition=lambda opts: opts['project'].is_feature_enabled(FeatureUUID.PROJECT_PLATFORM),
    ),
    dict(
        uuid='Project preferences',
        path='/settings/workspace/preferences',
    ),
    dict(
        uuid='Roles',
        path='/settings/workspace/roles',
        condition=lambda opts: REQUIRE_USER_PERMISSIONS,
    ),
    dict(
        uuid='Terminal',
        path='/terminal',
    ),
    dict(
        uuid='Triggers',
        path='/triggers',
    ),
    dict(
        uuid='User management',
        path='/settings/workspace/users',
        condition=lambda opts: REQUIRE_USER_AUTHENTICATION,
    ),
    dict(
        uuid='Version control',
        path='/version-control',
    ),
]
