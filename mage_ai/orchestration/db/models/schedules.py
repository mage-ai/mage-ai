import asyncio
import collections
import enum
import traceback
import uuid
from datetime import datetime, timedelta, timezone
from math import ceil
from statistics import stdev
from typing import DefaultDict, Dict, List

import dateutil.parser
import pytz
from croniter import croniter
from dateutil.relativedelta import relativedelta
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    or_,
)
from sqlalchemy.orm import joinedload, relationship, validates
from sqlalchemy.sql import func, text
from sqlalchemy.sql.functions import coalesce

from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.block.dynamic.utils import (
    DynamicBlockFlag,
    all_upstreams_completed,
    check_all_dynamic_upstreams_completed,
    dynamically_created_child_block_runs,
    has_dynamic_block_upstream_parent,
    is_dynamic_block,
    is_dynamic_block_child,
    is_replicated_block,
    should_reduce_output,
)
from mage_ai.data_preparation.models.constants import (
    DATAFRAME_SAMPLE_COUNT,
    BlockType,
    ExecutorType,
    PipelineType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
    SettingsConfig,
    Trigger,
    add_or_update_trigger_for_pipeline_and_persist,
)
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.errors import ValidationError
from mage_ai.orchestration.db.models.base import Base, BaseModel, classproperty
from mage_ai.orchestration.db.models.schedules_project_platform import (
    BlockRunProjectPlatformMixin,
    PipelineRunProjectPlatformMixin,
    PipelineScheduleProjectPlatformMixin,
)
from mage_ai.orchestration.db.models.tags import Tag, TagAssociation
from mage_ai.server.kernel_output_parser import DataType
from mage_ai.settings.platform import project_platform_activated
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.constants import ENV_PROD
from mage_ai.shared.dates import compare
from mage_ai.shared.hash import ignore_keys, index_by, merge_dict
from mage_ai.shared.utils import clean_name

pipeline_schedule_event_matcher_association_table = Table(
    'pipeline_schedule_event_matcher_association',
    Base.metadata,
    Column('pipeline_schedule_id', ForeignKey('pipeline_schedule.id')),
    Column('event_matcher_id', ForeignKey('event_matcher.id')),
)


