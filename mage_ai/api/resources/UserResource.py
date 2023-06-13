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
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import Permission, Role, User
from mage_ai.shared.hash import extract, ignore_keys
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

        if user.is_admin:
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
                Permission.Entity.PROJECT,
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

        return super().update(ignore_keys(payload, [
            'password',
            'password_confirmation',
            'password_current',
            'owner',
            'project_access',
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
