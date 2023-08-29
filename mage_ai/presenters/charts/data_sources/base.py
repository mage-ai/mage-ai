from abc import ABC, abstractmethod

from mage_ai.data_preparation.models.pipeline import Pipeline


class ChartDataSourceBase(ABC):
    def __init__(
        self,
        block_uuid: str = None,
        pipeline_schedule_id: int = None,
        pipeline_uuid: str = None,
    ):
        self._pipeline = None
        self.block_uuid = block_uuid
        self.pipeline_schedule_id = pipeline_schedule_id
        self.pipeline_uuid = pipeline_uuid

    @property
    def pipeline(self):
        if self.pipeline_uuid and not self._pipeline:
            self._pipeline = Pipeline.get(self.pipeline_uuid)

        return self._pipeline

    @abstractmethod
    def load_data(self, **kwargs):
        pass
