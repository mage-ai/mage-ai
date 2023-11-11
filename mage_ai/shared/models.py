from dataclasses import asdict, dataclass
from typing import Dict

import inflection


@dataclass
class BaseDataClass:
    @classmethod
    def load(self, **kwargs):
        props_init = self.load_to_dict(**kwargs)

        props = {}
        if props_init:
            all_attributes = self.__annotations__
            for key, value in props_init.items():
                if key in all_attributes:
                    props[key] = value

        return self(**props)

    @classmethod
    def load_to_dict(self, **kwargs) -> Dict:
        data = {}
        for key, value in kwargs.items():
            data[inflection.underscore(key)] = value
        return data

    def serialize_attribute_class(self, attribute_name: str, attribute_class):
        try:
            value = getattr(self, attribute_name)
            if value and isinstance(value, dict):
                setattr(self, attribute_name, attribute_class.load(**value))
        except AttributeError as err:
            print(f'[WARNING] {self.__class__.__name__}.serialize_attribute_class: {err}')

    def serialize_attribute_classes(self, attribute_name: str, attribute_class):
        try:
            value = getattr(self, attribute_name)
            if value and isinstance(value, list):
                arr = []
                for model in value:
                    if isinstance(model, dict):
                        arr.append(attribute_class.load(**model))
                    else:
                        arr.append(model)
                setattr(self, attribute_name, arr)
        except AttributeError as err:
            print(f'[WARNING] {self.__class__.__name__}.serialize_attribute_classes: {err}')

    def to_dict(self) -> Dict:
        data = asdict(self)
        if data:
            for key, value in data.items():
                if isinstance(value, BaseDataClass):
                    data[key] = value.to_dict()
                elif isinstance(value, list):
                    if len(value) >= 1 and isinstance(value[0], BaseDataClass):
                        data[key] = [m.to_dict() for m in value]
        return data
