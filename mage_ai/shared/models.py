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

    def to_dict(self) -> Dict:
        return asdict(self)
