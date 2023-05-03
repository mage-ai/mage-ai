from mage_ai.api.errors import ApiError
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.authentication.oauth2 import encode_token, generate_access_token
from mage_ai.authentication.passwords import create_bcrypt_hash, generate_salt, verify_password
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import User
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
            results = results \
                .filter(User.owner == False).filter(User.roles > 1)     # noqa: E712

        return results

    @classmethod
    @safe_db_query
    async def create(self, payload, user, **kwargs):
        email = payload.get('email')
        password = payload.get('password')
        password_confirmation = payload.get('password_confirmation')
        username = payload.get('username')

        error = ApiError.RESOURCE_INVALID.copy()

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

        if self.current_user.is_admin:
            if self.owner:
                error.update(
                    {'message': 'Admins cannot update users who are Owners.'})
                raise ApiError(error)
            elif self.is_admin and self.current_user.id != self.id:
                error.update(
                    {'message': 'Admins cannot update users who are Admins.'})
                raise ApiError(error)
            elif payload.get('roles') and int(payload.get('roles')) & 1 != 0:
                error.update(
                    {'message': 'Admins cannot make other users Admins.'})
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
        ]), **kwargs)

    @safe_db_query
    def token(self):
        oauth_token = self.model_options.get('oauth_token')
        if oauth_token:
            return encode_token(oauth_token.token, oauth_token.expires)
