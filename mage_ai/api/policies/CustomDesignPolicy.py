from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.CustomDesignPresenter import CustomDesignPresenter


class CustomDesignPolicy(BasePolicy):
    pass


CustomDesignPolicy.allow_actions(
    [
        OperationType.DETAIL,
        OperationType.LIST,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
        OauthScope.CLIENT_PUBLIC,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    override_permission_condition=lambda _policy: True,
)


CustomDesignPolicy.allow_read(
    CustomDesignPresenter.default_attributes + [],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
        OauthScope.CLIENT_PUBLIC,
    ],
    on_action=[
        OperationType.DETAIL,
        OperationType.LIST,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    override_permission_condition=lambda _policy: True,
)


CustomDesignPolicy.allow_query(
    [
        'operation',
        'page_path',
        'page_pathname',
        'page_query',
        'page_type',
        'page_uuid',
        'resource',
        'resource_id',
        'resource_parent',
        'resource_parent_id',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
        OauthScope.CLIENT_PUBLIC,
    ],
    on_action=[
        OperationType.DETAIL,
        OperationType.LIST,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
    override_permission_condition=lambda _policy: True,
)
