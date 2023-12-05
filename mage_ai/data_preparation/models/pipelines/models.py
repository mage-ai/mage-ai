from dataclasses import dataclass

from mage_ai.shared.models import BaseDataClass


@dataclass
class PipelineSettingsTriggers(BaseDataClass):
    save_in_code_automatically: bool = None


@dataclass
class PipelineSettings(BaseDataClass):
    triggers: PipelineSettingsTriggers = None

    def __post_init__(self):
        self.serialize_attribute_class('triggers', PipelineSettingsTriggers)
