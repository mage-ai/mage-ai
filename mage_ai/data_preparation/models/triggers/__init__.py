import enum
import os
import traceback
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List

import yaml
from croniter import croniter

from mage_ai.data_preparation.models.constants import PIPELINES_FOLDER
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.constants import VALID_ENVS
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


SCHEDULE_TYPE_TO_LABEL = {
  ScheduleType.API: 'API',
  ScheduleType.EVENT: 'Event',
  ScheduleType.TIME: 'Schedule',
}


class ScheduleInterval(str, enum.Enum):
    ONCE = '@once'
    HOURLY = '@hourly'
    DAILY = '@daily'
    WEEKLY = '@weekly'
    MONTHLY = '@monthly'
    ALWAYS_ON = '@always_on'


@dataclass
class SettingsConfig(BaseConfig):
    skip_if_previous_running: bool = False
    allow_blocks_to_fail: bool = False
    create_initial_pipeline_run: bool = False
    landing_time_enabled: bool = False
    pipeline_run_limit: int = None
    timeout: int = None  # in seconds
    timeout_status: str = None


@dataclass
class Trigger(BaseConfig):
    name: str
    pipeline_uuid: str
    schedule_type: ScheduleType
    start_time: datetime
    schedule_interval: str
    status: ScheduleStatus = ScheduleStatus.INACTIVE
    last_enabled_at: datetime = None
    variables: Dict = field(default_factory=dict)
    sla: int = None     # in seconds
    settings: Dict = field(default_factory=dict)
    envs: List = field(default_factory=list)
    repo_path: str = None

    def __post_init__(self):
        if self.schedule_type and type(self.schedule_type) is str:
            self.schedule_type = ScheduleType(self.schedule_type)
        if self.status and type(self.status) is str:
            self.status = ScheduleStatus(self.status)
        if any(env not in VALID_ENVS for env in self.envs):
            raise Exception(f'Please provide valid env values inside {list(VALID_ENVS)}.')

    @property
    def has_valid_schedule_interval(self) -> bool:
        # Check if trigger has valid cron expression
        if self.schedule_interval is not None and \
            self.schedule_type == ScheduleType.TIME and \
            self.schedule_interval not in [e.value for e in ScheduleInterval] and \
                not croniter.is_valid(self.schedule_interval):
            return False

        return True

    def to_dict(self) -> Dict:
        return dict(
            envs=self.envs,
            last_enabled_at=self.last_enabled_at,
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


def get_trigger_configs_by_name(pipeline_uuid: str) -> Dict:
    yaml_config = load_triggers_file_data(pipeline_uuid)
    trigger_configs = yaml_config.get('triggers') or {}
    trigger_configs_by_name = index_by(
        lambda config: config.get('name'),
        trigger_configs,
    )

    return trigger_configs_by_name


def build_triggers(
    trigger_configs: Dict,
    pipeline_uuid: str = None,
    raise_exception: bool = False,
    repo_path: str = None,
) -> List[Trigger]:
    triggers = []
    for trigger_config in trigger_configs:
        if pipeline_uuid:
            trigger_config['pipeline_uuid'] = pipeline_uuid
        try:
            trigger = Trigger.load(config=trigger_config)
            if trigger.repo_path is None:
                trigger.repo_path = repo_path

            # Add flag to settings so frontend can detect triggers with invalid cron expressions
            if not trigger.has_valid_schedule_interval:
                trigger.settings['invalid_schedule_interval'] = True

            triggers.append(trigger)
        except Exception as e:
            if raise_exception:
                raise Exception(
                    f'Failed to parse trigger config {trigger_config}. {str(e)}') from e
            else:
                print(f'Failed to parse trigger config for pipeline {pipeline_uuid}')
                traceback.print_exc()
    return triggers


def load_trigger_configs(
    content: str,
    pipeline_uuid: str = None,
    raise_exception: bool = False,
) -> List[Trigger]:
    yaml_config = yaml.safe_load(content) or {}
    trigger_configs = yaml_config.get('triggers') or {}

    return build_triggers(
        trigger_configs, pipeline_uuid, raise_exception, repo_path=get_repo_path())


def add_or_update_trigger_for_pipeline_and_persist(
    trigger: Trigger,
    pipeline_uuid: str,
    update_only_if_exists: bool = False,
    old_trigger_name: str = None,
) -> Dict:
    trigger_configs_by_name = get_trigger_configs_by_name(pipeline_uuid)

    """
    The Trigger class has an "envs" attribute that the PipelineSchedule class does not
    have, so we need to set "envs" on the updated trigger if it already exists.
    Otherwise, it will get overwritten when updating the trigger in code.
    """
    trigger_name = trigger.name if old_trigger_name is None else old_trigger_name
    existing_trigger = trigger_configs_by_name.get(trigger_name)
    if existing_trigger is not None:
        trigger.envs = existing_trigger.get('envs', [])
    elif update_only_if_exists:
        return None

    trigger_configs_by_name[trigger_name] = trigger.to_dict()
    yaml_config = dict(triggers=list(trigger_configs_by_name.values()))
    content = yaml.safe_dump(yaml_config)
    trigger_file_path = get_triggers_file_path(pipeline_uuid)
    safe_write(trigger_file_path, content)

    return trigger_configs_by_name


def update_triggers_for_pipeline_and_persist(
    trigger_configs: List[Dict],
    pipeline_uuid: str,
) -> Dict:
    """
    Used to update all of a pipeline's triggers saved in code at once.
    Overwrites triggers in triggers.yaml config with updated triggers
    passed as first argument.
    """
    yaml_config = dict(triggers=trigger_configs)
    content = yaml.safe_dump(yaml_config)
    trigger_file_path = get_triggers_file_path(pipeline_uuid)
    safe_write(trigger_file_path, content)

    return trigger_configs


def remove_trigger(
    name: str,
    pipeline_uuid: str,
) -> Dict:
    trigger_configs_by_name = get_trigger_configs_by_name(pipeline_uuid)
    deleted_trigger = trigger_configs_by_name.pop(name, None)
    if deleted_trigger is not None:
        update_triggers_for_pipeline_and_persist(
            list(trigger_configs_by_name.values()),
            pipeline_uuid,
        )

    return deleted_trigger
