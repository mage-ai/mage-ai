from typing import Dict

from mage_ai.api.constants import AuthorizeStatusType
from mage_ai.api.oauth_scope import OauthScopeType
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.parsers.BaseParser import BaseParser
from mage_ai.api.policies.PipelineSchedulePolicy import (
    READABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS,
    WRITABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS,
)
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.shared.hash import extract


class PipelineScheduleParser(BaseParser):
    pass


async def parse_read(parser, value: Dict, **kwargs) -> Dict:
    return extract(value, READABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS)


async def parse_read_update(parser, _value: Dict, **kwargs) -> Dict:
    return {}


async def parse_write(
    parser,
    value: Dict,
    authorize_status: AuthorizeStatusType = None,
    **kwargs,
) -> Dict:
    if AuthorizeStatusType.FAILED == authorize_status:
        parsed_value = extract(value or {}, WRITABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS)
    else:
        parsed_value = (value or {}).copy()

    pipeline = parser.policy.parent_model()
    if not pipeline:
        pipeline = parser.policy.resource.pipeline

    if Project(repo_config=pipeline.repo_config if pipeline else None).is_feature_enabled(
        FeatureUUID.INTERACTIONS,
    ):
        pipeline_interaction = (parser.policy.result_set().context.data or {}).get(
            'pipeline_interactions',
            {},
        ).get(pipeline.uuid)

        if pipeline_interaction:
            variables = parsed_value.get('variables')
            if pipeline_interaction and variables:
                variables_allowed = await pipeline_interaction.variables()
                parsed_value['variables'] = extract(
                    variables or {},
                    (variables_allowed or {}).keys(),
                )

    return parsed_value


async def parse_write_update(parser, value: Dict, **kwargs) -> Dict:
    return extract(value, ['status'])


PipelineScheduleParser.parse_read(
    parser=parse_read,
    on_action=[
        OperationType.CREATE,
    ],
    on_authorize_status=[
        AuthorizeStatusType.FAILED,
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
)


PipelineScheduleParser.parse_read(
    parser=parse_read_update,
    on_action=[
        OperationType.UPDATE,
    ],
    on_authorize_status=[
        AuthorizeStatusType.FAILED,
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
)


PipelineScheduleParser.parse_write(
    parser=parse_write,
    on_action=[
        OperationType.CREATE,
    ],
    on_authorize_status=[
        AuthorizeStatusType.FAILED,
        AuthorizeStatusType.SUCCEEDED,
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
)


PipelineScheduleParser.parse_write(
    parser=parse_write_update,
    on_action=[
        OperationType.UPDATE,
    ],
    on_authorize_status=[
        AuthorizeStatusType.FAILED,
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
)
