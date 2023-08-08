from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.schema import Index

from mage_ai.orchestration.db.models.base import BaseModel


class Tag(BaseModel):
    description = Column(Text)
    name = Column(String(255), index=True, unique=True)

    tag_associations = relationship('TagAssociation', back_populates='tag')

    @property
    def uuid(self) -> str:
        return self.name


class TagAssociation(BaseModel):
    tag_id = Column(Integer, ForeignKey('tag.id'))
    taggable_id = Column(Integer)
    taggable_type = Column(String(255))

    tag = relationship(Tag, back_populates='tag_associations')

    __table_args__ = (
        UniqueConstraint(
            'tag_id',
            'taggable_id',
            'taggable_type',
            name='tag_id_taggable_id_taggable_type_uc',
        ),
        Index(None, 'taggable_id', 'taggable_type'),
    )
