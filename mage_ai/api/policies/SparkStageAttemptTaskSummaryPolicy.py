from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.SparkStageAttemptTaskSummaryPresenter import (
    SparkStageAttemptTaskSummaryPresenter,
)


class SparkStageAttemptTaskSummaryPolicy(BasePolicy):
    pass


SparkStageAttemptTaskSummaryPolicy.allow_actions(
    [
        OperationType.DETAIL,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)


SparkStageAttemptTaskSummaryPolicy.allow_read(
    SparkStageAttemptTaskSummaryPresenter.default_attributes,
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.DETAIL,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)