class PipelineSchedule(PipelineScheduleProjectPlatformMixin, BaseModel):
    name = Column(String(255))
    description = Column(Text)
    pipeline_uuid = Column(String(255), index=True)
    schedule_type = Column(Enum(ScheduleType))
    start_time = Column(DateTime(timezone=True), default=None)
    schedule_interval = Column(String(50))
    status = Column(Enum(ScheduleStatus), default=ScheduleStatus.INACTIVE)
    last_enabled_at = Column(DateTime(timezone=True), default=None)
    variables = Column(JSON)
    sla = Column(Integer, default=None)  # in seconds
    token = Column(String(255), index=True, default=None)
    repo_path = Column(String(255))
    settings = Column(JSON)
    global_data_product_uuid = Column(String(255), index=True, default=None)

    backfills = relationship('Backfill', back_populates='pipeline_schedule')
    pipeline_runs = relationship('PipelineRun', back_populates='pipeline_schedule')

    event_matchers = relationship(
        'EventMatcher',
        secondary=pipeline_schedule_event_matcher_association_table,
        back_populates='pipeline_schedules'
    )

    @classproperty
    def repo_query(cls):
        if project_platform_activated():
            return cls.repo_query_project_platform

        return cls.query.filter(
            or_(
                PipelineSchedule.repo_path == get_repo_path(),
                PipelineSchedule.repo_path.is_(None),
            )
        )

    @validates('name')
    def validate_name(self, key, value):
        if not value or len(value) == 0:
            raise ValidationError(f'{key} cannot be empty.', metadata=dict(
                key=key,
                value=value,
            ))

        return value

    @classmethod
    def fetch_pipeline_runs(self, ids: List[int]) -> List:
        query = PipelineRun.query
        query.cache = True
        query = query.filter(PipelineRun.pipeline_schedule_id.in_(ids))
        return query.all()

    @classmethod
    def fetch_latest_pipeline_runs_without_retries(self, ids: List[int]) -> List:
        sub_query = (
            PipelineRun.
            select(
                PipelineRun.id,
                PipelineRun.execution_date,
                PipelineRun.started_at,
                PipelineRun.status,
                (
                    func.
                    row_number().
                    over(
                        partition_by=PipelineRun.execution_date,
                        order_by=(PipelineRun.started_at.desc(), PipelineRun.id.desc())
                    ).
                    label('n_row_number')
                )
            ).
            filter(
                PipelineRun.pipeline_schedule_id.in_(ids),
            )
        ).subquery()

        query = (
            PipelineRun.
            select(sub_query).
            where(
                text('n_row_number = 1'),
            )
        )

        query.cache = True

        return query.all()

    def get_settings(self) -> 'SettingsConfig':
        settings = self.settings if self.settings else dict()
        return SettingsConfig.load(config=settings)

    @property
    def pipeline(self) -> 'Pipeline':
        if project_platform_activated():
            return self.pipeline_project_platform

        return Pipeline.get(self.pipeline_uuid)

    @property
    def pipeline_in_progress_runs_count(self) -> int:
        if project_platform_activated():
            return self.pipeline_in_progress_runs_count_project_platform

        return (
            PipelineRun.select(func.count(PipelineRun.id))
            .filter(
                PipelineRun.pipeline_schedule_id == self.id,
                PipelineRun.status.in_(
                    [
                        PipelineRun.PipelineRunStatus.INITIAL,
                        PipelineRun.PipelineRunStatus.RUNNING,
                    ]
                ),
                (coalesce(PipelineRun.passed_sla, False).is_(False)),
            )
            .scalar()
        )

    @property
    def pipeline_runs_count(self) -> int:
        if project_platform_activated():
            return self.pipeline_runs_count_project_platform

        return (
            PipelineRun.select(func.count(PipelineRun.id))
            .filter(
                PipelineRun.pipeline_schedule_id == self.id,
            )
            .scalar()
        )

    @property
    def timeout(self) -> int:
        return (self.settings or {}).get('timeout')

    @property
    def timeout_status(self) -> 'PipelineRun.PipelineRunStatus':
        return (self.settings or {}).get('timeout_status')

    @validates('schedule_interval')
    def validate_schedule_interval(self, key, schedule_interval):
        if schedule_interval and schedule_interval not in \
                [e.value for e in ScheduleInterval]:
            if not croniter.is_valid(schedule_interval):
                raise ValueError('Cron expression is invalid.')

        return schedule_interval

    @property
    def last_pipeline_run_status(self) -> str:
        if project_platform_activated():
            return self.last_pipeline_run_status_project_platform

        query_result = (
            PipelineRun.select(PipelineRun.id, PipelineRun.status)
            .filter(
                PipelineRun.pipeline_schedule_id == self.id,
            )
            .order_by(
                PipelineRun.created_at.desc(),
            )
            .first()
        )

        if query_result is None:
            return None

        return query_result.status

    @property
    def tag_associations(self):
        return (
            TagAssociation.
            select(
                TagAssociation.id,
                TagAssociation.tag_id,
                TagAssociation.taggable_id,
                TagAssociation.taggable_type,
                Tag.name,
            ).
            join(
                Tag,
                Tag.id == TagAssociation.tag_id,
            ).
            filter(
                TagAssociation.taggable_id == self.id,
                TagAssociation.taggable_type == self.__class__.__name__,
            ).
            all()
        )

    @classmethod
    @safe_db_query
    def active_schedules(self, pipeline_uuids: List[str] = None) -> List['PipelineSchedule']:
        query = self.repo_query.filter(
            self.status == ScheduleStatus.ACTIVE,
        )
        if pipeline_uuids is not None:
            query = query.filter(PipelineSchedule.pipeline_uuid.in_(pipeline_uuids))
        return query.all()

    @classmethod
    def create(self, **kwargs) -> 'PipelineSchedule':
        if 'token' not in kwargs:
            kwargs['token'] = uuid.uuid4().hex
        model = super().create(**kwargs)
        return model

    @classmethod
    @safe_db_query
    def create_or_update_batch(self, trigger_configs: List[Trigger]):
        trigger_names = []
        trigger_pipeline_uuids = []
        for trigger_config in trigger_configs:
            trigger_names.append(trigger_config.name)
            trigger_pipeline_uuids.append(trigger_config.pipeline_uuid)

        existing_pipeline_schedules = PipelineSchedule.repo_query.filter(
            PipelineSchedule.name.in_(trigger_names),
            PipelineSchedule.pipeline_uuid.in_(trigger_pipeline_uuids),
        ).all()

        existing_pipeline_schedules_mapping = index_by(
            lambda x: f'{x.pipeline_uuid}:{x.name}',
            existing_pipeline_schedules,
        )

        triggers_to_create = []

        for trigger_config in trigger_configs:
            try:
                existing_trigger = existing_pipeline_schedules_mapping.get(
                    f'{trigger_config.pipeline_uuid}:{trigger_config.name}',
                )
            except Exception:
                traceback.print_exc()
                continue

            last_enabled_at = trigger_config.last_enabled_at
            if trigger_config.status == ScheduleStatus.ACTIVE and \
                    trigger_config.last_enabled_at is None:
                last_enabled_at = datetime.now(tz=pytz.UTC)
                trigger_config.last_enabled_at = last_enabled_at
                add_or_update_trigger_for_pipeline_and_persist(
                    trigger_config,
                    trigger_config.pipeline_uuid,
                )

            kwargs = dict(
                last_enabled_at=last_enabled_at,
                name=trigger_config.name,
                pipeline_uuid=trigger_config.pipeline_uuid,
                schedule_interval=trigger_config.schedule_interval,
                schedule_type=trigger_config.schedule_type,
                settings=trigger_config.settings,
                sla=trigger_config.sla,
                start_time=trigger_config.start_time,
                status=trigger_config.status,
                variables=trigger_config.variables,
            )

            if existing_trigger:
                if any([
                    existing_trigger.last_enabled_at != kwargs.get('last_enabled_at'),
                    existing_trigger.name != kwargs.get('name'),
                    existing_trigger.pipeline_uuid != kwargs.get('pipeline_uuid'),
                    existing_trigger.schedule_interval != kwargs.get('schedule_interval'),
                    existing_trigger.schedule_type != kwargs.get('schedule_type'),
                    existing_trigger.settings != kwargs.get('settings'),
                    existing_trigger.sla != kwargs.get('sla'),
                    existing_trigger.start_time != kwargs.get('start_time'),
                    existing_trigger.status != kwargs.get('status'),
                    existing_trigger.variables != kwargs.get('variables'),
                ]):
                    if existing_trigger.token is None:
                        kwargs['token'] = uuid.uuid4().hex
                    existing_trigger.update(**kwargs)
            else:
                kwargs['token'] = uuid.uuid4().hex
                triggers_to_create.append(kwargs)

        db_connection.session.bulk_save_objects(
            [PipelineSchedule(**data) for data in triggers_to_create],
            return_defaults=True,
        )
        db_connection.session.commit()

    @classmethod
    @safe_db_query
    def create_or_update(self, trigger_config: Trigger):
        try:
            existing_trigger = PipelineSchedule.repo_query.filter(
                self.name == trigger_config.name,
                self.pipeline_uuid == trigger_config.pipeline_uuid,
            ).one_or_none()
        except Exception:
            traceback.print_exc()
            return

        kwargs = dict(
            name=trigger_config.name,
            pipeline_uuid=trigger_config.pipeline_uuid,
            schedule_type=trigger_config.schedule_type,
            start_time=trigger_config.start_time,
            schedule_interval=trigger_config.schedule_interval,
            status=trigger_config.status,
            variables=trigger_config.variables,
            sla=trigger_config.sla,
            settings=trigger_config.settings,
        )

        if existing_trigger:
            existing_trigger.update(**kwargs)
        else:
            self.create(**kwargs)

    def current_execution_date(self) -> datetime:
        """
        Calculate the current execution date and time based on the schedule_interval and start_time.

        Returns:
            datetime: The calculated current execution date and time in the UTC timezone.

        Note:
            This method calculates the current execution date and time based on the
            schedule_interval, and if landing_time is enabled, it takes the start_time into
            account to adjust the execution time accordingly.

            The returned datetime object is in the UTC timezone.
        """
        now = datetime.now(timezone.utc)
        current_execution_date = None

        if self.schedule_interval is None:
            return None

        if self.schedule_interval == ScheduleInterval.ONCE or \
                self.schedule_interval == ScheduleInterval.ALWAYS_ON:
            current_execution_date = now
        elif self.schedule_interval == ScheduleInterval.DAILY:
            current_execution_date = now.replace(second=0, microsecond=0, minute=0, hour=0)
        elif self.schedule_interval == ScheduleInterval.HOURLY:
            current_execution_date = now.replace(second=0, microsecond=0, minute=0)
        elif self.schedule_interval == ScheduleInterval.WEEKLY:
            current_execution_date = now.replace(second=0, microsecond=0, minute=0, hour=0) - \
                timedelta(days=now.weekday())
        elif self.schedule_interval == ScheduleInterval.MONTHLY:
            current_execution_date = now.replace(second=0, microsecond=0, minute=0, hour=0, day=1)
        else:
            cron_itr = croniter(self.schedule_interval, now)
            current_execution_date = cron_itr.get_prev(datetime)

        # If landing time is enabled, the start_time is used as the date and time the schedule
        # should finish running by.

        # For example, if start_time is 2023-12-01 12:25:00
        # and if the schedule_interval is @daily, then the schedule should finish running by
        # every day by 12:25:00.
        if self.landing_time_enabled() and self.start_time:
            if self.schedule_interval == ScheduleInterval.HOURLY:
                current_execution_date = current_execution_date.replace(
                    minute=self.start_time.minute,
                    second=self.start_time.second,
                )
            elif self.schedule_interval == ScheduleInterval.DAILY:
                current_execution_date = current_execution_date.replace(
                    hour=self.start_time.hour,
                    minute=self.start_time.minute,
                    second=self.start_time.second,
                )
            elif self.schedule_interval == ScheduleInterval.WEEKLY:
                current_execution_date = current_execution_date.replace(
                    hour=self.start_time.hour,
                    minute=self.start_time.minute,
                    second=self.start_time.second,
                ) + timedelta(days=self.start_time.weekday())
            elif self.schedule_interval == ScheduleInterval.MONTHLY:
                current_execution_date = current_execution_date.replace(
                    hour=self.start_time.hour,
                    minute=self.start_time.minute,
                    second=self.start_time.second,
                ) + timedelta(days=int(self.start_time.strftime('%d')) - 1)

        return current_execution_date

    def next_execution_date(self) -> datetime:
        next_execution_date = None
        current_execution_date = self.current_execution_date()

        if current_execution_date is None:
            return None

        if self.schedule_interval == ScheduleInterval.ONCE or \
                self.schedule_interval == ScheduleInterval.ALWAYS_ON:
            pass
        elif self.schedule_interval == ScheduleInterval.DAILY:
            next_execution_date = current_execution_date + timedelta(days=1)
        elif self.schedule_interval == ScheduleInterval.HOURLY:
            next_execution_date = current_execution_date + timedelta(hours=1)
        elif self.schedule_interval == ScheduleInterval.WEEKLY:
            next_execution_date = current_execution_date + timedelta(weeks=1)
        elif self.schedule_interval == ScheduleInterval.MONTHLY:
            next_execution_date = (current_execution_date + timedelta(days=32)).replace(day=1)
        else:
            cron_itr = croniter(self.schedule_interval, current_execution_date)
            next_execution_date = cron_itr.get_next(datetime)

        return next_execution_date

    @safe_db_query
    def should_schedule(
        self,
        previous_runtimes: List[int] = None,
        pipeline: Pipeline = None,
    ) -> bool:
        """
        Determine whether a pipeline schedule should be executed based on its configuration and
        history.

        Args:
            previous_runtimes (List[int], optional): A list of previous execution runtimes,
                in seconds, used for decision-making when scheduling based on landing time.
                Defaults to None.

        Returns:
            bool: True if the schedule should be executed; False otherwise.

        Note:
            This method evaluates whether a pipeline schedule should be executed, taking into
            account various factors such as the schedule's status, start time, landing time,
            schedule interval, and previous runtimes. It returns True if the schedule should be
            executed and False otherwise.
        """
        if project_platform_activated():
            return self.should_schedule_project_platform(
                previous_runtimes=previous_runtimes,
                pipeline=pipeline,
            )

        now = datetime.now(tz=pytz.UTC)

        if self.status != ScheduleStatus.ACTIVE:
            return False

        if not self.landing_time_enabled() and \
                self.start_time is not None and \
                compare(now, self.start_time.replace(tzinfo=pytz.UTC)) == -1:
            return False

        try:
            Pipeline.get(self.pipeline_uuid)
        except Exception:
            print(
                f'[WARNING] Pipeline {self.pipeline_uuid} cannot be found '
                + f'for pipeline schedule ID {self.id}.',
            )
            return False

        if self.schedule_interval == ScheduleInterval.ONCE:
            pipeline_run_count = self.pipeline_runs_count
            if pipeline_run_count == 0:
                return True
            executor_count = self.pipeline.executor_count
            # Used by streaming pipeline to launch multiple executors
            if executor_count > 1 and pipeline_run_count < executor_count:
                return True
        elif self.schedule_interval == ScheduleInterval.ALWAYS_ON:
            if self.pipeline_runs_count == 0:
                return True
            else:
                return self.last_pipeline_run_status not in [
                    PipelineRun.PipelineRunStatus.RUNNING,
                    PipelineRun.PipelineRunStatus.INITIAL,
                ]
        else:
            current_execution_date = self.current_execution_date()
            if current_execution_date is None:
                return False

            if self.last_enabled_at is None:
                """
                Check if the last_enabled_at attribute has a value (if it does not,
                it could mean that the pipeline schedule already existed and was active).
                If there is no value for last_enabled_at, we default to creating an
                initial pipeline run. Otherwise, no additional pipeline runs would be
                created for the existing pipeline schedule until it was disabled and
                re-enabled (so that the last_enabled_at attribute would get updated).
                """
                avoid_initial_pipeline_run = False
            else:
                """
                Check if "create_initial_pipeline_run" setting is not enabled. If
                it is not, check if current execution date is before the datetime
                that the pipeline schedule was last enabled in order to avoid
                the initial pipeline run.
                """
                create_initial_pipeline_run = self.get_settings().create_initial_pipeline_run
                avoid_initial_pipeline_run = compare(
                    current_execution_date,
                    self.last_enabled_at,
                ) == -1 if not create_initial_pipeline_run else False

            # If the execution date is before start time or date pipeline schedule
            # was last enabled, don't schedule it.
            if (
                self.start_time is not None and
                compare(current_execution_date, self.start_time.replace(tzinfo=pytz.UTC)) == -1
            ) or avoid_initial_pipeline_run:
                return False

            # If there is a pipeline_run with an execution_date the same as the
            # current_execution_date, then don’t schedule
            run_exists = PipelineRun.select(
                PipelineRun.query.filter(
                    PipelineRun.pipeline_schedule_id == self.id,
                    PipelineRun.execution_date == current_execution_date,
                ).exists()
            ).scalar()

            if not run_exists:
                if self.landing_time_enabled():
                    if not previous_runtimes or len(previous_runtimes) == 0:
                        return True
                    else:
                        runtime = ceil(sum(previous_runtimes) / len(previous_runtimes))

                        if len(previous_runtimes) >= 2:
                            sd = ceil(stdev(previous_runtimes) / 2)
                        else:
                            sd = 0

                        # This may cause duplicate pipeline runs to be scheduled if
                        # there is more than 1 scheduler running.
                        if datetime.now(timezone.utc) >= current_execution_date - timedelta(
                            seconds=runtime + sd,
                        ):
                            return True
                else:
                    return True
        return False

    def landing_time_enabled(self) -> bool:
        if ScheduleType.TIME != self.schedule_type:
            return False

        if self.schedule_interval not in [
            ScheduleInterval.DAILY,
            ScheduleInterval.HOURLY,
            ScheduleInterval.MONTHLY,
            ScheduleInterval.WEEKLY,
        ]:
            return False

        return (self.settings or {}).get('landing_time_enabled', False)

    def recently_completed_pipeline_runs(
        self,
        pipeline_run=None,
        sample_size: int = None,
    ):
        pipeline_runs = (
            PipelineRun.
            query.
            filter(
                PipelineRun.pipeline_schedule_id == self.id,
                PipelineRun.status == PipelineRun.PipelineRunStatus.COMPLETED,
            )
        )

        if pipeline_run:
            pipeline_runs = (
                pipeline_runs.
                filter(
                    PipelineRun.id != pipeline_run.id,
                )
            )

        pipeline_runs = (
            pipeline_runs.
            order_by(PipelineRun.execution_date.desc())
        )

        if sample_size:
            pipeline_runs = pipeline_runs.limit(sample_size)

        pipeline_runs = pipeline_runs.all()

        pipeline_runs = sorted(
            pipeline_runs,
            key=lambda pr: pr.execution_date,
            reverse=True,
        )

        return pipeline_runs

    def runtime_history(
        self,
        pipeline_run=None,
        sample_size: int = None,
    ) -> List[float]:
        sample_size_to_use = sample_size if sample_size else 7
        previous_runtimes = []

        if pipeline_run:
            previous_runtimes += (pipeline_run.metrics or {}).get('previous_runtimes', [])

        if len(previous_runtimes) < sample_size_to_use - 1 if pipeline_run else sample_size_to_use:
            pipeline_runs = self.recently_completed_pipeline_runs(
                pipeline_run=pipeline_run,
                sample_size=sample_size_to_use,
            )

            for pr in pipeline_runs:
                runtime = (
                    pr.completed_at - pr.created_at
                ).total_seconds()
                previous_runtimes.append(runtime)

        if pipeline_run:
            runtime = (
                pipeline_run.completed_at - pipeline_run.created_at
            ).total_seconds()
            previous_runtimes = [runtime] + previous_runtimes

        return previous_runtimes[:sample_size_to_use]

    def runtime_average(
        self,
        pipeline_run=None,
        sample_size: int = None,
    ) -> float:
        previous_runtimes = self.runtime_history(
            pipeline_run=pipeline_run,
            sample_size=sample_size,
        )

        if len(previous_runtimes) == 0:
            return None

        return round(sum(previous_runtimes) / len(previous_runtimes), 2)


