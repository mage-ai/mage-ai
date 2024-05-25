from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.shared.models import BaseDataClass
from mage_ai.system.models import ResourceUsage


@dataclass
class VariableTypeInformation(BaseDataClass):
    type: VariableType

    def __post_init__(self):
        self.serialize_attribute_enum('type', VariableType)


@dataclass
class StatisticsInformation(BaseDataClass):
    original_column_count: Optional[int] = None
    original_row_count: Optional[int] = None


InformationData = Optional[
    Union[
        Dict[str, Any],
        ResourceUsage,
        StatisticsInformation,
        VariableTypeInformation,
    ]
]
AggregateInformationData = List[InformationData]


@dataclass
class AggregateInformation(BaseDataClass):
    insights: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[List[Dict[str, Any]]] = None
    resource_usage: Optional[List[ResourceUsage]] = None
    sample_data: Optional[List[Dict[str, Any]]] = None
    statistics: Optional[List[StatisticsInformation]] = None
    suggestions: Optional[List[Dict[str, Any]]] = None
    type: Optional[List[VariableTypeInformation]] = None

    def __post_init__(self):
        self.serialize_attribute_classes('resource_usage', ResourceUsage)
        self.serialize_attribute_classes('statistics', StatisticsInformation)
        self.serialize_attribute_classes('type', VariableTypeInformation)


@dataclass
class VariableAggregateCache(BaseDataClass):
    dynamic: Optional[AggregateInformation] = None
    insights: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    parts: Optional[AggregateInformation] = None
    resource_usage: Optional[ResourceUsage] = None
    sample_data: Optional[Dict[str, Any]] = None
    statistics: Optional[StatisticsInformation] = None
    suggestions: Optional[Dict[str, Any]] = None
    type: Optional[VariableTypeInformation] = None

    def __post_init__(self):
        self.serialize_attribute_class('dynamic', AggregateInformation)
        self.serialize_attribute_class('parts', AggregateInformation)
        self.serialize_attribute_class('resource_usage', ResourceUsage)
        self.serialize_attribute_class('statistics', StatisticsInformation)
        self.serialize_attribute_class('type', VariableTypeInformation)
