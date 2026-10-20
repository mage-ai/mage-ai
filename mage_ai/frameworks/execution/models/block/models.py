from dataclasses import dataclass, field
from typing import Dict, Optional

import yaml

from mage_ai.data_preparation.models.block.settings.dynamic.models import (
    DynamicConfiguration,
)
from mage_ai.presenters.interactions.models import InteractionInput, InteractionVariable
from mage_ai.shared.models import BaseDataClass


@dataclass
class Metadata(BaseDataClass):
    required: Optional[bool] = None


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
    dynamic: Optional[DynamicConfiguration] = None
    metadata: Optional[Metadata] = None
    templates: Optional[Dict[str, Template]] = None

    def __post_init__(self):
        self.serialize_attribute_class('dynamic', DynamicConfiguration)
        self.serialize_attribute_class('metadata', Metadata)

        if self.templates and isinstance(self.templates, dict):
            self.templates = {
                k: Template(**v) if isinstance(v, dict) else v for k, v in self.templates.items()
            }

    def load_templates(self, path: str):
        self.templates = self.templates or {}
        with open(path, 'r') as file:
            template_configurations = yaml.safe_load(file)
            self.templates.update({
                k: Template.load(**v) for k, v in template_configurations.items()
            })
