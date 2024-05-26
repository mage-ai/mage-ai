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
    insights: Optional[
        Union[
            List[Dict[str, Any]],
            List[List[Dict[str, Any]]],
        ]
    ] = None
    metadata: Optional[
        Union[
            List[Dict[str, Any]],
            List[List[Dict[str, Any]]],
        ]
    ] = None
    resource_usage: Optional[
        Union[
            List[ResourceUsage],
            List[List[ResourceUsage]],
        ]
    ] = None
    sample_data: Optional[
        Union[
            List[Dict[str, Any]],
            List[List[Dict[str, Any]]],
        ]
    ] = None
    statistics: Optional[
        Union[
            List[StatisticsInformation],
            List[List[StatisticsInformation]],
        ]
    ] = None
    suggestions: Optional[
        Union[
            List[Dict[str, Any]],
            List[List[Dict[str, Any]]],
        ]
    ] = None
    type: Optional[
        Union[
            List[VariableTypeInformation],
            List[List[VariableTypeInformation]],
        ]
    ] = None

    def __post_init__(self):
        if self.resource_usage and isinstance(self.resource_usage, list):
            arr = []
            for item in self.resource_usage:
                if item and isinstance(item, dict):
                    arr.append(ResourceUsage.load(**item))
                elif isinstance(item, ResourceUsage):
                    arr.append(ResourceUsage)
                elif isinstance(item, list):
                    arr_nested = []
                    for item_nested in item:
                        if item_nested and isinstance(item_nested, dict):
                            arr_nested.append(ResourceUsage.load(**item_nested))
                        elif isinstance(item_nested, ResourceUsage):
                            arr_nested.append(ResourceUsage)
                    arr.append(arr_nested)
            self.resource_usage = arr

        if self.statistics and isinstance(self.statistics, list):
            arr = []
            for item in self.statistics:
                if item and isinstance(item, dict):
                    arr.append(StatisticsInformation.load(**item))
                elif isinstance(item, StatisticsInformation):
                    arr.append(StatisticsInformation)
                elif isinstance(item, list):
                    arr_nested = []
                    for item_nested in item:
                        if item_nested and isinstance(item_nested, dict):
                            arr_nested.append(StatisticsInformation.load(**item_nested))
                        elif isinstance(item_nested, StatisticsInformation):
                            arr_nested.append(StatisticsInformation)
                    arr.append(arr_nested)
            self.statistics = arr

        if self.type and isinstance(self.type, list):
            arr = []
            for item in self.type:
                if item and isinstance(item, dict):
                    arr.append(VariableTypeInformation.load(**item))
                elif isinstance(item, VariableTypeInformation):
                    arr.append(VariableTypeInformation)
                elif isinstance(item, list):
                    arr_nested = []
                    for item_nested in item:
                        if item_nested and isinstance(item_nested, dict):
                            arr_nested.append(VariableTypeInformation.load(**item_nested))
                        elif isinstance(item_nested, VariableTypeInformation):
                            arr_nested.append(VariableTypeInformation)
                    arr.append(arr_nested)
            self.type = arr


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
