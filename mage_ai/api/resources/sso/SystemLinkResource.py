from mage_ai.api.errors import ApiError
from mage_ai.api.resources.SessionResource import SessionResource
from mage_ai.authentication.oauth2 import generate_access_token
from mage_ai.authentication.sso.systemlink import Systemlink
from mage_ai.orchestration.db.models.oauth import User


class SystemLinkResource(SessionResource):
    cookie_names = ['session_id']

    @classmethod
    @safe_db_query
    async def create(self, payload, _, **kwargs):
        session_id = payload.get(COOKIE_PREFIX + 'session-id')
        try:
            system_link = Systemlink(session_id)
            auth_resp = system_link.get_auth_response()

            user_info = system_link.get_user_info(auth_response=auth_resp)

            principal_name = user_info.get('email')
            roles_for_workspace = system_link.get_user_roles(auth_response=auth_resp)

            user = User.query.filter(User.email == principal_name).first()

            if not user:
                print('first user login, creating user.')

                # Use the auth request to check privs against workspaces
                print('TODO proactively synch user info and role info off-band')
                print('TODO SLO, verify cookie match on each call, can use a cache of '
                        'oauth token session_id pairs, likely in app.py')
                user = User.create(
                    roles_new=roles_for_workspace,
                    username=principal_name,
                    email=principal_name,
                )
            else:
                print("TODO better compare here")
                if user.roles_new != roles_for_workspace:
                    user.update(roles_new=roles_for_workspace)

            oauth_token = generate_access_token(user, kwargs['oauth_client'])
            return self(oauth_token, user, **kwargs)
        except Exception as ex:
            error = ApiError.RESOURCE_NOT_FOUND
            error.update(
                {
                    'message': str(ex),
                    'url': '/login?redirectUrl=/mage'
                }
            )
            raise ApiError(error)
