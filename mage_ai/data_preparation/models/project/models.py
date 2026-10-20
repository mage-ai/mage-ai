from dataclasses import dataclass

from mage_ai.data_preparation.models.pipelines.models import PipelineSettings
from mage_ai.shared.models import BaseDataClass


@dataclass
class ProjectPipelines(BaseDataClass):
    settings: PipelineSettings = None

    def __post_init__(self):
        self.serialize_attribute_class('settings', PipelineSettings)


@dataclass
class ProjectDataClass(BaseDataClass):
    full_path: str = None
    full_path_relative: str = None
    path: str = None
    root_project_name: str = None
    root_project_full_path: str = None
    uuid: str = None
