from mage_ai.data_preparation.models.block import Block as BlockBase
from mage_ai.shared.models import DelegatorTarget


class Block(DelegatorTarget):
    def __init__(
        self,
        target: BlockBase,
    ):
        super().__init__(target)
