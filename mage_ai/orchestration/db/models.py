from croniter import croniter
from datetime import datetime, timedelta
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import db_connection
from mage_ai.shared.array import find
from mage_ai.shared.dates import compare
from mage_ai.shared.hash import ignore_keys, index_by
from mage_ai.shared.strings import camel_to_snake_case
from sqlalchemy import Column, Boolean, DateTime, Enum, ForeignKey, Integer, JSON, String, Table
from sqlalchemy.ext.declarative import declared_attr, declarative_base
from sqlalchemy.orm import joinedload, relationship, validates
from sqlalchemy.orm.collections import InstrumentedList
from sqlalchemy.sql import func
from typing import Dict, List
import enum


Base = declarative_base()


class classproperty(property):
    def __get__(self, owner_self, owner_cls):
        return self.fget(owner_cls)


class BaseModel(Base):
    __abstract__ = True

    @declared_attr
    def __tablename__(cls):
        return camel_to_snake_case(cls.__name__)

    @classproperty
    def query(cls):
        return db_connection.session.query(cls)

    @classproperty
    def select(cls):
        return db_connection.session.query

    @property
    def session(self):
        return db_connection.session

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @classmethod
    def create(self, **kwargs):
        model = self(**kwargs)
        model.save()
        return model

    def save(self, commit=True) -> None:
        self.session.add(self)
        if commit:
            try:
                self.session.commit()
            except Exception as e:
                self.session.rollback()
                raise e

    def update(self, **kwargs) -> None:
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        try:
            self.session.commit()
        except Exception as e:
            self.session.rollback()
            raise e

    def delete(self, commit: bool = True) -> None:
        self.session.delete(self)
        if commit:
            try:
                self.session.commit()
            except Exception as e:
                self.session.rollback()
                raise e

    def refresh(self):
        self.session.refresh(self)

    def to_dict(self, include_attributes=[]) -> Dict:
        def __format_value(value):
            if type(value) is datetime:
                return str(value)
            elif type(value) is InstrumentedList:
                return [__format_value(v) for v in value]
            elif hasattr(value, 'to_dict'):
                return value.to_dict()
            return value
        obj_dict = {c.name: __format_value(getattr(self, c.name)) for c in self.__table__.columns}
        if include_attributes is not None and len(include_attributes) > 0:
            for attr in include_attributes:
                if hasattr(self, attr):
                    obj_dict[attr] = __format_value(getattr(self, attr))
        return obj_dict


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

    name = Column(String(255))
    pipeline_uuid = Column(String(255))
    schedule_type = Column(Enum(ScheduleType))
    start_time = Column(DateTime(timezone=True), default=None)
    schedule_interval = Column(String(50))
    status = Column(Enum(ScheduleStatus), default=ScheduleStatus.INACTIVE)
    variables = Column(JSON)
    sla = Column(Integer, default=None) # in seconds

    pipeline_runs = relationship('PipelineRun', back_populates='pipeline_schedule')

    event_matchers = relationship(
        'EventMatcher',
        secondary=pipeline_schedule_event_matcher_association_table,
        back_populates='pipeline_schedules'
    )

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
    def last_pipeline_run_status(self) -> int:
        if len(self.pipeline_runs) == 0:
            return None
        return sorted(self.pipeline_runs, key=lambda x: x.created_at)[-1].status

    @classmethod
    def active_schedules(self, pipeline_uuids: List[str] = None) -> List['PipelineSchedule']:
        query = self.query.filter(self.status == self.ScheduleStatus.ACTIVE)
        if pipeline_uuids is not None:
            query = query.filter(PipelineSchedule.pipeline_uuid.in_(pipeline_uuids))
        return query.all()

    def current_execution_date(self) -> datetime:
        if self.schedule_interval is None:
            return None

        now = datetime.now()
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

    pipeline_schedule = relationship(PipelineSchedule, back_populates='pipeline_runs')
    block_runs = relationship('BlockRun', back_populates='pipeline_run')

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

    @property
    def pipeline_schedule_name(self):
        return self.pipeline_schedule.name

    @classmethod
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

    def create_block_run(self, block_uuid: str) -> 'BlockRun':
        return BlockRun.create(
            block_uuid=block_uuid,
            pipeline_run_id=self.id,
        )

    def create_block_runs(self) -> List['BlockRun']:
        blocks = self.pipeline.get_executable_blocks()

        return [self.create_block_run(b.uuid) for b in blocks]

    def all_blocks_completed(self) -> bool:
        return all(b.status == BlockRun.BlockRunStatus.COMPLETED
                   for b in self.block_runs)


class BlockRun(BaseModel):
    class BlockRunStatus(str, enum.Enum):
        INITIAL = 'initial'
        QUEUED = 'queued'
        RUNNING = 'running'
        COMPLETED = 'completed'
        FAILED = 'failed'
        CANCELLED = 'cancelled'

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
            block_uuid=self.block_uuid,
            partition=self.pipeline_run.execution_partition,
            repo_config=pipeline.repo_config,
        ).get_logs()

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
