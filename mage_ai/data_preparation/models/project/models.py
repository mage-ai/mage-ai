from dataclasses import dataclass

from mage_ai.data_preparation.models.pipelines.models import PipelineSettings
from mage_ai.shared.models import BaseDataClass


@dataclass
class ProjectPipelines(BaseDataClass):
    settings: PipelineSettings = None

    def __post_init__(self):
        self.serialize_attribute_class('settings', PipelineSettings)
