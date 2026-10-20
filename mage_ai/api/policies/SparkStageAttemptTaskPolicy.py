from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.SparkStageAttemptTaskPresenter import (
    SparkStageAttemptTaskPresenter,
)


class SparkStageAttemptTaskPolicy(BasePolicy):
    pass


SparkStageAttemptTaskPolicy.allow_actions(
    [
        OperationType.LIST,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


SparkStageAttemptTaskPolicy.allow_read(
    SparkStageAttemptTaskPresenter.default_attributes,
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.LIST,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


SparkStageAttemptTaskPolicy.allow_query(
    [
        'attempt_id',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.LIST,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)
