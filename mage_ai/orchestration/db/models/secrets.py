from sqlalchemy import Column, String, Text

from mage_ai.orchestration.db.models.base import BaseModel


class Secret(BaseModel):
    name = Column(String(255), unique=True)
    value = Column(Text)
    # Column name is "repo_name", but we expect the repo path so that
    # we can identify the repo.
    repo_name = Column(String(255))
