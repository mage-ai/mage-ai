from mage_ai.data_preparation.models.pipeline import Pipeline as PipelineBase
from mage_ai.shared.models import Delegator


class Pipeline(Delegator):
    def __init__(
        self,
        target: PipelineBase,
    ):
        self.target = target
        self.delegate = Delegator(self.target)
