from mage_ai.api.errors import ApiError
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.api.utils import get_access_for_roles
from mage_ai.authentication.oauth2 import encode_token, generate_access_token
from mage_ai.authentication.passwords import (
    create_bcrypt_hash,
    generate_salt,
    verify_password,
)
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.oauth import Permission, Role, User, UserRole
from mage_ai.shared.hash import extract, ignore_keys, index_by
from mage_ai.usage_statistics.logger import UsageStatisticLogger


class UserResource(DatabaseResource):
    model_class = User

    def __init__(self, model, current_user, **kwargs):
        super().__init__(model, current_user, **kwargs)
        self.group = None

    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        results = (
            User.
            query.
            order_by(User.username.asc())
        )

        if user and user.is_admin:
            results = list(filter(lambda user: user.project_access & 3 == 0, results))

        return results

    @classmethod
    @safe_db_query
    async def create(self, payload, user, **kwargs):
        email = payload.get('email')
        password = payload.get('password')
        password_confirmation = payload.get('password_confirmation')
        username = payload.get('username')

        error = ApiError.RESOURCE_INVALID.copy()

        role_ids = payload.get('roles_new', [])
        roles_new = self.check_roles(role_ids)

        payload['roles_new'] = roles_new

        missing_values = []
        for key in ['email', 'password']:
            if not payload.get(key):
                missing_values.append(key)

        if len(missing_values) >= 1:
            error.update(
                {'message': 'Missing required values: {}.'.format(', '.join(missing_values))})
            raise ApiError(error)

        if email:
            user = User.query.filter(User.email == email).first()
            if user:
                error.update(
                    {'message': f'Account with same email is already taken: {email}.'})
                raise ApiError(error)
        if username:
            user = User.query.filter(User.username == username).first()
            if user:
                error.update(
                    {'message': f'Account with same username is already taken: {username}.'})
                raise ApiError(error)

        if len(password) < 8:
            error.update(
                {'message': 'Password must be 8 characters or longer.'})
            raise ApiError(error)

        if password != password_confirmation:
            error.update(
                {'message': 'Password and password confirmation do not match.'})
            raise ApiError(error)

        password_salt = generate_salt()
        payload['email'] = email
        payload['password_hash'] = create_bcrypt_hash(password, password_salt)
        payload['password_salt'] = password_salt

        resource = super().create(extract(payload, [
            'avatar',
            'email',
            'first_name',
            'last_name',
            'password_hash',
            'password_salt',
            'roles',
            'roles_new',
            'username',
        ]), user, **kwargs)

        if 'oauth_client' in kwargs:
            oauth_token = generate_access_token(
                resource.model, kwargs['oauth_client'])
            resource.model_options['oauth_token'] = oauth_token

        async def _create_callback(resource):
            await UsageStatisticLogger().users_impression()

        self.on_create_callback = _create_callback

        return resource

    @safe_db_query
    def update(self, payload, **kwargs):
        error = ApiError.RESOURCE_INVALID.copy()

        if 'roles_new' in payload:
            role_ids = payload.get('roles_new', [])
            roles_new = self.check_roles(role_ids)

            payload['roles_new'] = roles_new

            access = get_access_for_roles(
                roles_new,
                Entity.PROJECT,
                get_project_uuid(),
            )

            if self.current_user.is_admin:
                if self.owner:
                    error.update(
                        {'message': 'Admins cannot update users who are Owners.'})
                    raise ApiError(error)
                elif self.is_admin and self.current_user.id != self.id:
                    error.update(
                        {'message': 'Admins cannot update users who are Admins.'})
                    raise ApiError(error)
                elif access & Permission.Access.ADMIN != 0:
                    error.update(
                        {'message': 'Admins cannot make other users Admins.'})
                    raise ApiError(error)
                elif access & Permission.Access.OWNER != 0:
                    error.update(
                        {'message': 'Admins cannot make other users Owners.'})
                    raise ApiError(error)

        password = payload.get('password')
        if password:
            password_current = payload.get('password_current')
            password_confirmation = payload.get('password_confirmation')

            if self.current_user.id == self.id or \
                    (not self.current_user.owner and self.current_user.roles & 1 == 0):
                if not password_current or not verify_password(
                    password_current,
                    self.password_hash,
                ):
                    error.update(
                        {'message': 'Current password is incorrect.'})
                    raise ApiError(error)

            if len(password) < 8:
                error.update(
                    {'message': 'Password must be 8 characters or longer.'})
                raise ApiError(error)

            if password != password_confirmation:
                error.update(
                    {'message': 'Password and password confirmation do not match.'})
                raise ApiError(error)

            password_salt = generate_salt()
            payload['password_hash'] = create_bcrypt_hash(password, password_salt)
            payload['password_salt'] = password_salt

        if 'role_ids' in payload:
            role_ids = [int(i) for i in payload.get('role_ids') or []]
            # Need to call roles_new directly on the model or else the resource will
            # cache the result because of the collective loader.
            role_mapping = index_by(lambda x: x.id, self.model.roles_new or [])

            role_ids_create = []
            role_ids_delete = []

            for role_id in role_ids:
                if role_id not in role_mapping:
                    role_ids_create.append(role_id)

            for role_id in role_mapping.keys():
                if role_id not in role_ids:
                    role_ids_delete.append(role_id)

            if role_ids_create:
                db_connection.session.bulk_save_objects(
                    [UserRole(
                        role_id=role_id,
                        user_id=self.id,
                    ) for role_id in role_ids_create],
                    return_defaults=True,
                )

            if role_ids_delete:
                delete_statement = UserRole.__table__.delete().where(
                    UserRole.role_id.in_(role_ids_delete),
                    UserRole.user_id == self.id,
                )
                db_connection.session.execute(delete_statement)

        return super().update(ignore_keys(payload, [
            'owner',
            'password',
            'password_confirmation',
            'password_current',
            'project_access',
            'role_ids',
            'roles_display',
        ]), **kwargs)

    @safe_db_query
    def token(self):
        oauth_token = self.model_options.get('oauth_token')
        if oauth_token:
            return encode_token(oauth_token.token, oauth_token.expires)

    @classmethod
    @safe_db_query
    def check_roles(self, role_ids):
        missing_ids = []
        roles_new = []
        for role_id in role_ids:
            role = Role.query.get(int(role_id))
            if role is None:
                missing_ids.append(role_id)
            else:
                roles_new.append(role)

        if len(missing_ids) > 0:
            error = ApiError.RESOURCE_INVALID.copy()
            error.update(
                {'message': f'Roles with ids: {missing_ids} do not exist'})
            raise ApiError(error)

        return roles_new


def __load_permissions(resource):
    from mage_ai.api.resources.PermissionResource import PermissionResource

    ids = [r.id for r in resource.result_set()]

    return [PermissionResource(p, resource.current_user) for p in User.fetch_permissions(ids)]


def __select_permissions(resource, arr):
    return [r for r in arr if r.user_id == resource.id]


def __load_roles(resource):
    from mage_ai.api.resources.RoleResource import RoleResource

    ids = [r.id for r in resource.result_set()]

    return [RoleResource(p, resource.current_user) for p in User.fetch_roles(ids)]


def __select_roles(resource, arr):
    return [r for r in arr if r.user_id == resource.id]


UserResource.register_collective_loader(
    'permissions',
    load=__load_permissions,
    select=__select_permissions,
)


UserResource.register_collective_loader(
    'roles_new',
    load=__load_roles,
    select=__select_roles,
)
