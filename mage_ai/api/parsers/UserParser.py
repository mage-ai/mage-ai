from typing import Dict

from mage_ai.api.constants import AuthorizeStatusType
from mage_ai.api.oauth_scope import OauthScopeType
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.parsers.BaseParser import BaseParser


class UserParser(BaseParser):
    pass


async def parse_read(parser, value: Dict, **kwargs) -> Dict:
    return {}


UserParser.parse_read(
    parser=parse_read,
    on_action=[
        OperationType.DETAIL,
    ],
    on_authorize_status=[
        AuthorizeStatusType.FAILED,
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
)
