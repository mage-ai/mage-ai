from dataclasses import dataclass
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.strings import camel_to_snake_case
from typing import Dict
import os
import yaml


@dataclass
class BaseConfig:

    @classmethod
    def load(self, config_path: str = None, config: Dict = None):
        config_class_name = self.__name__
        config_class_key = camel_to_snake_case(config_class_name)
        if config is None:
            self.config_path = config_path
            if self.config_path is None:
                raise Exception(
                    'Please provide a config_path or a config dictionary to initialize'
                    f' an {config_class_name} object',
                )
            if not os.path.exists(self.config_path):
                raise Exception(f'{config_class_name} {self.config_path} does not exist.')
            with open(self.config_path) as fp:
                config = yaml.full_load(fp) or {}

        if config_class_key in config:
            config = config[config_class_key]
        extra_config = self.load_extra_config()
        config = merge_dict(config, extra_config)
        return self(**config)

    @classmethod
    def load_extra_config(self):
        return dict()
