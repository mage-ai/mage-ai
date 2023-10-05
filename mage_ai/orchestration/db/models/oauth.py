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
from sqlalchemy.orm import relationship, validates

from mage_ai.authentication.permissions.constants import (
    BlockEntityType,
    EntityName,
    PipelineEntityType,
)
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.errors import ValidationError
from mage_ai.orchestration.db.models.base import BaseModel
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict


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
    created_permissions = relationship('Permission', back_populates='user')
    created_roles = relationship('Role', back_populates='user')

    @validates('email')
    def validate_email_if_present(self, key, value):
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
        return self.get_access(Entity.PROJECT, get_project_uuid())

    def get_access(
        self,
        entity: Union[Entity, None] = None,
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

    @property
    def owner(self) -> bool:
        access = self.project_access if self.roles_new else 0
        return self._owner or access & Permission.Access.OWNER != 0

    @property
    def is_admin(self) -> bool:
        if self.roles_new:
            access = self.project_access
            return access & \
                (Permission.Access.OWNER | Permission.Access.ADMIN) == Permission.Access.ADMIN
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
                roles_new = [Role.get_role(Role.DefaultRole.OWNER)]
            elif user.roles and user.roles & 1 != 0:
                roles_new = [Role.get_role(Role.DefaultRole.ADMIN)]
            elif user.roles and user.roles & 2 != 0:
                roles_new = [Role.get_role(Role.DefaultRole.EDITOR)]
            elif user.roles and user.roles & 4 != 0:
                roles_new = [Role.get_role(Role.DefaultRole.VIEWER)]
            user.roles_new = roles_new
        db_connection.session.commit()


class Role(BaseModel):
    name = Column(String(255), index=True, unique=True)
    permissions = relationship('Permission', back_populates='role')
    role_permissions = relationship(
        'Permission',
        secondary='role_permission',
        back_populates='roles',
    )
    users = relationship('User', secondary='user_role', back_populates='roles_new')
    user_id = Column(Integer, ForeignKey('user.id'), default=None)
    user = relationship(User, back_populates='created_roles')

    # Default global roles created by Mage
    class DefaultRole(str, enum.Enum):
        OWNER = 'Owner'
        ADMIN = 'Admin'
        EDITOR = 'Editor'
        VIEWER = 'Viewer'

    @validates('name')
    def validate_name(self, key, value):
        if not value or len(value) == 0:
            raise ValidationError(f'{key} cannot be empty.', metadata=dict(
                key=key,
                value=value,
            ))

        return value

    @classmethod
    @safe_db_query
    def create_default_roles(
        self,
        entity: Entity = None,
        entity_id: str = None,
        prefix: str = None,
    ) -> None:
        """
        Create default roles with associated permissions for a given entity and entity_id.

        Args:
            entity (Entity): The entity for which roles and permissions are being created
                (default: Entity.GLOBAL).
            entity_id (str): The unique identifier for the entity.
            prefix (str): A prefix to prepend to the default role names (optional).
        """
        if entity is None:
            entity = Entity.GLOBAL
        permissions = Permission.create_default_permissions(entity=entity, entity_id=entity_id)
        mapping = {
            self.DefaultRole.OWNER: Permission.Access.OWNER,
            self.DefaultRole.ADMIN: Permission.Access.ADMIN,
            self.DefaultRole.EDITOR: Permission.Access.EDITOR,
            self.DefaultRole.VIEWER: Permission.Access.VIEWER,
        }
        for name, access in mapping.items():
            role_name = name
            if prefix is not None:
                role_name = f'{prefix}_{name}'
            role = self.query.filter(self.name == role_name).first()
            if not role:
                self.create(
                    name=role_name,
                    permissions=[
                        Permission.query.filter(
                            Permission.entity == entity,
                            Permission.entity_id == entity_id,
                            Permission.access == access,
                        ).first()
                    ],
                    commit=False,
                )
            elif permissions:
                permission = find(lambda p, a=access: p.access == a.value, permissions)
                if permission:
                    role.update(
                        permissions=role.permissions + [permission],
                        commit=False,
                    )

        db_connection.session.commit()

    @classmethod
    @safe_db_query
    def get_role(self, name) -> 'Role':
        return Role.query.filter(Role.name == name).first()

    def get_access(
        self,
        entity: Union[Entity, None],
        entity_id: Union[str, None] = None,
    ) -> int:
        permissions = []
        if entity is None:
            return 0
        elif entity == Entity.ANY:
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
            # TODO: Handle permissions with different entity types better.
            return self.get_parent_access(entity)

    def get_parent_access(self, entity) -> int:
        '''
        This method is used when a role does not have a permission for a specified entity. Then,
        we will go up the entity chain to see if there are permissions for parent entities.
        '''
        if entity == Entity.PIPELINE:
            return self.get_access(Entity.PROJECT, get_project_uuid())
        elif entity == Entity.PROJECT:
            return self.get_access(Entity.GLOBAL)
        else:
            return 0


class UserRole(BaseModel):
    user_id = Column(Integer, ForeignKey('user.id'))
    role_id = Column(Integer, ForeignKey('role.id'))

    @validates('role_id')
    def validate_role_id(self, key, value):
        if value is None:
            raise ValidationError(f'{key} cannot be empty.', metadata=dict(
                key=key,
                value=value,
            ))

        return value

    @validates('user_id')
    def validate_user_id(self, key, value):
        if value is None:
            raise ValidationError(f'{key} cannot be empty.', metadata=dict(
                key=key,
                value=value,
            ))

        return value


class Permission(BaseModel):
    class Access(int, enum.Enum):
        OWNER = 1
        ADMIN = 2
        # Editor: list, detail, create, update, delete
        EDITOR = 4
        # Viewer: list, detail
        VIEWER = 8
        LIST = 16
        DETAIL = 32
        CREATE = 64
        UPDATE = 128
        DELETE = 512
        QUERY = 1024
        READ = 2048
        WRITE = 4096

    entity_id = Column(String(255))
    entity = Column(Enum(Entity), default=Entity.GLOBAL)
    # 1 = owner
    # 2 = admin
    # 4 = edit
    # 8 = view
    access = Column(Integer, default=None)
    role_id = Column(Integer, ForeignKey('role.id'))
    user_id = Column(Integer, ForeignKey('user.id'), default=None)
    user = relationship(User, back_populates='created_permissions')
    entity_name = Column(String(255), default=None)
    entity_type = Column(String(255), default=None)
    options = Column(JSON, default=None)

    role = relationship(Role, back_populates='permissions')
    roles = relationship(Role, secondary='role_permission', back_populates='role_permissions')

    @validates('entity')
    def validate_entity(self, key, value):
        if value == Entity.ANY:
            raise ValidationError(
                'Permission entity cannot be ANY. Please select a specific entity.',
                metadata=dict(
                    key=key,
                    value=value,
                ),
            )

        return value

    @validates('entity_name')
    def validate_entity_name(self, key, value):
        if not value:
            return value

        if value not in EntityName._value2member_map_:
            valid_values = ', '.join([i.value for i in EntityName])

            raise ValidationError(
                f'{key} {value} isn’t valid, it must be 1 of {valid_values}.',
                metadata=dict(
                    key=key,
                    value=value,
                ),
            )

        return value

    @validates('entity_type')
    def validate_entity_type(self, key, value):
        if not value:
            return value

        if value not in BlockEntityType._value2member_map_ and \
                value not in PipelineEntityType._value2member_map_:

            valid_values = ', '.join(
                [i.value for i in BlockEntityType] + [i.value for i in PipelineEntityType],
            )

            raise ValidationError(
                f'{key} {value} isn’t valid, it must be 1 of {valid_values}.',
                metadata=dict(
                    key=key,
                    value=value,
                ),
            )

        return value

    @classmethod
    @safe_db_query
    def create_default_permissions(
        self,
        entity: Entity = None,
        entity_id: str = None,
    ) -> List['Permission']:
        """
        Create default permissions for the given entity and entitiy_id. The permissions
        will only be created if they do not exist already.

        Args:
            entity (Entity): The entity for which permissions are being created.
            entity_id (str): The unique identifier for the entity.

        Returns:
            List[Permission]: The list of permissions created. The list will be empty if
                the permissions already exist.
        """
        if entity is None:
            entity = Entity.GLOBAL
        permissions = self.query.filter(
            self.entity == entity,
            self.entity_id == entity_id,
        ).all()
        new_permissions = []
        if len(permissions) == 0:
            for access in [a.value for a in Permission.Access]:
                new_permissions.append(
                    self.create(
                        entity=entity,
                        entity_id=entity_id,
                        access=access,
                        commit=False,
                    )
                )
            db_connection.session.commit()
        return new_permissions

    @property
    def query_attributes(self) -> List[str]:
        return self.__get_access_attributes('query_attributes')

    @query_attributes.setter
    def query_attributes(self, values: List[str]) -> None:
        self.__set_access_attributes('query_attributes', values)

    @property
    def read_attributes(self) -> List[str]:
        return self.__get_access_attributes('read_attributes')

    @read_attributes.setter
    def read_attributes(self, values: List[str]) -> None:
        self.__set_access_attributes('read_attributes', values)

    @property
    def write_attributes(self) -> List[str]:
        return self.__get_access_attributes('write_attributes')

    @write_attributes.setter
    def write_attributes(self, values: List[str]) -> None:
        self.__set_access_attributes('write_attributes', values)

    def __get_access_attributes(self, access_name: str) -> List[str]:
        return (self.options or {}).get(access_name)

    def __set_access_attributes(self, access_name: str, values: List[str]) -> None:
        self.options = merge_dict((self.options or {}), {
            access_name: values,
        })


class RolePermission(BaseModel):
    permission_id = Column(Integer, ForeignKey('permission.id'))
    role_id = Column(Integer, ForeignKey('role.id'))
    user_id = Column(Integer, ForeignKey('user.id'), default=None)

    @validates('permission_id')
    def validate_permission_id(self, key, value):
        if value is None:
            raise ValidationError(f'{key} cannot be empty.', metadata=dict(
                key=key,
                value=value,
            ))

        return value

    @validates('role_id')
    def validate_role_id(self, key, value):
        if value is None:
            raise ValidationError(f'{key} cannot be empty.', metadata=dict(
                key=key,
                value=value,
            ))

        return value


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
