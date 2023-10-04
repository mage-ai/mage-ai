from typing import Dict

from mage_ai.api.constants import AuthorizeStatusType
from mage_ai.api.oauth_scope import OauthScopeType
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.parsers.BaseParser import BaseParser
from mage_ai.api.policies.PipelineSchedulePolicy import (
    READABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS,
    WRITABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS,
)
from mage_ai.shared.hash import extract


class PipelineScheduleParser(BaseParser):
    pass


async def parse_read(parser, value: Dict, **kwargs) -> Dict:
    return extract(value, READABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS)


async def parse_write(parser, value: Dict, **kwargs) -> Dict:
    return extract(value, WRITABLE_ATTRIBUTES_FOR_PIPELINE_INTERACTIONS)


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


PipelineScheduleParser.parse_write(
    parser=parse_write,
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
