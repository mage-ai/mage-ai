from mage_ai.data_preparation.models.block import Block as BlockBase
from mage_ai.shared.models import Delegator


class Block(Delegator):
    def __init__(
        self,
        target: BlockBase,
    ):
        self.target = target
        self.delegate = Delegator(self.target)