class PipelineRun(PipelineRunProjectPlatformMixin, BaseModel):
    class PipelineRunStatus(str, enum.Enum):
        INITIAL = 'initial'
        RUNNING = 'running'
        COMPLETED = 'completed'
        FAILED = 'failed'
        CANCELLED = 'cancelled'

    pipeline_schedule_id = Column(Integer, ForeignKey('pipeline_schedule.id'), index=True)
    pipeline_uuid = Column(String(255), index=True)
    execution_date = Column(DateTime(timezone=True), index=True)
    status = Column(Enum(PipelineRunStatus), default=PipelineRunStatus.INITIAL, index=True)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    variables = Column(JSON)
    passed_sla = Column(Boolean, default=False)
    event_variables = Column(JSON)
    metrics = Column(JSON)
    backfill_id = Column(Integer, ForeignKey('backfill.id'), index=True)
    executor_type = Column(Enum(ExecutorType), default=ExecutorType.LOCAL_PYTHON)

    pipeline_schedule = relationship(PipelineSchedule, back_populates='pipeline_runs')
    block_runs = relationship('BlockRun', back_populates='pipeline_run')
    backfill = relationship('Backfill', back_populates='pipeline_runs')

    def __init__(self, **kwargs):
        self.global_data_product_uuid = kwargs.get('global_data_product_uuid', None)
        kwargs.pop('global_data_product_uuid', None)
        super().__init__(**kwargs)

    def __repr__(self):
        return f'PipelineRun(id={self.id}, pipeline_uuid={self.pipeline_uuid},'\
               f' execution_date={self.execution_date})'

    @property
    def block_runs_count(self) -> int:
        return len(self.block_runs)

    @property
    def completed_block_runs_count(self) -> int:
        return len(self.completed_block_runs)

    @property
    def execution_partition(self) -> str:
        if self.variables and \
                isinstance(self.variables, dict) and \
                self.variables.get('execution_partition'):

            return self.variables.get('execution_partition')
        if self.execution_date is None:
            return str(self.pipeline_schedule_id)
        else:
            return '/'.join([
                        str(self.pipeline_schedule_id),
                        self.execution_date.strftime(format='%Y%m%dT%H%M%S'),
                    ])

    @property
    def initial_block_runs(self) -> List['BlockRun']:
        return [b for b in self.block_runs
                if b.status == BlockRun.BlockRunStatus.INITIAL]

    @property
    def running_block_runs(self) -> List['BlockRun']:
        return [
            b for b in self.block_runs
            if b.status == BlockRun.BlockRunStatus.RUNNING
        ]

    @property
    def queued_or_running_block_runs(self) -> List['BlockRun']:
        return [
            b for b in self.block_runs
            if b.status in [
                BlockRun.BlockRunStatus.QUEUED,
                BlockRun.BlockRunStatus.RUNNING,
            ]
        ]

    @property
    def completed_block_runs(self) -> List['BlockRun']:
        return [b for b in self.block_runs
                if b.status == BlockRun.BlockRunStatus.COMPLETED]

    @property
    def failed_block_runs(self) -> List['BlockRun']:
        return [b for b in self.block_runs
                if b.status == BlockRun.BlockRunStatus.FAILED]

    @property
    def pipeline(self) -> 'Pipeline':
        if project_platform_activated():
            return self.pipeline_project_platform

        return Pipeline.get(self.pipeline_uuid)

    @property
    def pipeline_type(self) -> PipelineType:
        pipeline = Pipeline.get(self.pipeline_uuid, check_if_exists=True)

        return pipeline.type if pipeline is not None else None

    @property
    def logs(self):
        return LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=self.pipeline_uuid,
            partition=self.execution_partition,
            repo_config=self.pipeline.repo_config,
        ).get_logs()

    @classmethod
    def recently_completed_pipeline_runs(
        self,
        pipeline_uuid: str,
        pipeline_run_id: int = None,
        pipeline_schedule_id: int = None,
        sample_size: int = None,
    ):
        pipeline_runs = (
            self.
            query.
            filter(
                self.pipeline_uuid == pipeline_uuid,
                self.status == self.PipelineRunStatus.COMPLETED,
            )
        )

        if pipeline_run_id is not None:
            pipeline_runs = pipeline_runs.filter(self.id != pipeline_run_id)

        if pipeline_schedule_id is not None:
            pipeline_runs = pipeline_runs.filter(self.pipeline_schedule_id == pipeline_schedule_id)

        pipeline_runs = pipeline_runs.order_by(PipelineRun.execution_date.desc())

        if sample_size:
            pipeline_runs = pipeline_runs.limit(sample_size)

        pipeline_runs = pipeline_runs.all()
        pipeline_runs = sorted(
            pipeline_runs,
            key=lambda pr: pr.execution_date,
            reverse=True,
        )

        return pipeline_runs

    async def logs_async(self):
        if project_platform_activated():
            return await self.logs_async_project_platform()

        return await LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=self.pipeline_uuid,
            partition=self.execution_partition,
            repo_config=self.pipeline.repo_config,
        ).get_logs_async()

    @property
    def pipeline_schedule_name(self):
        return self.pipeline_schedule.name

    @property
    def pipeline_schedule_token(self):
        return self.pipeline_schedule.token

    @property
    def pipeline_schedule_type(self):
        return self.pipeline_schedule.schedule_type

    @property
    def pipeline_tags(self):
        pipeline = Pipeline.get(self.pipeline_uuid, check_if_exists=True)

        return pipeline.tags if pipeline is not None else []

    def executable_block_runs(
        self,
        allow_blocks_to_fail: bool = False,
    ) -> List['BlockRun']:
        """Get the list of executable block runs.

        This property returns a list of block runs that are considered executable for the
        pipeline run. It first builds the block UUIDs for the completed block runs and the block
        runs in progress.
        The method iterates over the initial block runs and determines their executability based
        on the status of their dynamic upstream block runs or upstream blocks.
        * If the block run has dynamic upstream block UUIDs, it checks if all of them are present in
        the finished block UUIDs or completed block UUIDs depending on the `allow_blocks_to_fail`
        flag.
        * If the block run does not have dynamic upstream block UUIDs, it checks if all upstream
        blocks are completed.
        If a block run's upstream blocks all completed, it is added to the list of executable block
        runs.

        Returns:
            List[BlockRun]: A list of executable block runs for the pipeline run.
        """

        pipeline = self.pipeline

        def _build_block_uuids(block_runs: List[BlockRun]) -> List[str]:
            arr = set()

            for block_run in block_runs:
                if block_run.status in [
                    BlockRun.BlockRunStatus.COMPLETED,
                    BlockRun.BlockRunStatus.UPSTREAM_FAILED,
                    BlockRun.BlockRunStatus.FAILED,
                ]:
                    block_uuid = block_run.block_uuid
                    block = pipeline.get_block(block_uuid)
                    arr.add(block_uuid)

                    # Block runs for replicated blocks have the following block UUID convention:
                    # [block.uuid]:[block.replicated_block]
                    if block and block.replicated_block:
                        arr.add(block.uuid)

            return arr

        completed_block_uuids = _build_block_uuids(self.completed_block_runs)
        finished_block_uuids = _build_block_uuids(self.block_runs)

        block_runs_all = []

        data_integration_block_uuids_mapping = {}
        for block_run in self.block_runs:
            block_runs_all.append(block_run)

            block = pipeline.get_block(block_run.block_uuid)
            metrics = block_run.metrics
            """
            controller
            {
                "controller": 1,
                "original_block_uuid": "...",
            }

            controller child of controller
            {
                "controller": 1,
                "child": 1,
                "original_block_uuid": "...",
                "controller_block_uuid": "controller_block_uuid",
            }

            child of controller child
            {
                "child": 1,
                "original_block_uuid": "...",
                "controller_block_uuid": "controller_child_block_uuid",
            }

            original block run
            {
                "original": 1,
            }
            """
            if metrics and block and block.is_data_integration():
                original_block_uuid = metrics.get('original_block_uuid')

                if original_block_uuid and metrics.get('child'):
                    if not metrics.get('controller') or not metrics.get('run_in_parallel'):
                        if original_block_uuid not in data_integration_block_uuids_mapping:
                            data_integration_block_uuids_mapping[original_block_uuid] = []

                        data_integration_block_uuids_mapping[original_block_uuid].append(
                            block_run.block_uuid,
                        )

        executable_block_runs = []
        for block_run in self.initial_block_runs:
            completed = False
            upstream_block_uuids_override = None

            dynamic_upstream_block_uuids = None
            dynamic_block_index = None

            if block_run.metrics:
                """
                {
                  "dynamic_upstream_block_uuids": [
                    "snowy_flower",
                    "white_dew"
                  ],
                  "dynamic_block_index": 0
                }
                """
                metrics = block_run.metrics
                if 'dynamic_upstream_block_uuids' in metrics and 'dynamic_block_index' in metrics:
                    dynamic_upstream_block_uuids = metrics['dynamic_upstream_block_uuids']
                    dynamic_block_index = metrics['dynamic_block_index']
                elif metrics.get('upstream_blocks'):
                    upstream_block_uuids_override = metrics.get('upstream_blocks') or None

            block = pipeline.get_block(block_run.block_uuid)

            if block and is_dynamic_block_child(block):
                if check_all_dynamic_upstreams_completed(
                    block,
                    block_runs_all,
                    execution_partition=self.execution_partition
                ):
                    completed = True
                else:
                    continue
            elif dynamic_upstream_block_uuids is not None and dynamic_block_index is not None:
                uuids_to_check = []
                for upstream_block_uuid in dynamic_upstream_block_uuids:
                    upstream_block = pipeline.get_block(upstream_block_uuid)
                    if is_dynamic_block_child(upstream_block):
                        uuids_to_check.append(upstream_block_uuid)
                    else:
                        uuids_to_check.append(upstream_block_uuid)

                if allow_blocks_to_fail:
                    completed = all(uuid in finished_block_uuids
                                    for uuid in uuids_to_check)
                else:
                    completed = all(uuid in completed_block_uuids
                                    for uuid in uuids_to_check)
            else:
                metrics = block_run.metrics

                if not block and metrics and metrics.get('hook'):
                    from mage_ai.data_preparation.models.block.hook.block import (
                        HookBlock,
                    )
                    from mage_ai.data_preparation.models.global_hooks.models import Hook

                    hook = Hook.load(**(metrics.get('hook') or {}))
                    block = HookBlock(
                        hook.uuid,
                        hook.uuid,
                        BlockType.HOOK,
                        hook=hook,
                    )

                if metrics and block and block.is_data_integration():
                    if metrics.get('original'):
                        # If this is the original block, it must depend on all the children
                        # except the children that are controllers.
                        # If a child controller has run_in_parallel False, then the original block
                        # must depend on that as well.

                        child_block_uuids = data_integration_block_uuids_mapping.get(
                            block.uuid,
                        )
                        controller_block_uuid = metrics.get('controller_block_uuid')

                        if child_block_uuids:
                            upstream_block_uuids_override = child_block_uuids
                        elif controller_block_uuid:
                            upstream_block_uuids_override = [
                                controller_block_uuid,
                            ]
                    elif metrics.get('controller') and \
                            metrics.get('child') and not \
                            metrics.get('run_in_parallel') and \
                            metrics.get('upstream_block_uuids'):

                        upstream_block_uuids_override = metrics.get('upstream_block_uuids')
                elif metrics and metrics.get('dynamic_upstream_block_uuids'):
                    upstream_block_uuids_override = \
                        metrics.get('dynamic_upstream_block_uuids') or []

                incomplete = False
                if block:
                    up_uuids = []
                    up_uuids_dynamic_children = []

                    for upstream_block in block.upstream_blocks:
                        if incomplete:
                            continue

                        if is_dynamic_block_child(upstream_block):
                            if should_reduce_output(upstream_block):
                                upstream_upstream_completed = all_upstreams_completed(
                                    upstream_block,
                                    block_runs_all,
                                )
                                if upstream_upstream_completed:
                                    brs = dynamically_created_child_block_runs(
                                        pipeline,
                                        upstream_block,
                                        block_runs_all,
                                    )
                                    up_uuids_dynamic_children += [br.block_uuid for br in brs]
                                else:
                                    incomplete = True
                        else:
                            up_uuids.append(upstream_block.uuid)

                        if len(up_uuids_dynamic_children) >= 1:
                            upstream_block_uuids_override = \
                                (upstream_block_uuids_override or []) + \
                                up_uuids + up_uuids_dynamic_children

                completed = not incomplete and block is not None and \
                    block.all_upstream_blocks_completed(
                        completed_block_uuids,
                        upstream_block_uuids_override,
                    )

            if completed:
                executable_block_runs.append(block_run)

        return executable_block_runs

    def update_block_run_statuses(self, block_runs: List['BlockRun']) -> None:
        """Update the statuses of the block runs to CONDITION_FAILED or UPSTREAM_FAILED.

        This method updates the statuses of the block runs based on the pipeline run's block runs.
        It retrieves the block UUIDs for failed block runs and conditionally failed block runs.
        It maps the block run statuses to their corresponding block UUIDs.

        The method iterates overthe provided block runs and checks if their dynamic upstream block
        UUIDs or upstream block UUIDs match the failed or conditionally failed block UUIDs.
        * If there is a match, the block run's status is updated accordingly.
        * If no updates are made for a block run, it is added to the list of not updated block runs.

        The method refreshes the pipeline run and continues iterating through block runs until no
        more updates can be made.

        Args:
            block_runs (List[BlockRun]): A list of block runs to update.

        Returns:
            None
        """
        pipeline = self.pipeline

        failed_block_uuids = set(
            b.block_uuid for b in self.block_runs
            if b.status in [
                BlockRun.BlockRunStatus.UPSTREAM_FAILED,
                BlockRun.BlockRunStatus.FAILED,
            ]
        )
        condition_failed_block_uuids = set(
            b.block_uuid for b in self.block_runs
            if b.status in [
                BlockRun.BlockRunStatus.CONDITION_FAILED,
            ]
        )

        statuses = {
            BlockRun.BlockRunStatus.CONDITION_FAILED: condition_failed_block_uuids,
            BlockRun.BlockRunStatus.UPSTREAM_FAILED: failed_block_uuids,
        }
        not_updated_block_runs = []
        for block_run in block_runs:
            updated_status = False
            dynamic_upstream_block_uuids = block_run.metrics and block_run.metrics.get(
                'dynamic_upstream_block_uuids',
            )

            for status, block_uuids in statuses.items():
                upstream_block_uuids = []
                if dynamic_upstream_block_uuids:
                    upstream_block_uuids = dynamic_upstream_block_uuids
                else:
                    block = pipeline.get_block(block_run.block_uuid)
                    if block:
                        upstream_block_uuids = block.upstream_block_uuids
                        # If an upstream dynamic child fails, the block_run.block_uuid won’t match.
                        if block_run.block_uuid == block.uuid:
                            block_uuids = list(block_uuids) + [pipeline.get_block(
                                block_inner,
                            ).uuid for block_inner in block_uuids]
                if any(
                    b in block_uuids
                    for b in upstream_block_uuids
                ):
                    block_run.update(status=status)
                    updated_status = True

            if not updated_status:
                not_updated_block_runs.append(block_run)

        self.refresh()
        # keep iterating through block runs until no more updates can be made
        if len(block_runs) != len(not_updated_block_runs):
            self.update_block_run_statuses(not_updated_block_runs)

    @classmethod
    @safe_db_query
    def active_runs_for_pipelines(
        self,
        pipeline_uuids: List[str],
        include_block_runs: bool = False,
    ) -> List['PipelineRun']:
        # Filter by schedules because pipelines across repos can potentially
        # have the same uuid
        repo_schedules = PipelineSchedule.repo_query.filter(
            PipelineSchedule.pipeline_uuid.in_(pipeline_uuids)
        ).all()
        schedule_ids = [s.id for s in repo_schedules]
        query = self.query.filter(
            self.status == self.PipelineRunStatus.RUNNING,
            self.pipeline_schedule_id.in_(schedule_ids),
        )
        if include_block_runs:
            query = query.options(joinedload(PipelineRun.block_runs))
        return query.all()

    @classmethod
    @safe_db_query
    def active_runs_for_pipelines_grouped(
        self,
        pipeline_uuids: List[str],
        include_block_runs: bool = False,
    ) -> DefaultDict[str, List['PipelineRun']]:
        """
        Get a dictionary of active pipeline runs grouped by pipeline uuid.
        """

        active_runs = self.active_runs_for_pipelines(
            pipeline_uuids,
            include_block_runs=include_block_runs,
        )
        grouped = collections.defaultdict(list)
        for run in active_runs:
            grouped[run.pipeline_uuid].append(run)
        return grouped

    @classmethod
    @safe_db_query
    def batch_update_status(self, pipeline_run_ids: List[int], status):
        PipelineRun.query.filter(PipelineRun.id.in_(pipeline_run_ids)).update({
            PipelineRun.status: status
        }, synchronize_session=False)
        db_connection.session.commit()

    @classmethod
    def create(
        self,
        create_block_runs: bool = True,
        prevent_duplicates: bool = False,
        **kwargs,
    ) -> 'PipelineRun':
        """
        Create a new PipelineRun instance.

        Args:
            create_block_runs (bool, optional): Whether to create associated block runs.
                Default is True.
            prevent_duplicates (bool, optional): If True, checks for existing PipelineRun with the
                same execution date, pipeline schedule ID, and pipeline UUID, and returns None
                if found. Default is False.
            **kwargs: Additional keyword arguments to be passed to the super().create() method.

        Returns:
            PipelineRun or None: The created PipelineRun instance if successful, None if
                prevent_duplicates is True and a matching PipelineRun already exists.
        """
        if prevent_duplicates:
            existing_pipeline_run = PipelineRun.query.filter(
                PipelineRun.execution_date == kwargs.get('execution_date'),
                PipelineRun.pipeline_schedule_id == kwargs.get('pipeline_schedule_id'),
                PipelineRun.pipeline_uuid == kwargs.get('pipeline_uuid'),
            ).first()
            if existing_pipeline_run is not None:
                return None

        pipeline_run = super().create(**kwargs)
        pipeline_uuid = kwargs.get('pipeline_uuid')
        if pipeline_uuid is not None and create_block_runs:
            pipeline_run.create_block_runs()

        return pipeline_run

    @classmethod
    @safe_db_query
    def in_progress_runs(
        self,
        pipeline_schedules: List[int],
    ):
        return self.query.filter(
            PipelineRun.pipeline_schedule_id.in_(pipeline_schedules),
            PipelineRun.status.in_([
                self.PipelineRunStatus.INITIAL,
                self.PipelineRunStatus.RUNNING,
            ]),
            (coalesce(PipelineRun.passed_sla, False) == False),  # noqa: E712
        ).all()

    @safe_db_query
    def complete(self):
        self.update(
            completed_at=datetime.now(tz=pytz.UTC),
            status=self.PipelineRunStatus.COMPLETED,
        )

        from mage_ai.usage_statistics.logger import UsageStatisticLogger
        asyncio.run(UsageStatisticLogger().pipeline_runs_impression(
            lambda: self.query.filter(self.status == self.PipelineRunStatus.COMPLETED).count(),
        ))

    @safe_db_query
    def create_block_run(
        self,
        block_uuid: str,
        raise_if_exists: bool = False,
        skip_if_exists: bool = False,
        **kwargs,
    ) -> 'BlockRun':
        if raise_if_exists or skip_if_exists:
            br = BlockRun.get(
                pipeline_run_id=self.id,
                block_uuid=block_uuid,
            )
            if br is not None:
                if raise_if_exists:
                    raise Exception(
                        f'Block run with block_uuid {block_uuid} already exists; ID {br.id}.',
                    )
                return br
        return BlockRun.create(
            block_uuid=block_uuid,
            pipeline_run_id=self.id,
            **kwargs,
        )

    def create_block_runs(self) -> List['BlockRun']:
        pipeline = self.pipeline
        blocks = pipeline.get_executable_blocks()

        block_arr = []

        for block in blocks:
            create_options = {}
            block_uuid = block.uuid

            if block.replicated_block:
                replicated_block = pipeline.get_block(block.replicated_block)
                if replicated_block:
                    block_uuid = f'{block.uuid}:{replicated_block.uuid}'
                else:
                    raise Exception(
                        f'Replicated block {block.replicated_block} ' +
                        f'does not exist in pipeline {pipeline.uuid}.',
                    )
            elif block.is_data_integration():
                controller_uuid = block.controller_uuid
                create_options['metrics'] = dict(
                    controller_block_uuid=controller_uuid,
                    original=1,
                )

                block_arr.append((
                    controller_uuid,
                    dict(metrics=dict(
                        controller=1,
                        original_block_uuid=block_uuid,
                    )),
                ))

            flags = []

            if has_dynamic_block_upstream_parent(block):
                flags.extend([
                    DynamicBlockFlag.DYNAMIC_CHILD,
                    DynamicBlockFlag.ORIGINAL,
                ])
            elif is_dynamic_block_child(block):
                flags.append(DynamicBlockFlag.DYNAMIC_CHILD)

            if is_dynamic_block(block):
                flags.append(DynamicBlockFlag.DYNAMIC)

            if is_replicated_block(block):
                flags.append(DynamicBlockFlag.REPLICATED)

            if should_reduce_output(block):
                flags.append(DynamicBlockFlag.REDUCE_OUTPUT)

            if len(flags) >= 1:
                create_options['metrics'] = dict(metadata=dict(
                    flags=flags,
                ))

            block_arr.append((block_uuid, create_options))

        from mage_ai.data_preparation.models.global_hooks.pipelines import (
            attach_global_hook_execution,
        )

        block_arr = attach_global_hook_execution(
            self,
            pipeline,
            block_arr,
        )

        return [self.create_block_run(block_uuid, **options) for block_uuid, options in block_arr]

    def any_blocks_failed(self) -> bool:
        return any(
            b.status == BlockRun.BlockRunStatus.FAILED
            for b in self.block_runs
        )

    def all_blocks_completed(self, include_failed_blocks: bool = False) -> bool:
        statuses = [
            BlockRun.BlockRunStatus.COMPLETED,
            BlockRun.BlockRunStatus.CONDITION_FAILED,
        ]
        if include_failed_blocks:
            statuses.extend([
                BlockRun.BlockRunStatus.FAILED,
                BlockRun.BlockRunStatus.UPSTREAM_FAILED,
            ])
        return all(b.status in statuses for b in self.block_runs)

    def get_variables(self, extra_variables: Dict = None, pipeline_uuid: str = None) -> Dict:
        if project_platform_activated():
            return self.get_variables_project_platform(
                extra_variables=extra_variables,
                pipeline_uuid=pipeline_uuid,
            )

        if extra_variables is None:
            extra_variables = dict()

        pipeline_run_variables = self.variables or {}
        event_variables = self.event_variables or {}

        variables = merge_dict(
            merge_dict(
                get_global_variables(pipeline_uuid or self.pipeline_uuid) or dict(),
                self.pipeline_schedule.variables or dict(),
            ),
            pipeline_run_variables,
        )

        # For backwards compatibility
        for k, v in event_variables.items():
            if k not in variables:
                variables[k] = v

        if self.execution_date:
            variables['ds'] = self.execution_date.strftime('%Y-%m-%d')
            variables['hr'] = self.execution_date.strftime('%H')

        variables['env'] = ENV_PROD
        variables['event'] = merge_dict(variables.get('event', {}), event_variables)
        variables['execution_date'] = self.execution_date
        variables['execution_partition'] = self.execution_partition

        interval_end_datetime = variables.get('interval_end_datetime')
        interval_seconds = variables.get('interval_seconds')
        interval_start_datetime = variables.get('interval_start_datetime')
        interval_start_datetime_previous = variables.get('interval_start_datetime_previous')

        if interval_end_datetime or \
                interval_seconds or \
                interval_start_datetime or \
                interval_start_datetime_previous:
            if interval_end_datetime:
                try:
                    variables['interval_end_datetime'] = dateutil.parser.parse(
                        interval_end_datetime,
                    )
                except Exception as err:
                    print(f'[ERROR] PipelineRun.get_variables: {err}')

            if interval_start_datetime:
                try:
                    variables['interval_start_datetime'] = dateutil.parser.parse(
                        interval_start_datetime,
                    )
                except Exception as err:
                    print(f'[ERROR] PipelineRun.get_variables: {err}')

            if interval_start_datetime_previous:
                try:
                    variables['interval_start_datetime_previous'] = dateutil.parser.parse(
                        interval_start_datetime_previous,
                    )
                except Exception as err:
                    print(f'[ERROR] PipelineRun.get_variables: {err}')
        elif self.execution_date and ScheduleType.TIME == self.pipeline_schedule.schedule_type:
            interval_end_datetime = None
            interval_seconds = None
            interval_start_datetime = self.execution_date
            interval_start_datetime_previous = None

            if ScheduleInterval.DAILY == self.pipeline_schedule.schedule_interval:
                interval_seconds = 60 * 60 * 24
            elif ScheduleInterval.HOURLY == self.pipeline_schedule.schedule_interval:
                interval_seconds = 60 * 60 * 1
            elif ScheduleInterval.MONTHLY == self.pipeline_schedule.schedule_interval:
                interval_end_datetime = interval_start_datetime + relativedelta(months=1)
                interval_seconds = (
                    interval_end_datetime.timestamp() - interval_start_datetime.timestamp()
                )
            elif ScheduleInterval.WEEKLY == self.pipeline_schedule.schedule_interval:
                interval_seconds = 60 * 60 * 24 * 7

            if interval_seconds and not interval_end_datetime:
                interval_end_datetime = interval_start_datetime + timedelta(
                    seconds=interval_seconds,
                )

            if interval_seconds and interval_start_datetime:
                interval_start_datetime_previous = interval_start_datetime - timedelta(
                    seconds=interval_seconds,
                )

            variables['interval_end_datetime'] = interval_end_datetime
            variables['interval_seconds'] = interval_seconds
            variables['interval_start_datetime'] = interval_start_datetime
            variables['interval_start_datetime_previous'] = interval_start_datetime_previous

        variables.update(extra_variables)

        return variables


