from datetime import datetime
from mage_ai.api.errors import ApiError
from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.authentication.oauth2 import encode_token, generate_access_token
from mage_ai.authentication.passwords import verify_password
from mage_ai.orchestration.db.models import User


class SessionResource(BaseResource):
    @classmethod
    def create(self, payload, _, **kwargs):
        email = payload.get('email')
        password = payload.get('password')
        username = payload.get('username')

        error = ApiError.RESOURCE_NOT_FOUND
        error.update({'message': 'Email/username and/or password invalid.'})

        if not (email or username) or not password:
            error.update(
                {'message': 'Email/username and password are required.'})
            raise ApiError(error)

        user = None
        if email:
            user = User.query.filter(User.email == email).first()
        elif username:
            user = User.query.filter(User.username == username).first()
        if not user:
            raise ApiError(error)

        if verify_password(password, user.password_hash):
            oauth_token = generate_access_token(user, kwargs['oauth_client'])
            return self(oauth_token, user, **kwargs)
        else:
            raise ApiError(error)

    @classmethod
    def member(self, pk, user, **kwargs):
        return self(kwargs['oauth_token'], user, **kwargs)

    def update(self, payload, **kwargs):
        self.model.expires = datetime.utcnow()
        self.model.save()

    def token(self):
        return encode_token(self.model.token, self.model.expires)
