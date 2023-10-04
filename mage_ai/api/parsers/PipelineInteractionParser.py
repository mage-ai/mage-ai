from typing import Dict

from mage_ai.api.oauth_scope import OauthScopeType
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.parsers.BaseParser import BaseParser


class PipelineInteractionParser(BaseParser):
    pass


async def parse_query(parser, value: Dict, **kwargs) -> Dict:
    return value


PipelineInteractionParser.parse_query(
    parser=parse_query,
    on_action=[
        OperationType.DETAIL,
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
)
