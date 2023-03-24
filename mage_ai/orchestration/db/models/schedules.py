from croniter import croniter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.block.utils import (
    get_all_ancestors,
    is_dynamic_block,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.base import Base, BaseModel
from mage_ai.shared.array import find
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.dates import compare
from mage_ai.shared.hash import ignore_keys, index_by
from mage_ai.shared.utils import clean_name
from sqlalchemy import (
    Column,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Table,
)
from sqlalchemy.orm import joinedload, relationship, validates
from sqlalchemy.sql import func
from typing import Dict, List
import enum
import uuid


pipeline_schedule_event_matcher_association_table = Table(
    'pipeline_schedule_event_matcher_association',
    Base.metadata,
    Column('pipeline_schedule_id', ForeignKey('pipeline_schedule.id')),
    Column('event_matcher_id', ForeignKey('event_matcher.id')),
)


class PipelineSchedule(BaseModel):
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

    name = Column(String(255))
    pipeline_uuid = Column(String(255))
    schedule_type = Column(Enum(ScheduleType))
    start_time = Column(DateTime(timezone=True), default=None)
    schedule_interval = Column(String(50))
    status = Column(Enum(ScheduleStatus), default=ScheduleStatus.INACTIVE)
    variables = Column(JSON)
    sla = Column(Integer, default=None)  # in seconds
    token = Column(String(255), index=True, default=None)
    settings = Column(JSON)

    backfills = relationship('Backfill', back_populates='pipeline_schedule')
    pipeline_runs = relationship('PipelineRun', back_populates='pipeline_schedule')

    event_matchers = relationship(
        'EventMatcher',
        secondary=pipeline_schedule_event_matcher_association_table,
        back_populates='pipeline_schedules'
    )

    def get_settings(self) -> 'SettingsConfig':
        settings = self.settings if self.settings else dict()
        return self.__class__.SettingsConfig.load(config=settings)

    @property
    def pipeline_runs_count(self) -> int:
        return len(self.pipeline_runs)

    @validates('schedule_interval')
    def validate_schedule_interval(self, key, schedule_interval):
        if schedule_interval and schedule_interval not in \
                [e.value for e in self.__class__.ScheduleInterval]:
            if not croniter.is_valid(schedule_interval):
                raise ValueError('Cron expression is invalid.')

        return schedule_interval

    @property
    def last_pipeline_run_status(self) -> str:
        if len(self.pipeline_runs) == 0:
            return None
        return sorted(self.pipeline_runs, key=lambda x: x.created_at)[-1].status

    @classmethod
    @safe_db_query
    def active_schedules(self, pipeline_uuids: List[str] = None) -> List['PipelineSchedule']:
        query = self.query.filter(self.status == self.ScheduleStatus.ACTIVE)
        if pipeline_uuids is not None:
            query = query.filter(PipelineSchedule.pipeline_uuid.in_(pipeline_uuids))
        return query.all()

    @classmethod
    def create(self, **kwargs) -> 'PipelineSchedule':
        if 'token' not in kwargs:
            kwargs['token'] = uuid.uuid4().hex
        model = super().create(**kwargs)
        return model

    def current_execution_date(self) -> datetime:
        if self.schedule_interval is None:
            return None

        now = datetime.now(timezone.utc)
        if self.schedule_interval == '@once':
            return now
        elif self.schedule_interval == '@daily':
            return now.replace(second=0, microsecond=0, minute=0, hour=0)
        elif self.schedule_interval == '@hourly':
            return now.replace(second=0, microsecond=0, minute=0)
        elif self.schedule_interval == '@weekly':
            return now.replace(second=0, microsecond=0, minute=0, hour=0) - \
                timedelta(days=now.weekday())
        elif self.schedule_interval == '@monthly':
            return now.replace(second=0, microsecond=0, minute=0, hour=0, day=1)
        else:
            cron_itr = croniter(self.schedule_interval, now)
            return cron_itr.get_prev(datetime)

    @safe_db_query
    def should_schedule(self) -> bool:
        if self.status != self.__class__.ScheduleStatus.ACTIVE:
            return False

        if self.start_time is not None and compare(datetime.now(), self.start_time) == -1:
            return False

        try:
            Pipeline.get(self.pipeline_uuid)
        except Exception:
            return False

        if self.schedule_interval == '@once':
            if len(self.pipeline_runs) == 0:
                return True
        else:
            """
            TODO: Implement other schedule interval checks
            """
            current_execution_date = self.current_execution_date()
            if current_execution_date is None:
                return False
            if not find(
                lambda x: compare(x.execution_date, current_execution_date) == 0,
                self.pipeline_runs
            ):
                return True
        return False


class PipelineRun(BaseModel):
    class PipelineRunStatus(str, enum.Enum):
        INITIAL = 'initial'
        RUNNING = 'running'
        COMPLETED = 'completed'
        FAILED = 'failed'
        CANCELLED = 'cancelled'

    pipeline_schedule_id = Column(Integer, ForeignKey('pipeline_schedule.id'))
    pipeline_uuid = Column(String(255), index=True)
    execution_date = Column(DateTime(timezone=True), index=True)
    status = Column(Enum(PipelineRunStatus), default=PipelineRunStatus.INITIAL, index=True)
    completed_at = Column(DateTime(timezone=True))
    variables = Column(JSON)
    passed_sla = Column(Boolean, default=False)
    event_variables = Column(JSON)
    metrics = Column(JSON)
    backfill_id = Column(Integer, ForeignKey('backfill.id'))

    pipeline_schedule = relationship(PipelineSchedule, back_populates='pipeline_runs')
    block_runs = relationship('BlockRun', back_populates='pipeline_run')
    backfill = relationship('Backfill', back_populates='pipeline_runs')

    def __repr__(self):
        return f'PipelineRun(id={self.id}, pipeline_uuid={self.pipeline_uuid},'\
               f' execution_date={self.execution_date})'

    @property
    def block_runs_count(self) -> int:
        return len(self.block_runs)

    @property
    def execution_partition(self) -> str:
        if self.execution_date is None:
            return str(self.pipeline_schedule_id)
        else:
            return '/'.join([
                        str(self.pipeline_schedule_id),
                        self.execution_date.strftime(format='%Y%m%dT%H%M%S'),
                    ])

    @property
    def pipeline(self) -> 'Pipeline':
        return Pipeline.get(self.pipeline_uuid)

    @property
    def logs(self):
        return LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=self.pipeline_uuid,
            partition=self.execution_partition,
            repo_config=self.pipeline.repo_config,
        ).get_logs()

    async def logs_async(self):
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

    @classmethod
    @safe_db_query
    def active_runs(
        self,
        pipeline_uuids: List[str] = None,
        include_block_runs: bool = False,
    ) -> List['PipelineRun']:
        query = self.query.filter(self.status == self.PipelineRunStatus.RUNNING)
        if pipeline_uuids is not None:
            query = query.filter(PipelineRun.pipeline_uuid.in_(pipeline_uuids))
        if include_block_runs:
            query = query.options(joinedload(PipelineRun.block_runs))
        return query.all()

    @classmethod
    def create(self, create_block_runs: bool = True, **kwargs) -> 'PipelineRun':
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
            PipelineRun.passed_sla.is_(False),
        ).all()

    def create_block_run(self, block_uuid: str, **kwargs) -> 'BlockRun':
        return BlockRun.create(
            block_uuid=block_uuid,
            pipeline_run_id=self.id,
            **kwargs,
        )

    def create_block_runs(self) -> List['BlockRun']:
        blocks = self.pipeline.get_executable_blocks()

        arr = []
        for block in blocks:
            ancestors = get_all_ancestors(block)
            if len(block.upstream_blocks) == 0 or not find(is_dynamic_block, ancestors):
                arr.append(block)

        return [self.create_block_run(b.uuid) for b in arr]

    def any_blocks_failed(self) -> bool:
        return any(
            b.status == BlockRun.BlockRunStatus.FAILED
            for b in self.block_runs
        )

    def all_blocks_completed(self, include_failed_blocks: bool = False) -> bool:
        statuses = [BlockRun.BlockRunStatus.COMPLETED]
        if include_failed_blocks:
            statuses.extend([
                BlockRun.BlockRunStatus.FAILED,
                BlockRun.BlockRunStatus.UPSTREAM_FAILED,
            ])
        return all(b.status in statuses for b in self.block_runs)


class BlockRun(BaseModel):
    class BlockRunStatus(str, enum.Enum):
        INITIAL = 'initial'
        QUEUED = 'queued'
        RUNNING = 'running'
        COMPLETED = 'completed'
        FAILED = 'failed'
        CANCELLED = 'cancelled'
        UPSTREAM_FAILED = 'upstream_failed'

    pipeline_run_id = Column(Integer, ForeignKey('pipeline_run.id'))
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

    async def logs_async(self):
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
        return block.get_outputs(
            execution_partition=self.pipeline_run.execution_partition,
            sample_count=sample_count,
            block_uuid=self.block_uuid,
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
                PipelineSchedule.status == PipelineSchedule.ScheduleStatus.ACTIVE
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
                if p.status == PipelineSchedule.ScheduleStatus.ACTIVE]

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
