from datetime import datetime
from mage_ai.orchestration.db import Session, session
from mage_ai.shared.strings import camel_to_snake_case
from sqlalchemy import Column, DateTime, Enum, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declared_attr, declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()
Base.query = Session.query_property()


class BaseModel(Base):
    __abstract__ = True

    @declared_attr
    def __tablename__(cls):
        return camel_to_snake_case(cls.__name__)

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def save(self, commit=True):
        session.add(self)
        if commit:
            try:
                session.commit()
            except Exception as e:
                session.rollback()
                raise e

    def update(self, **kwargs):
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        session.commit()

    def delete(self, commit=True):
        session.delete(self)
        if commit:
            session.commit()

    def to_dict(self):
        def __format_value(value):
            if type(value) is datetime:
                return str(value)
            return value
        return {c.name: __format_value(getattr(self, c.name)) for c in self.__table__.columns}


class PipelineSchedule(BaseModel):
    class ScheduleStatus(str, enum.Enum):
        ACTIVE = 'active'
        INACTIVE = 'inactive'

    class ScheduleType(str, enum.Enum):
        TIME = 'time'

    name = Column(String(255))
    pipeline_uuid = Column(String(255))
    schedule_type = Column(Enum(ScheduleType), default=ScheduleType.TIME)
    start_time = Column(DateTime(timezone=True))
    schedule_interval = Column(String(50), default='@once')
    status = Column(Enum(ScheduleStatus), default=ScheduleStatus.INACTIVE)

    pipeline_runs = relationship('PipelineRun')


class PipelineRun(BaseModel):
    class PipelineRunStatus(str, enum.Enum):
        INITIAL = 'initial'
        RUNNING = 'running'
        COMPLETED = 'completed'
        FAILED = 'failed'

    pipeline_schedule_id = Column(Integer, ForeignKey('pipeline_schedule.id'))
    pipeline_uuid = Column(String(255))
    status = Column(Enum(PipelineRunStatus), default=PipelineRunStatus.INITIAL)

    block_runs = relationship('BlockRun')


class BlockRun(BaseModel):
    class BlockRunStatus(str, enum.Enum):
        INITIAL = 'initial'
        QUEUED = 'queued'
        RUNNING = 'running'
        COMPLETED = 'completed'
        FAILED = 'failed'

    pipeline_run_id = Column(Integer, ForeignKey('pipeline_run.id'))
    block_uuid = Column(String(255))
    status = Column(Enum(BlockRunStatus), default=BlockRunStatus.INITIAL)
