from dataclasses import dataclass, field
from datetime import datetime
from mage_ai.data_preparation.models.constants import (
    PIPELINES_FOLDER,
)
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.shared.config import BaseConfig
from typing import Dict
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


def get_triggers_by_pipeline(pipeline_uuid):
    pipeline_path = os.path.join(get_repo_path(), PIPELINES_FOLDER, pipeline_uuid)
    trigger_file_path = os.path.join(pipeline_path, TRIGGER_FILE_NAME)
    if not os.path.exists(trigger_file_path):
        return []
    trigger_configs = []
    try:
        with open(trigger_file_path) as fp:
            trigger_configs = yaml.full_load(fp).get('triggers') or {}
    except Exception:
        traceback.print_exc()
    triggers = []
    for trigger_config in trigger_configs:
        trigger_config['pipeline_uuid'] = pipeline_uuid
        try:
            trigger = Trigger.load(config=trigger_config)
            triggers.append(trigger)
        except Exception:
            traceback.print_exc()
    return triggers
