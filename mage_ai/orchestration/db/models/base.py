from datetime import datetime
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.shared.strings import camel_to_snake_case
from sqlalchemy import (
    Column,
    DateTime,
    Integer,
)
from sqlalchemy.ext.declarative import declared_attr, declarative_base
from sqlalchemy.orm.collections import InstrumentedList
from sqlalchemy.sql import func
from typing import Dict

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
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    @classmethod
    def create(self, **kwargs):
        commit = kwargs.get('commit', True)
        kwargs.pop('commit', None)
        model = self(**kwargs)
        model.save(commit=commit)
        return model

    def full_clean(self, **kwargs) -> None:
        pass

    @classmethod
    @safe_db_query
    def get(self, uuid):
        return self.query.get(uuid)

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
                try:
                    value = sorted(value, key=lambda x: x.id)
                except Exception:
                    pass
                return [__format_value(v) for v in value]
            elif hasattr(value, 'to_dict'):
                return value.to_dict()
            return value
        obj_dict = {
            c.name: __format_value(getattr(self, c.name))
            for c in self.__table__.columns
        }
        if include_attributes is not None and len(include_attributes) > 0:
            for attr in include_attributes:
                if hasattr(self, attr):
                    obj_dict[attr] = __format_value(getattr(self, attr))
        return obj_dict
