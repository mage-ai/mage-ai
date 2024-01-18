from datetime import datetime

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.authentication.ldap import new_ldap_connection
from mage_ai.authentication.oauth2 import encode_token, generate_access_token
from mage_ai.authentication.passwords import verify_password
from mage_ai.authentication.providers.constants import NAME_TO_PROVIDER
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import Role, User
from mage_ai.settings import (
    AUTHENTICATION_MODE,
    LDAP_DEFAULT_ACCESS,
    OAUTH_DEFAULT_ACCESS,
)
from mage_ai.usage_statistics.logger import UsageStatisticLogger


class SessionResource(BaseResource):
    @classmethod
    @safe_db_query
    async def create(self, payload, _, **kwargs):
        email = payload.get('email')
        password = payload.get('password')
        username = payload.get('username')
        token = payload.get('token')
        provider = payload.get('provider')

        oauth_client = kwargs.get('oauth_client')

        # Oauth sign in
        if token and provider:
            roles = []
            provider_class = NAME_TO_PROVIDER.get(provider)
            if provider_class is not None:
                provider_instance = provider_class()
                user_info = await provider_instance.get_user_info(access_token=token)
                email = user_info.get('email')
                username = user_info.get('username')
                if 'user_roles' in user_info:
                    user_roles = user_info.get('user_roles')
                    roles = Role.query.filter(Role.name.in_(user_roles)).all()

            if not email:
                error = ApiError.RESOURCE_NOT_FOUND
                error.update({'message': 'Could not get email from oauth provider.'})
                raise ApiError(error)
            else:
                user = User.query.filter(User.email == email).first()
                if not user:  # noqa: E712
                    print('first user login, creating user.')
                    if not roles and OAUTH_DEFAULT_ACCESS:
                        roles = Role.query.filter(Role.name == OAUTH_DEFAULT_ACCESS).all()
                    user = User.create(
                        username=username,
                        email=email,
                        roles_new=roles,
                    )
                oauth_token = generate_access_token(user, oauth_client)
                return self(oauth_token, user, **kwargs)

        error = ApiError.RESOURCE_NOT_FOUND
        error.update({'message': 'Email/username and/or password invalid.'})

        if not (email or username) or not password:
            error.update(
                {'message': 'Email/username and password are required.'})
            raise ApiError(error)

        async def _create_callback(resource):
            await UsageStatisticLogger().users_impression()

        self.on_create_callback = _create_callback

        user = None
        if AUTHENTICATION_MODE.lower() == 'ldap':
            # we can use just the method verify here authz=verify(username,password)
            conn = new_ldap_connection()
            auth, user_dn, user_attributes = conn.authenticate(email, password)
            if not auth:
                if not user_dn:
                    error.update({'message': 'LDAP user not found.'})
                else:
                    error.update({'message': 'LDAP password invalid.'})
                raise ApiError(error)

            authz = conn.authorize(user_dn)
            if not authz:
                error.update(
                        {'message': 'user not authorized. contact your admin'})
                raise ApiError(error)
            if email:
                user = User.query.filter(User.username == email).first()
            if not user:
                print('first user login, creating user.')
                roles = []
                role_names = conn.get_user_roles(user_attributes)
                if role_names:
                    roles = Role.query.filter(Role.name.in_(role_names)).all()
                if not roles and \
                        LDAP_DEFAULT_ACCESS is not None and \
                        LDAP_DEFAULT_ACCESS in [r for r in Role.DefaultRole]:
                    default_role = Role.get_role(LDAP_DEFAULT_ACCESS)
                    if default_role:
                        roles.append(default_role)
                user = User.create(
                    roles_new=roles,
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
