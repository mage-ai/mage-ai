import enum
import re
from datetime import datetime
from typing import Dict, Union

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship, validates

from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.errors import ValidationError
from mage_ai.orchestration.db.models.base import BaseModel


class User(BaseModel):
    avatar = Column(String(255), default=None)
    email = Column(String(255), default=None, index=True, unique=True)
    first_name = Column(String(255), default=None)
    last_name = Column(String(255), default=None)
    owner = Column(Boolean, default=False)
    password_hash = Column(String(255), default=None)
    password_salt = Column(String(255), default=None)
    roles = Column(Integer, default=None)
    username = Column(String(255), default=None, index=True, unique=True)
    preferences = Column(JSON, default=None)

    oauth2_applications = relationship('Oauth2Application', back_populates='user')
    oauth2_access_tokens = relationship('Oauth2AccessToken', back_populates='user')

    @validates('email')
    def validate_email(self, key, value):
        if not value:
            raise ValidationError('Email address cannot be blank.', metadata=dict(
                key=key,
                value=value,
            ))
        else:
            existing_email = User.query.filter(
                User.email == value
            ).one_or_none()
            if self.email != value and existing_email is not None:
                raise ValidationError(
                    'Email address is already in use. Please choose a different one.',
                    metadata=dict(
                        key=key,
                        value=value,
                    )
                )

            regex = re.compile(r"([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|\"([]!#-[^-~ \t]|(\\[\t -~]))+\")@([-!#-'*+/-9=?A-Z^-~]+(\.[-!#-'*+/-9=?A-Z^-~]+)*|\[[\t -Z^-~]*])")  # noqa: E501
            if not re.fullmatch(regex, value):
                raise ValidationError('Email address is invalid.', metadata=dict(
                    key=key,
                    value=value,
                ))

        return value

    @property
    def roles_display(self) -> str:
        if self.owner:
            return 'Owner'
        elif self.roles:
            if self.roles & 1 != 0:
                return 'Admin'
            elif self.roles & 2 != 0:
                return 'Editor'
            elif self.roles & 4 != 0:
                return 'Viewer'

    @property
    def is_admin(self) -> bool:
        if not self.owner and self.roles:
            return self.roles & 1 != 0

        return False

    @property
    def git_settings(self) -> Union[Dict, None]:
        preferences = self.preferences or dict()
        return preferences.get(get_repo_path(), {}).get('git_settings')


class Oauth2Application(BaseModel):
    class AuthorizationGrantType(str, enum.Enum):
        AUTHORIZATION_CODE = 'authorization-code'
        CLIENT_CREDENTIALS = 'client-credentials'

    class ClientType(str, enum.Enum):
        PRIVATE = 'private'
        PUBLIC = 'public'

    authorization_grant_type = Column(
        Enum(AuthorizationGrantType),
        default=AuthorizationGrantType.AUTHORIZATION_CODE,
    )
    client_id = Column(String(255), index=True, unique=True)
    client_type = Column(Enum(ClientType), default=ClientType.PRIVATE)
    name = Column(String(255))
    redirect_uris = Column(String(255), default=None)
    user = relationship(User, back_populates='oauth2_applications')
    user_id = Column(Integer, ForeignKey('user.id'))

    oauth2_access_tokens = relationship('Oauth2AccessToken', back_populates='oauth2_application')

    @classmethod
    @safe_db_query
    def query_client(self, api_key: str):
        return self.query.filter(
            Oauth2Application.client_id == api_key,
        ).first()


class Oauth2AccessToken(BaseModel):
    expires = Column(DateTime(timezone=True))
    oauth2_application = relationship(Oauth2Application, back_populates='oauth2_access_tokens')
    oauth2_application_id = Column(Integer, ForeignKey('oauth2_application.id'))
    token = Column(String(255), index=True, unique=True)
    user = relationship(User, back_populates='oauth2_access_tokens')
    user_id = Column(Integer, ForeignKey('user.id'))

    def is_valid(self) -> bool:
        return self.token and \
            self.expires and \
            self.expires >= datetime.utcnow().replace(tzinfo=self.expires.tzinfo)
