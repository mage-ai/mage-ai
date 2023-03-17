from datetime import datetime
from mage_ai.api.errors import ApiError
from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.authentication.oauth2 import encode_token, generate_access_token
from mage_ai.authentication.passwords import verify_password
from mage_ai.authentication.ldap import new_ldap_connection
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.settings import AUTHENTICATION_MODE


class SessionResource(BaseResource):
    @classmethod
    @safe_db_query
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
        if AUTHENTICATION_MODE.lower() == 'ldap':
            # we can use just the method verify here authz=verify(username,password)
            conn = new_ldap_connection()
            auth, user_dn = conn.authenticate(email, password)
            if not auth:
                if user_dn != "":
                    error.update({'message': 'wrong password.'})
                raise ApiError(error)

            authz = conn.authorize(user_dn)
            if not authz:
                error.update(
                        {'message': 'user not authorized. contact your admin'})
                raise ApiError(error)
            if email:
                user = User.query.filter(User.username == email).first()
            if not user:  # noqa: E712
                print('first user login, creating user.')
                user = User.create(
                    roles=2,
                    username=email,
                )
            oauth_token = generate_access_token(user, kwargs['oauth_client'])
            return self(oauth_token, user, **kwargs)

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
    @safe_db_query
    def member(self, pk, user, **kwargs):
        return self(kwargs['oauth_token'], user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        self.model.expires = datetime.utcnow()
        self.model.save()

    @safe_db_query
    def token(self):
        return encode_token(self.model.token, self.model.expires)
