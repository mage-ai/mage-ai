import enum
import os
import traceback
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List

import yaml

from mage_ai.data_preparation.models.constants import PIPELINES_FOLDER
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.hash import index_by
from mage_ai.shared.io import safe_write

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
    envs: List = field(default_factory=list)

    def __post_init__(self):
        if self.schedule_type and type(self.schedule_type) is str:
            self.schedule_type = ScheduleType(self.schedule_type)
        if self.status and type(self.status) is str:
            self.status = ScheduleStatus(self.status)

    def to_dict(self) -> Dict:
        return dict(
            envs=self.envs,
            name=self.name,
            pipeline_uuid=self.pipeline_uuid,
            schedule_interval=self.schedule_interval,
            schedule_type=self.schedule_type.value if self.schedule_type else self.schedule_type,
            settings=self.settings,
            sla=self.sla,
            start_time=self.start_time,
            status=self.status.value if self.status else self.status,
            variables=self.variables,
        )


def get_triggers_file_path(pipeline_uuid: str) -> str:
    pipeline_path = os.path.join(get_repo_path(), PIPELINES_FOLDER, pipeline_uuid)
    trigger_file_path = os.path.join(pipeline_path, TRIGGER_FILE_NAME)
    return trigger_file_path


def load_triggers_file_content(pipeline_uuid: str) -> str:
    content = None

    trigger_file_path = get_triggers_file_path(pipeline_uuid)
    if os.path.exists(trigger_file_path):
        with open(trigger_file_path) as fp:
            content = fp.read()

    return content


def load_triggers_file_data(pipeline_uuid: str) -> Dict:
    data = {}

    content = load_triggers_file_content(pipeline_uuid)
    if content:
        data = yaml.safe_load(content) or {}

    return data


def get_triggers_by_pipeline(pipeline_uuid: str) -> List[Trigger]:
    trigger_file_path = get_triggers_file_path(pipeline_uuid)

    if not os.path.exists(trigger_file_path):
        return []

    try:
        content = load_triggers_file_content(pipeline_uuid)
        triggers = load_trigger_configs(content, pipeline_uuid=pipeline_uuid)
    except Exception:
        traceback.print_exc()
        triggers = []

    return triggers


def build_triggers(
    trigger_configs: Dict,
    pipeline_uuid: str = None,
    raise_exception: bool = False,
) -> List[Trigger]:
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


def load_trigger_configs(
    content: str,
    pipeline_uuid: str = None,
    raise_exception: bool = False,
) -> List[Trigger]:
    yaml_config = yaml.safe_load(content) or {}
    trigger_configs = yaml_config.get('triggers') or {}

    return build_triggers(trigger_configs, pipeline_uuid, raise_exception)


def add_or_update_trigger_for_pipeline_and_persist(
    trigger: Trigger,
    pipeline_uuid: str,
) -> Dict:
    yaml_config = load_triggers_file_data(pipeline_uuid)
    trigger_configs = yaml_config.get('triggers') or {}

    triggers_by_name = index_by(
        lambda trigger: trigger.name,
        build_triggers(trigger_configs, pipeline_uuid),
    )
    triggers_by_name[trigger.name] = trigger

    yaml_config['triggers'] = [trigger.to_dict() for trigger in triggers_by_name.values()]

    content = yaml.safe_dump(yaml_config)
    trigger_file_path = get_triggers_file_path(pipeline_uuid)
    safe_write(trigger_file_path, content)

    return triggers_by_name
