from sqlalchemy import Boolean, Column, ForeignKey, Integer, String

from mage_ai.orchestration.db.models.base import BaseModel


class UserProject(BaseModel):
    user_id = Column(Integer, ForeignKey('user.id'))
    root_project_uuid = Column(String(255), default=None)
    project_name = Column(String(255), default=None)
    active = Column(Boolean, default=False)
