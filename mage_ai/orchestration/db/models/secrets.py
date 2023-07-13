from sqlalchemy import Column, String, Text, UniqueConstraint

from mage_ai.orchestration.db.models.base import BaseModel


class Secret(BaseModel):
    name = Column(String(255))
    value = Column(Text)
    # Column name is "repo_name", but we expect the repo path so that
    # we can identify the repo.
    repo_name = Column(String(255))
    entity = Column(String(255))
    entity_id = Column(String(255))
    repo_unique_constraint = UniqueConstraint(name, repo_name)
