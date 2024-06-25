from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

from mage_ai.frameworks.execution.models.enums import ExecutionFrameworkUUID, GroupUUID
from mage_ai.shared.models import BaseDataClass
from mage_ai.shared.strings import capitalize_remove_underscore_lower


@dataclass
class BaseExecutionFramework(BaseDataClass):
    uuid: Union[GroupUUID, ExecutionFrameworkUUID]
    description: Optional[str] = None
    groups: Optional[List[Union[GroupUUID, ExecutionFrameworkUUID]]] = None
    name: Optional[str] = None

    def __post_init__(self):
        self.serialize_attribute_enum('uuid', [GroupUUID, ExecutionFrameworkUUID])
        self.serialize_attribute_enums('groups', [GroupUUID, ExecutionFrameworkUUID])

    def to_dict(self, *args, **kwargs) -> Dict[str, Any]:
        data = super().to_dict(*args, **kwargs)
        if not self.name and self.uuid:
            data['name'] = capitalize_remove_underscore_lower(self.uuid or '')
        return data
