from typing import Dict, List, Union

from mage_ai.api.constants import AttributeOperationType, AttributeType
from mage_ai.api.operations.constants import OperationType
from mage_ai.orchestration.db.models.oauth import User


async def authorize_action(
    policy,
    user: User,
    action: OperationType,
):
    pass


async def authorize_query(
    policy,
    user: User,
    query: Dict,
):
    pass


async def authorize_attributes(
    policy,
    user: User,
    read_or_write: AttributeOperationType,
    attrbs: List[Union[AttributeType, str]],
    **kwargs,
):
    # if self.is_owner():
    #     return True

    for attrb in attrbs:
        await authorize_attribute(policy, user, read_or_write, attrb, **kwargs)


async def authorize_attribute(
    policy,
    user: User,
    read_or_write: Union[AttributeType, str],
    attrb: str,
    **kwargs,
):
    pass
