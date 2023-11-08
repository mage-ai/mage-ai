import os
import traceback
from dataclasses import asdict, dataclass, is_dataclass
from typing import Dict, Optional

import yaml

from mage_ai.shared.hash import merge_dict
from mage_ai.shared.strings import camel_to_snake_case


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

        config = self.parse_config(config)
        extra_config = self.load_extra_config()
        config = merge_dict(extra_config, config)

        for config_key, config_value in config.items():
            config_key_type = self.__annotations__.get(config_key, None)
            if config_key_type is None or config_value is None:
                continue
            if is_dataclass(config_key_type) and isinstance(config_value, dict):
                try:
                    config[config_key] = config_key_type.load(config=config_value)
                except Exception:
                    traceback.print_exc()
                    config[config_key] = None
        return self(**config)

    @classmethod
    def parse_config(self, config: Dict = None) -> Dict:
        return config

    @classmethod
    def load_extra_config(self) -> Dict:
        return dict()

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def load_file(self, config_path: Optional[str] = None, config: Optional[Dict] = None) -> Dict:
        """
        Load configuration from a file and merge it with the provided config.

        Args:
            config_path (Optional[str], optional): Path to the configuration file.
                Defaults to None.
            config (Optional[Dict], optional): Existing configuration to merge with.
                Defaults to None.

        Returns:
            Dict: Merged dictionary of configurations.
        """
        config = config or {}
        if not config_path:
            return config

        try:
            with open(config_path, 'r') as stream:
                file_config = yaml.load(stream, Loader=yaml.SafeLoader)
                return merge_dict(config, file_config)
        except yaml.YAMLError as e:
            print(e)
            return config
