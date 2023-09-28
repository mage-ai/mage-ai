from typing import Optional

from sqlalchemy import Column, String, Text, UniqueConstraint, or_

from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.base import BaseModel


class Secret(BaseModel):
    name = Column(String(255), nullable=False)
    value = Column(Text)
    # Column name is "repo_name", but we expect the repo path so that
    # we can identify the repo.
    repo_name = Column(String(255))
    key_uuid = Column(String(255), nullable=True)
    __table_args__ = (UniqueConstraint('name', 'key_uuid', name='name_key_uuid_uc'),)

    @classmethod
    @safe_db_query
    def get_secret(cls, name: str, key_uuid: str) -> Optional['Secret']:
        return cls.query.filter(
            cls.name == name,
            or_(
                cls.key_uuid == key_uuid,
                cls.key_uuid == key_uuid.strip(),
            ),
        ).one_or_none()
