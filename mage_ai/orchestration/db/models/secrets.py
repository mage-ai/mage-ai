from sqlalchemy import Column, String, Text, UniqueConstraint

from mage_ai.orchestration.db.models.base import BaseModel


class Secret(BaseModel):
    name = Column(String(255), nullable=False)
    value = Column(Text)
    # Column name is "repo_name", but we expect the repo path so that
    # we can identify the repo.
    repo_name = Column(String(255))
    key_uuid = Column(String(255), nullable=True)
    __table_args__ = (UniqueConstraint('name', 'key_uuid', name='name_key_uuid_uc'),)
