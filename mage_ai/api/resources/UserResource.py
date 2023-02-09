from mage_ai.api.errors import ApiError
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.authentication.oauth2 import encode_token, generate_access_token
from mage_ai.authentication.passwords import create_bcrypt_hash, generate_salt, verify_password
from mage_ai.orchestration.db.models import User
from mage_ai.shared.hash import extract, ignore_keys


class UserResource(DatabaseResource):
    model_class = User

    def __init__(self, model, current_user, **kwargs):
        super().__init__(model, current_user, **kwargs)
        self.group = None

    @classmethod
    def create(self, payload, user, **kwargs):
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
                    {'message': 'Account with same email is already taken.'})
                raise ApiError(error)
        if username:
            user = User.query.filter(User.username == username).first()
            if user:
                error.update(
                    {'message': 'Account with same username is already taken.'})
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
            'username',
        ]), user, **kwargs)

        if 'oauth_client' in kwargs:
            oauth_token = generate_access_token(
                resource.model, kwargs['oauth_client'])
            resource.model_options['oauth_token'] = oauth_token

        return resource

    def update(self, payload, **kwargs):
        password = payload.get('password')

        if password:
            password_current = payload.get('password_current')
            password_confirmation = payload.get('password_confirmation')

            error = ApiError.RESOURCE_INVALID.copy()

            if self.current_user.id == self.id or not self.current_user.owner:
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

    def token(self):
        oauth_token = self.model_options.get('oauth_token')
        if oauth_token:
            return encode_token(oauth_token.token, oauth_token.expires)
