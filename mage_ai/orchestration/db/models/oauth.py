import enum
import re
from datetime import datetime
from typing import Callable, Dict, List, Union

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    and_,
    asc,
    func,
)
from sqlalchemy.orm import relationship, validates

from mage_ai.authentication.permissions.constants import (
    BlockEntityType,
    EntityName,
    PermissionAccess,
    PipelineEntityType,
)
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.errors import ValidationError
from mage_ai.orchestration.db.models.base import BaseModel
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find
from mage_ai.shared.environments import is_test
from mage_ai.shared.hash import group_by, merge_dict


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

    @validates('avatar')
    def shorten_avatar(self, key, value):
        if value and len(value) >= 3:
            return value[:2]

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

        roles = self.fetch_roles([self.id])
        permissions = Role.fetch_permissions([r.id for r in roles])
        permissions_role = Role.fetch_role_permissions([r.id for r in roles])
        permissions_mapping = merge_dict(
            group_by(lambda x: x.role_id, permissions),
            group_by(lambda x: x.role_id, permissions_role),
        )

        for role in roles:
            permissions_for_role = permissions_mapping.get(role.id) or []

            access = access | role.get_access(
                entity,
                entity_id,
                permissions_for_role=permissions_for_role,
            )
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
        access = self.project_access if self.fetch_roles([self.id]) else 0
        return self._owner or access & Permission.Access.OWNER != 0

    @property
    def is_admin(self) -> bool:
        if self.fetch_roles([self.id]):
            access = self.project_access
            return access & \
                (Permission.Access.OWNER | Permission.Access.ADMIN) == Permission.Access.ADMIN
        if not self.owner and self.roles:
            return self.roles & 1 != 0

        return False

    @property
    def git_settings(self) -> Union[Dict, None]:
        return self.get_git_settings()

    def get_git_settings(self, repo_path: str = None):
        preferences = self.preferences or dict()
        if not repo_path:
            repo_path = get_repo_path()
        pref = preferences.get(repo_path)
        if pref:
            return (pref or {}).get('git_settings')

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

    @classmethod
    def fetch_roles(self, user_ids: List[str]) -> List:
        query = (
            Role.
            select(
                Role.created_at,
                Role.id,
                Role.name,
                Role.updated_at,
                UserRole.user_id,
            ).
            join(
                UserRole,
                and_(
                    UserRole.role_id == Role.id,
                    UserRole.user_id.in_(user_ids),
                ),
            )
        )
        query.cache = True

        rows = query.all()

        arr = []

        for row in rows:
            model = Role()
            model.created_at = row.created_at
            model.id = row.id
            model.name = row.name
            model.updated_at = row.updated_at
            model.user_id = row.user_id
            arr.append(model)

        return arr

    @classmethod
    def fetch_permissions(self, user_ids: List[str]) -> List:
        row_number_column = (
                func.
                row_number().
                over(
                    order_by=asc(UserRole.id),
                    partition_by=Permission.id,
                ).
                label('row_number')
        )

        query = (
            Permission.
            select(
                Permission.access,
                Permission.created_at,
                Permission.entity,
                Permission.entity_id,
                Permission.entity_name,
                Permission.entity_type,
                Permission.id,
                Permission.options,
                Permission.role_id,
                Permission.updated_at,
                UserRole.user_id,
            ).
            join(
                RolePermission,
                RolePermission.permission_id == Permission.id,
            ).
            join(
                Role,
                Role.id == RolePermission.role_id,
            ).
            join(
                UserRole,
                and_(
                    UserRole.role_id == Role.id,
                    UserRole.user_id.in_(user_ids),
                ),
            )
        )

        query = query.add_column(row_number_column)
        query = query.from_self().filter(row_number_column == 1)
        query.cache = True
        rows = query.all()

        arr = []

        for row in rows:
            model = Permission()
            model.access = row.access
            model.created_at = row.created_at
            model.entity = row.entity
            model.entity_id = row.entity_id
            model.entity_name = row.entity_name
            model.entity_type = row.entity_type
            model.id = row.id
            model.options = row.options
            model.role_id = row.role_id
            model.updated_at = row.updated_at
            model.user_id = row.user_id
            arr.append(model)

        return arr

    def permissions(self) -> List:
        return self.__class__.fetch_permissions([self.id])


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
        cls,
        entity: Entity = None,
        entity_id: str = None,
        name_func: Callable[[str], str] = None,
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
            cls.DefaultRole.OWNER: Permission.Access.OWNER,
            cls.DefaultRole.ADMIN: Permission.Access.ADMIN,
            cls.DefaultRole.EDITOR: Permission.Access.EDITOR,
            cls.DefaultRole.VIEWER: Permission.Access.VIEWER,
        }
        for name, access in mapping.items():
            role_name = name
            if name_func is not None:
                role_name = name_func(name)
            role = cls.query.filter(Role.name == role_name).first()
            if not role:
                cls.create(
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
        permissions_for_role: List['Permission'] = None,
    ) -> int:
        arr = self.permissions if permissions_for_role is None else permissions_for_role

        permissions = []
        if entity is None:
            return 0
        elif entity == Entity.ANY:
            permissions.extend(arr)
        else:
            entity_permissions = list(filter(
                lambda perm: perm.entity == entity and
                (entity_id is None or perm.entity_id == entity_id),
                arr,
            ))
            if entity_permissions:
                permissions.extend(entity_permissions)

        access = 0
        if permissions:
            for permission in permissions:
                if permission.access is not None:
                    access = access | permission.access
            return access
        else:
            # TODO: Handle permissions with different entity types better.
            return self.get_parent_access(
                entity,
                permissions_for_role=permissions_for_role,
            )

    def get_parent_access(
        self,
        entity,
        permissions_for_role: List['Permission'] = None,
    ) -> int:
        '''
        This method is used when a role does not have a permission for a specified entity. Then,
        we will go up the entity chain to see if there are permissions for parent entities.
        '''
        if entity == Entity.PIPELINE:
            return self.get_access(
                Entity.PROJECT, get_project_uuid(),
                permissions_for_role=permissions_for_role,
            )
        elif entity == Entity.PROJECT:
            return self.get_access(
                Entity.GLOBAL,
                permissions_for_role=permissions_for_role,
            )
        else:
            return 0

    @classmethod
    def fetch_permissions(self, ids: List[str]) -> List:
        query = (
            Permission.
            query.
            filter(Permission.role_id.in_(ids))
        )
        query.cache = True

        return query.all()

    @classmethod
    def fetch_role_permissions(self, ids: List[str]) -> List:
        query = (
            Permission.
            select(
                Permission.access,
                Permission.created_at,
                Permission.entity,
                Permission.entity_id,
                Permission.entity_name,
                Permission.entity_type,
                Permission.id,
                Permission.options,
                Permission.updated_at,
                RolePermission.role_id,
            ).
            join(
                RolePermission,
                and_(
                    RolePermission.permission_id == Permission.id,
                    RolePermission.role_id.in_(ids),
                )
            )
        )
        query.cache = True

        rows = query.all()

        arr = []

        for row in rows:
            model = Permission()
            model.access = row.access
            model.created_at = row.created_at
            model.entity = row.entity
            model.entity_id = row.entity_id
            model.entity_name = row.entity_name
            model.entity_type = row.entity_type
            model.id = row.id
            model.options = row.options
            model.role_id = row.role_id
            model.updated_at = row.updated_at
            arr.append(model)

        return arr

    @classmethod
    def fetch_users(self, ids: List[str]) -> List:
        query = (
            User.
            select(
                User.avatar,
                User.created_at,
                User.email,
                User.first_name,
                User.id,
                User.last_name,
                User.preferences,
                User.roles,
                User.updated_at,
                User.username,
                UserRole.role_id,
            ).
            join(
                UserRole,
                and_(
                    UserRole.user_id == User.id,
                    UserRole.role_id.in_(ids),
                ),
            )
        )
        query.cache = True

        rows = query.all()

        arr = []

        for row in rows:
            user = User()
            user.avatar = row.avatar
            user.created_at = row.created_at
            user.first_name = row.first_name
            user.id = row.id
            user.last_name = row.last_name
            user.preferences = row.preferences
            user.role_id = row.role_id
            user.roles = row.roles
            user.updated_at = row.updated_at
            user.username = row.username
            arr.append(user)

        return arr


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
        OWNER = PermissionAccess.OWNER.value
        ADMIN = PermissionAccess.ADMIN.value
        EDITOR = PermissionAccess.EDITOR.value
        VIEWER = PermissionAccess.VIEWER.value
        LIST = PermissionAccess.LIST.value
        DETAIL = PermissionAccess.DETAIL.value
        CREATE = PermissionAccess.CREATE.value
        UPDATE = PermissionAccess.UPDATE.value
        DELETE = PermissionAccess.DELETE.value
        OPERATION_ALL = PermissionAccess.OPERATION_ALL.value
        QUERY = PermissionAccess.QUERY.value
        QUERY_ALL = PermissionAccess.QUERY_ALL.value
        READ = PermissionAccess.READ.value
        READ_ALL = PermissionAccess.READ_ALL.value
        WRITE = PermissionAccess.WRITE.value
        WRITE_ALL = PermissionAccess.WRITE_ALL.value
        ALL = PermissionAccess.ALL.value
        DISABLE_LIST = PermissionAccess.DISABLE_LIST.value
        DISABLE_DETAIL = PermissionAccess.DISABLE_DETAIL.value
        DISABLE_CREATE = PermissionAccess.DISABLE_CREATE.value
        DISABLE_UPDATE = PermissionAccess.DISABLE_UPDATE.value
        DISABLE_DELETE = PermissionAccess.DISABLE_DELETE.value
        DISABLE_OPERATION_ALL = PermissionAccess.DISABLE_OPERATION_ALL.value
        DISABLE_QUERY = PermissionAccess.DISABLE_QUERY.value
        DISABLE_QUERY_ALL = PermissionAccess.DISABLE_QUERY_ALL.value
        DISABLE_READ = PermissionAccess.DISABLE_READ.value
        DISABLE_READ_ALL = PermissionAccess.DISABLE_READ_ALL.value
        DISABLE_WRITE = PermissionAccess.DISABLE_WRITE.value
        DISABLE_WRITE_ALL = PermissionAccess.DISABLE_WRITE_ALL.value
        DISABLE_UNLESS_CONDITIONS = PermissionAccess.DISABLE_UNLESS_CONDITIONS.value

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
        if not is_test() and value == Entity.ANY:
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
            for permission_access in [
                Permission.Access.OWNER,
                Permission.Access.ADMIN,
                Permission.Access.EDITOR,
                Permission.Access.VIEWER,
            ]:
                new_permissions.append(
                    self.create(
                        entity=entity,
                        entity_id=entity_id,
                        access=permission_access.value,
                        commit=False,
                    )
                )
            db_connection.session.commit()
        return new_permissions

    @classmethod
    def add_accesses(self, accesses: List[PermissionAccess]) -> int:
        current = 0
        for access in accesses:
            access_current = bin(current)
            access_new = bin(access)
            current = int(access_current, 2) + int(access_new, 2)
        return current

    @property
    def conditions(self) -> List[str]:
        return self.__get_access_attributes('conditions')

    @conditions.setter
    def conditions(self, values: List[str]) -> None:
        self.__set_access_attributes('conditions', values)

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

    def users(self) -> List[User]:
        row_number_column = (
                func.
                row_number().
                over(
                    order_by=asc(UserRole.id),
                    partition_by=User.id,
                ).
                label('row_number')
        )

        query = (
            User.
            select(
                User.avatar,
                User.created_at,
                User.email,
                User.first_name,
                User.id,
                User.last_name,
                User.preferences,
                User.roles,
                User.updated_at,
                User.username,
            ).
            join(UserRole, UserRole.user_id == User.id).
            join(Role, Role.id == UserRole.role_id).
            join(
                RolePermission,
                and_(
                    RolePermission.permission_id == self.id,
                    RolePermission.role_id == Role.id,
                ),
            )
        )

        query = query.add_column(row_number_column)
        query = query.from_self().filter(row_number_column == 1)
        rows = query.all()

        arr = []

        for row in rows:
            user = User()
            user.avatar = row.avatar
            user.created_at = row.created_at
            user.first_name = row.first_name
            user.id = row.id
            user.last_name = row.last_name
            user.preferences = row.preferences
            user.roles = row.roles
            user.updated_at = row.updated_at
            user.username = row.username
            arr.append(user)

        return arr

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
    token = Column(Text, index=True, unique=True)
    user = relationship(User, back_populates='oauth2_access_tokens')
    user_id = Column(Integer, ForeignKey('user.id'))
    refresh_token = Column(Text)

    def is_valid(self) -> bool:
        return self.token and \
            self.expires and \
            self.expires >= datetime.utcnow().replace(tzinfo=self.expires.tzinfo)