class BlockRun(BlockRunProjectPlatformMixin, BaseModel):
    class BlockRunStatus(str, enum.Enum):
        INITIAL = 'initial'
        QUEUED = 'queued'
        RUNNING = 'running'
        COMPLETED = 'completed'
        FAILED = 'failed'
        CANCELLED = 'cancelled'
        UPSTREAM_FAILED = 'upstream_failed'
        CONDITION_FAILED = 'condition_failed'

    pipeline_run_id = Column(Integer, ForeignKey('pipeline_run.id'), index=True)
    block_uuid = Column(String(255))
    status = Column(Enum(BlockRunStatus), default=BlockRunStatus.INITIAL)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    metrics = Column(JSON)

    pipeline_run = relationship(PipelineRun, back_populates='block_runs')

    @property
    def logs(self):
        pipeline = Pipeline.get(self.pipeline_run.pipeline_uuid)
        return LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=pipeline.uuid,
            block_uuid=clean_name(self.block_uuid),
            partition=self.pipeline_run.execution_partition,
            repo_config=pipeline.repo_config,
        ).get_logs()

    async def logs_async(self, repo_path: str = None):
        if project_platform_activated():
            return await self.logs_async_project_platform(repo_path=repo_path)

        pipeline = await Pipeline.get_async(self.pipeline_run.pipeline_uuid)
        return await LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=pipeline.uuid,
            block_uuid=clean_name(self.block_uuid),
            partition=self.pipeline_run.execution_partition,
            repo_config=pipeline.repo_config,
        ).get_logs_async()

    @classmethod
    @safe_db_query
    def batch_update_status(self, block_run_ids: List[int], status):
        BlockRun.query.filter(BlockRun.id.in_(block_run_ids)).update({
            BlockRun.status: status
        }, synchronize_session=False)
        db_connection.session.commit()

    @classmethod
    @safe_db_query
    def batch_delete(self, block_run_ids: List[int]):
        BlockRun.query.filter(BlockRun.id.in_(block_run_ids)).delete(
            synchronize_session=False
        )
        db_connection.session.commit()

    @classmethod
    @safe_db_query
    def get(self, pipeline_run_id: int = None, block_uuid: str = None) -> 'BlockRun':
        block_runs = self.query.filter(
            BlockRun.pipeline_run_id == pipeline_run_id,
            BlockRun.block_uuid == block_uuid,
        ).all()
        if len(block_runs) > 0:
            return block_runs[0]
        return None

    def get_outputs(self, sample_count: int = None) -> List[Dict]:
        pipeline = Pipeline.get(self.pipeline_run.pipeline_uuid)
        block = pipeline.get_block(self.block_uuid)
        block_uuid = self.block_uuid

        if self.metrics and block.is_data_integration():
            child = self.metrics.get('child')
            controller = self.metrics.get('controller')

            # Data integration child block run
            if child:
                # [block UUID]:[source destination UUID]:[stream]:[controller|index]
                parts = self.block_uuid.split(':')
                if len(parts) >= 4:
                    source_destination_uuid = parts[1]
                    stream = parts[2]
                    index = parts[3]

                    if controller:
                        return [
                            dict(
                                text_data='This block run controls all the child blocks '
                                f'starting with {block.uuid} for stream {stream}.\n'
                                'To view the output of this block, click on the child block runs '
                                'that start with\n'
                                f'{block.uuid}:{source_destination_uuid}:{stream}:[index].',
                                type=DataType.TEXT,
                                variable_uuid='controller',
                            ),
                        ]
                    else:
                        data = pipeline.get_block_variable(
                            block_uuid=block.uuid,
                            variable_name=stream,
                            partition=self.pipeline_run.execution_partition,
                            index=index,
                            sample_count=sample_count or DATAFRAME_SAMPLE_COUNT,
                        )
                        if data:
                            columns = data.get('columns')
                            return [
                                dict(
                                    sample_data=dict(
                                        columns=columns,
                                        rows=data.get('rows'),
                                    ),
                                    shape=[None, len(columns)],
                                    type=DataType.TABLE,
                                    variable_uuid=stream,
                                ),
                            ]
            elif controller and not child:
                return [
                    dict(
                        text_data='This block run controls all the child blocks '
                        f'starting with {block.uuid}.\n'
                        'To view the output of this block, click on the child block runs that '
                        f'start with\n{block.uuid}:[source|destination]:[stream].',
                        type=DataType.TEXT,
                        variable_uuid='controller',
                    ),
                ]
            elif self.metrics.get('original'):
                return [
                    dict(
                        text_data='This block run is the last one in the set of block runs '
                        f'starting with {block.uuid}.\n'
                        'To view the output of this block, click on the child block runs that '
                        f'start with\n{block.uuid}:[source|destination]:[stream].',
                        type=DataType.TEXT,
                        variable_uuid='original',
                    ),
                ]

        return block.get_outputs(
            execution_partition=self.pipeline_run.execution_partition,
            sample_count=sample_count,
            block_uuid=block_uuid,
            metadata=self.metrics.get('metadata') if self.metrics else None,
            dynamic_block_index=self.metrics.get('dynamic_block_index') if self.metrics else None,
        )


