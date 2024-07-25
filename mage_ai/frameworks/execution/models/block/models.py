from dataclasses import dataclass, field
from typing import Dict, Optional

from mage_ai.data_preparation.models.block.settings.dynamic.models import (
    DynamicConfiguration,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.presenters.interactions.models import InteractionInput, InteractionVariable
from mage_ai.shared.models import BaseDataClass


@dataclass
class Metadata(BaseDataClass):
    required: Optional[bool] = None


@dataclass
class Template(BaseDataClass):
    configuration_path: Optional[str] = None
    description: Optional[str] = None
    inputs: Dict[str, InteractionInput] = field(default_factory=dict)
    name: Optional[str] = None
    path: Optional[str] = None
    type: Optional[BlockType] = None
    uuid: Optional[str] = None
    variables: Dict[str, InteractionVariable] = field(default_factory=dict)

    def __post_init__(self):
        self.serialize_attribute_enum('type', BlockType)

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

    def setup_block_config(self, payload: Dict) -> Dict:
        # 1. Set the block type
        # 2. Get the content from the template
        # 3. Set up the configuration inputs and variables
        payload['type'] = self.type
        payload['config'] = dict(template_path=self.path)

        templates = {}
        templates[self.uuid] = dict(variables={})
        for variable_uuid, variable_config in (self.variables or {}).items():
            templates[self.uuid]['variables'][variable_uuid] = variable_config.value

        payload['configuration'] = dict(templates=templates)

        return payload


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
