import enum
import os
import yaml

from dataclasses import dataclass, field
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import index_by
from mage_ai.shared.io import safe_write
from mage_ai.shared.utils import clean_name
from typing import Dict, List


class GlobalDataProductObjectType(str, enum.Enum):
    BLOCK = 'block'
    PIPELINE = 'pipeline'


@dataclass
class GlobalDataProduct:
    uuid: str
    object_type: str = None
    object_uuid: str = None
    outdated_after: Dict = field(default_factory=dict)
    settings: Dict = field(default_factory=dict)
    start_outdated_at: Dict = field(default_factory=dict)

    def __init__(self, uuid: str, **kwargs):
        self.object_type = kwargs.get('object_type')
        self.object_uuid = kwargs.get('object_uuid')
        self.outdated_after = kwargs.get('outdated_after')
        self.settings = kwargs.get('settings')
        self.start_outdated_at = kwargs.get('start_outdated_at')
        self.uuid = clean_name(uuid) if uuid else uuid

    @classmethod
    def file_path(self) -> str:
        return os.path.join(get_repo_path(), 'global_data_products.yaml')

    @classmethod
    def load_all(self) -> List['GlobalDataProduct']:
        arr = []

        if not os.path.exists(self.file_path()):
            return []

        with open(self.file_path()) as fp:
            content = fp.read()
            if content:
                yaml_config = yaml.safe_load(content) or {}
                for uuid, config_attributes in yaml_config.items():
                    arr.append(self(
                        uuid,
                        **config_attributes,
                    ))

        return arr

    def to_dict(self, include_uuid: bool = False) -> Dict:
        data = dict(
            object_type=self.object_type,
            object_uuid=self.object_uuid,
            outdated_after=self.outdated_after,
            settings=self.settings,
            start_outdated_at=self.start_outdated_at,
        )

        if include_uuid:
            data['uuid'] = self.uuid

        return data

    def save(self) -> None:
        mapping = index_by(lambda x: x.uuid, self.load_all())
        mapping[self.uuid] = self

        mapping_new = {}
        for uuid, gdp in mapping.items():
            mapping_new[uuid] = {}
            for k, v in gdp.to_dict().items():
                if v is not None:
                    mapping_new[uuid][k] = v

        content = yaml.safe_dump(mapping_new)
        safe_write(self.file_path(), content)

