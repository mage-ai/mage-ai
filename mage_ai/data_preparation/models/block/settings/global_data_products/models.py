from dataclasses import dataclass
from enum import Enum
from typing import Optional

from mage_ai.shared.models import BaseDataClass


class GlobalDataProductObjectType(str, Enum):
    BLOCK = 'block'
    PIPELINE = 'pipeline'


@dataclass
class OutdatedAfterSettings(BaseDataClass):
    months: Optional[int] = None
    seconds: Optional[int] = None
    weeks: Optional[int] = None
    years: Optional[int] = None


@dataclass
class OutdatedStartingAtSettings(BaseDataClass):
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    day_of_year: Optional[int] = None
    hour_of_day: Optional[int] = None
    minute_of_hour: Optional[int] = None
    month_of_year: Optional[int] = None
    second_of_minute: Optional[int] = None
    week_of_month: Optional[int] = None
    week_of_year: Optional[int] = None


@dataclass
class GlobalDataProductConfiguration(BaseDataClass):
    uuid: str
    object_type: Optional[GlobalDataProductObjectType] = None
    object_uuid: Optional[str] = None
    outdated_after: Optional[OutdatedAfterSettings] = None
    outdated_starting_at: Optional[OutdatedStartingAtSettings] = None
    project: Optional[str] = None

    def __post_init__(self):
        self.serialize_attribute_class('outdated_after', OutdatedAfterSettings)
        self.serialize_attribute_class('outdated_starting_at', OutdatedStartingAtSettings)
        self.serialize_attribute_enum('object_type', GlobalDataProductObjectType)