class EventMatcher(BaseModel):
    class EventType(str, enum.Enum):
        AWS_EVENT = 'aws_event'

    event_type = Column(Enum(EventType), default=EventType.AWS_EVENT)
    name = Column(String(255))
    pattern = Column(JSON)

    pipeline_schedules = relationship(
        'PipelineSchedule',
        secondary=pipeline_schedule_event_matcher_association_table,
        back_populates='event_matchers',
    )

    def __repr__(self):
        return f'EventMatcher(id={self.id}, name={self.name}, pattern={self.pattern})'

    @classmethod
    def active_event_matchers(self) -> List['EventMatcher']:
        return self.query.filter(
            EventMatcher.pipeline_schedules.any(
                PipelineSchedule.status == ScheduleStatus.ACTIVE
            )
        ).all()

    @classmethod
    def upsert_batch(self, event_matchers_payload):
        keys_to_ignore = [
            'created_at',
            'id',
            'updated_at',
        ]

        new_arr = []
        existing_arr = []

        pipeline_schedule_ids = []
        for payload in event_matchers_payload:
            pipeline_schedule_ids += payload.get('pipeline_schedule_ids', [])
            if payload.get('id'):
                existing_arr.append(payload)
            else:
                new_arr.append(payload)

        pipeline_schedules_by_id = index_by(
            lambda x: x.id,
            PipelineSchedule.query.filter(
                PipelineSchedule.id.in_(pipeline_schedule_ids),
            ).all(),
        )

        event_matchers_and_pipeline_schedule_ids = []
        event_matchers_by_id = index_by(
            lambda x: x.id,
            self.query.filter(
                self.id.in_([p['id'] for p in existing_arr]),
            ).all(),
        )
        for payload in existing_arr:
            ids = payload.pop('pipeline_schedule_ids', None)
            event_matcher = event_matchers_by_id[payload['id']]
            event_matcher.update(**ignore_keys(payload, keys_to_ignore))
            event_matchers_and_pipeline_schedule_ids.append((event_matcher, ids))

        for payload in new_arr:
            ids = payload.pop('pipeline_schedule_ids', None)
            event_matcher = self.create(**ignore_keys(payload, keys_to_ignore))
            event_matchers_and_pipeline_schedule_ids.append((event_matcher, ids))

        for event_matcher, ids in event_matchers_and_pipeline_schedule_ids:
            if ids is not None:
                ps = [pipeline_schedules_by_id[i] for i in [int(i) for i in ids]]
                event_matcher.update(pipeline_schedules=ps)

            if event_matcher.event_type == EventMatcher.EventType.AWS_EVENT:
                from mage_ai.services.aws.events.events import update_event_rule_targets

                # For AWS event, update related AWS infra (add trigger to lambda function)
                update_event_rule_targets(event_matcher.name)

        return [t[0] for t in event_matchers_and_pipeline_schedule_ids]

    def active_pipeline_schedules(self) -> List[PipelineSchedule]:
        return [p for p in self.pipeline_schedules
                if p.status == ScheduleStatus.ACTIVE]

    def match(self, config: Dict) -> bool:
        def __match_dict(sub_pattern, sub_config):
            if type(sub_pattern) is not dict or type(sub_config) is not dict:
                return False
            for k in sub_pattern.keys():
                if k not in sub_config:
                    return False
                v = sub_pattern[k]
                if type(v) is list:
                    if sub_config[k] not in v:
                        return False
                elif not __match_dict(v, sub_config[k]):
                    return False
            return True
        return __match_dict(self.pattern, config)


