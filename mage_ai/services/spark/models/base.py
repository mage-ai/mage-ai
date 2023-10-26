from dataclasses import asdict, dataclass
from typing import Dict

import inflection


@dataclass
class BaseSparkModel:
    @classmethod
    def load(self, **kwargs):
        return self(**self.load_to_dict(**kwargs))

    @classmethod
    def load_to_dict(self, **kwargs) -> Dict:
        data = {}
        for key, value in kwargs.items():
            data[inflection.underscore(key)] = value
        return data

    def to_dict(self) -> Dict:
        return asdict(self)
