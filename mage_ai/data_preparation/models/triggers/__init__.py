from dataclasses import dataclass, field
from datetime import datetime
from mage_ai.data_preparation.models.constants import (
    PIPELINES_FOLDER,
)
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.shared.config import BaseConfig
from typing import Dict, List
import enum
import os
import traceback
import yaml

TRIGGER_FILE_NAME = 'triggers.yaml'


class ScheduleStatus(str, enum.Enum):
    ACTIVE = 'active'
    INACTIVE = 'inactive'


class ScheduleType(str, enum.Enum):
    API = 'api'
    EVENT = 'event'
    TIME = 'time'


class ScheduleInterval(str, enum.Enum):
    ONCE = '@once'
    HOURLY = '@hourly'
    DAILY = '@daily'
    WEEKLY = '@weekly'
    MONTHLY = '@monthly'


@dataclass
class SettingsConfig(BaseConfig):
    skip_if_previous_running: bool = False
    allow_blocks_to_fail: bool = False


@dataclass
class Trigger(BaseConfig):
    name: str
    pipeline_uuid: str
    schedule_type: ScheduleType
    start_time: datetime
    schedule_interval: str
    status: ScheduleStatus = ScheduleStatus.INACTIVE
    variables: Dict = field(default_factory=dict)
    sla: int = None     # in seconds
    settings: Dict = field(default_factory=dict)

    def __post_init__(self):
        if self.schedule_type and type(self.schedule_type) is str:
            self.schedule_type = ScheduleType(self.schedule_type)
        if self.status and type(self.status) is str:
            self.status = ScheduleStatus(self.status)


def get_triggers_by_pipeline(pipeline_uuid: str) -> List[Trigger]:
    pipeline_path = os.path.join(get_repo_path(), PIPELINES_FOLDER, pipeline_uuid)
    trigger_file_path = os.path.join(pipeline_path, TRIGGER_FILE_NAME)
    if not os.path.exists(trigger_file_path):
        return []
    try:
        with open(trigger_file_path) as fp:
            content = fp.read()
        triggers = load_trigger_configs(content, pipeline_uuid=pipeline_uuid)
    except Exception:
        traceback.print_exc()
        triggers = []

    return triggers


def load_trigger_configs(
    content: str,
    pipeline_uuid: str = None,
    raise_exception: bool = False,
) -> List[Trigger]:
    yaml_config = yaml.safe_load(content) or {}
    trigger_configs = yaml_config.get('triggers') or {}

    triggers = []
    for trigger_config in trigger_configs:
        if pipeline_uuid:
            trigger_config['pipeline_uuid'] = pipeline_uuid
        try:
            trigger = Trigger.load(config=trigger_config)
            triggers.append(trigger)
        except Exception as e:
            if raise_exception:
                raise Exception(
                    f'Failed to parse trigger config {trigger_config}. {str(e)}') from e
            else:
                traceback.print_exc()
    return triggers
