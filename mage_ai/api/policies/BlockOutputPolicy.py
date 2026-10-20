from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.operations import constants
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BlockOutputPresenter import BlockOutputPresenter


class BlockOutputPolicy(BasePolicy):
    pass


BlockOutputPolicy.allow_actions(
    [
        constants.DETAIL,
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

BlockOutputPolicy.allow_read(
    BlockOutputPresenter.default_attributes,
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.DETAIL,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)

BlockOutputPolicy.allow_query(
    [
        'block_uuid',
        'csv_lines_only',
        'dynamic_block_index',
        'exclude_blank_variable_uuids',
        'execution_partition',
        'include_print_outputs',
        'pipeline_uuid',
        'sample',
        'sample_count',
        'variable_type',
    ],
    scopes=[
        OauthScope.CLIENT_PRIVATE,
    ],
    on_action=[
        constants.DETAIL,
    ],
    condition=lambda policy: policy.has_at_least_viewer_role(),
)