class Backfill(BaseModel):
    class IntervalType(str, enum.Enum):
        SECOND = 'second'
        MINUTE = 'minute'
        HOUR = 'hour'
        DAY = 'day'
        WEEK = 'week'
        MONTH = 'month'
        YEAR = 'year'
        CUSTOM = 'custom'

    class Status(str, enum.Enum):
        INITIAL = 'initial'
        RUNNING = 'running'
        COMPLETED = 'completed'
        FAILED = 'failed'
        CANCELLED = 'cancelled'

    block_uuid = Column(String(255), default=None)
    completed_at = Column(DateTime(timezone=True), default=None)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    end_datetime = Column(DateTime(timezone=True), default=None)
    failed_at = Column(DateTime(timezone=True), default=None)
    interval_type = Column(Enum(IntervalType), default=None)
    interval_units = Column(Integer, default=None)
    metrics = Column(JSON)
    name = Column(String(255))
    pipeline_schedule = relationship(PipelineSchedule, back_populates='backfills')
    pipeline_schedule_id = Column(Integer, ForeignKey('pipeline_schedule.id'))
    pipeline_uuid = Column(String(255))
    start_datetime = Column(DateTime(timezone=True), default=None)
    started_at = Column(DateTime(timezone=True), default=None)
    status = Column(Enum(Status), default=None)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    variables = Column(JSON, default=None)

    pipeline_runs = relationship('PipelineRun', back_populates='backfill')

    @classmethod
    @safe_db_query
    def filter(self, pipeline_schedule_ids: List = None):
        if pipeline_schedule_ids is not None:
            return Backfill.query.filter(
                Backfill.pipeline_schedule_id.in_(pipeline_schedule_ids),
            )
        return []
