from dataclasses import dataclass, field
from typing import Dict, Optional

from mage_ai.data_preparation.models.block.settings.dynamic.models import (
    DynamicConfiguration,
)
from mage_ai.presenters.interactions.models import InteractionInput, InteractionVariable
from mage_ai.shared.models import BaseDataClass


@dataclass
class Template(BaseDataClass):
    description: Optional[str] = None
    inputs: Dict[str, InteractionInput] = field(default_factory=dict)
    name: Optional[str] = None
    variables: Dict[str, InteractionVariable] = field(default_factory=dict)

    def __post_init__(self):
        if self.inputs and isinstance(self.inputs, dict):
            self.inputs = {
                k: InteractionInput(**v) if isinstance(v, dict) else v
                for k, v in self.inputs.items()
            }
        if self.variables and isinstance(self.variables, dict):
            self.variables = {
                k: InteractionVariable(**v) if isinstance(v, dict) else v
                for k, v in self.variables.items()
            }


@dataclass
class Configuration(BaseDataClass):
    templates: Optional[Dict[str, Template]]
    dynamic: Optional[DynamicConfiguration] = None

    def __post_init__(self):
        self.serialize_attribute_class('dynamic', DynamicConfiguration)

        if self.templates and isinstance(self.templates, dict):
            self.templates = {
                k: Template(**v) if isinstance(v, dict) else v for k, v in self.templates.items()
            }
