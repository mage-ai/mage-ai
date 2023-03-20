from mage_ai.orchestration.db.models.base import BaseModel
from sqlalchemy import (
    Column,
    String,
    Text,
)


class Secret(BaseModel):
    name = Column(String(255), unique=True)
    value = Column(Text)
    repo_name = Column(String(255))
