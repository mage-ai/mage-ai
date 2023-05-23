import enum
import re
from datetime import datetime
from typing import Dict, List, Union

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
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship, validates

from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.errors import ValidationError
from mage_ai.orchestration.db.models.base import BaseModel


class User(BaseModel):
    avatar = Column(String(255), default=None)
    email = Column(String(255), default=None, index=True, unique=True)
    first_name = Column(String(255), default=None)
    last_name = Column(String(255), default=None)
    _owner = Column('owner', Boolean, default=False)
    password_hash = Column(String(255), default=None)
    password_salt = Column(String(255), default=None)
    roles = Column(Integer, default=None)
    username = Column(String(255), default=None, index=True, unique=True)
    preferences = Column(JSON, default=None)

    oauth2_applications = relationship('Oauth2Application', back_populates='user')
    oauth2_access_tokens = relationship('Oauth2AccessToken', back_populates='user')
    # roles_new is used for the new authentication system to define permissions at
    # an entity level
    roles_new = relationship('Role', secondary='user_role', back_populates='users')

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
    def project_access(self) -> int:
        return self.get_access(Permission.Entity.PROJECT, get_repo_path())

    def get_access(
        self,
        entity: Union['Permission.Entity', None] = None,
        entity_id: Union[str, None] = None,
    ) -> int:
        '''
        If entity is None, we will go through all of the user's permissions and
        get the "highest" permission regardless of entity type. This should only be
        used for resources that are not entity dependent.

        Otherwise, search for permissions for the specified entity and entity_id, and
        return the access of the user for that entity.
        '''
        access = 0
        for role in self.roles_new:
            access = access | role.get_access(entity, entity_id)
        return access

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

    @hybrid_property
    def owner(self) -> bool:
        access = self.project_access if self.roles_new else 0
        return self._owner or access & Permission.Access.OWNER != 0

    @property
    def is_admin(self) -> bool:
        if self.roles_new:
            access = self.project_access
            return access & 1 == 0 and access & 2 != 0
        if not self.owner and self.roles:
            return self.roles & 1 != 0

        return False

    @property
    def git_settings(self) -> Union[Dict, None]:
        preferences = self.preferences or dict()
        return preferences.get(get_repo_path(), {}).get('git_settings')

    @classmethod
    @safe_db_query
    def batch_update_user_roles(self):
        for user in User.query.all():
            roles_new = []
            if user._owner:
                roles_new = [Role.get_default_role('Owner')]
            elif user.roles and user.roles & 1 != 0:
                roles_new = [Role.get_default_role('Admin')]
            elif user.roles and user.roles & 2 != 0:
                roles_new = [Role.get_default_role('Editor')]
            elif user.roles and user.roles & 4 != 0:
                roles_new = [Role.get_default_role('Viewer')]
            user.roles_new = roles_new
        db_connection.session.commit()


class Role(BaseModel):
    name = Column(String(255))
    permissions = relationship('Permission', back_populates='role')
    users = relationship('User', secondary='user_role', back_populates='roles_new')

    @classmethod
    @safe_db_query
    def create_default_roles(self):
        Permission.create_default_global_permissions()
        mapping = {
            'Owner': Permission.Access.OWNER,
            'Admin': Permission.Access.ADMIN,
            'Editor': Permission.Access.EDITOR,
            'Viewer': Permission.Access.VIEWER,
        }
        for name, access in mapping.items():
            role = self.query.filter(self.name == name).first()
            if not role:
                self.create(
                    name=name,
                    permissions=[
                        Permission.query.filter(
                            Permission.entity == Permission.Entity.GLOBAL,
                            Permission.access == access,
                        ).first()
                    ]
                )

    @classmethod
    @safe_db_query
    def get_default_role(self, name):
        return Role.query.filter(Role.name == name).first()

    def get_access(
        self,
        entity: Union['Permission.Entity', None] = None,
        entity_id: Union[str, None] = None,
    ) -> int:
        permissions = []
        if entity is None:
            permissions.extend(self.permissions)
        else:
            entity_permissions = list(filter(
                lambda perm: perm.entity == entity and
                (entity_id is None or perm.entity_id == entity_id),
                self.permissions,
            ))
            if entity_permissions:
                permissions.extend(entity_permissions)

        access = 0
        if permissions:
            for permission in permissions:
                access = access | permission.access
            return access
        else:
            return self.get_parent_access(entity)

    def get_parent_access(self, entity) -> int:
        '''
        This method is used when a role does not have a permission for a specified entity. Then,
        we will go up the entity chain to see if there are permissions for parent entities.
        '''
        if entity == Permission.Entity.PIPELINE:
            return self.get_access(Permission.Entity.PROJECT, get_repo_path())
        elif entity == Permission.Entity.PROJECT:
            return self.get_access(Permission.Entity.GLOBAL)
        else:
            return 0


class UserRole(BaseModel):
    user_id = Column(Integer, ForeignKey('user.id'))
    role_id = Column(Integer, ForeignKey('role.id'))


class Permission(BaseModel):
    class Entity(str, enum.Enum):
        GLOBAL = 'global'
        PROJECT = 'project'
        PIPELINE = 'pipeline'

    class Access(int, enum.Enum):
        OWNER = 1
        ADMIN = 2
        EDITOR = 4
        VIEWER = 8

    entity_id = Column(String(255))
    entity = Column(Enum(Entity), default=Entity.GLOBAL)
    # 1 = owner
    # 2 = admin
    # 4 = edit
    # 8 = view
    access = Column(Integer, default=None)
    role_id = Column(Integer, ForeignKey('role.id'))

    role = relationship(Role, back_populates='permissions')

    @classmethod
    @safe_db_query
    def create_default_global_permissions(self) -> List['Permission']:
        permissions = self.query.filter(self.entity == Permission.Entity.GLOBAL).all()
        if len(permissions) == 0:
            for access in [a.value for a in Permission.Access]:
                permissions.append(
                    self.create(
                        entity=Permission.Entity.GLOBAL,
                        access=access,
                    )
                )
        return permissions


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
