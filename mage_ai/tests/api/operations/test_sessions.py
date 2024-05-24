import json
import os
from datetime import datetime
from unittest.mock import patch

from freezegun import freeze_time

from mage_ai.api.operations import constants
from mage_ai.authentication.ldap import LDAPConnection
from mage_ai.authentication.oauth2 import encode_token
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, Role, User
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_user


class SessionOperationTests(BaseApiTestCase):
    @freeze_time(datetime(3000, 1, 1))
    async def test_execute_create(self):
        password = 'password'
        user = create_user(password=password)

        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(
                session=dict(
                    email=user.email,
                    password=password,
                )
            ),
            resource='sessions',
            user=None,
        )
        response = await operation.execute()

        access_token = Oauth2AccessToken.query.filter(
            Oauth2AccessToken.user_id == user.id
        ).first()

        self.assertEqual(
            response['session']['token'],
            encode_token(access_token.token, access_token.expires),
        )

    @freeze_time(datetime(3000, 1, 1))
    async def test_execute_create_with_disable_notebook_edits(self):
        password = 'password'
        user = create_user(password=password)

        with patch('mage_ai.api.policies.BasePolicy.DISABLE_NOTEBOOK_EDIT_ACCESS', 1):
            with patch(
                'mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1
            ):
                with patch(
                    'mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 0
                ):
                    operation = self.build_operation(
                        action=constants.CREATE,
                        payload=dict(
                            session=dict(
                                email=user.email,
                                password=password,
                            )
                        ),
                        resource='sessions',
                        user=None,
                    )
                    response = await operation.execute()

                    access_token = (
                        Oauth2AccessToken.query.filter(
                            Oauth2AccessToken.user_id == user.id
                        )
                        .order_by(Oauth2AccessToken.created_at.desc())
                        .first()
                    )

                    self.assertEqual(
                        response['session']['token'],
                        encode_token(access_token.token, access_token.expires),
                    )

    async def test_execute_create_failed(self):
        password = 'password'
        user = create_user(password=password)

        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(
                session=dict(
                    email=user.email,
                    password='not password',
                )
            ),
            resource='sessions',
            user=None,
        )
        response = await operation.execute()

        self.assertIsNotNone(response['error'])

    @patch('mage_ai.api.resources.SessionResource.AUTHENTICATION_MODE', 'ldap')
    @patch.object(LDAPConnection, 'authorize')
    @patch.object(LDAPConnection, 'authenticate')
    async def test_ldap_login(self, mock_authenticate, mock_authorize):
        mock_authenticate.return_value = (True, "Julius_Novachrono", dict())
        mock_authorize.return_value = True

        username = "novachrono"
        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(
                session=dict(
                    email=username,
                    password="Wizard King",
                )
            ),
            resource='sessions',
            user=None,
        )
        await operation.execute()

        mock_authenticate.assert_called_once_with("novachrono", "Wizard King")
        mock_authorize.assert_called_once_with("Julius_Novachrono")
        self.assertIsNotNone(User.query.filter(User.username == username).first())

    @patch('mage_ai.api.resources.SessionResource.AUTHENTICATION_MODE', 'ldap')
    @patch.object(LDAPConnection, 'authorize')
    @patch.object(LDAPConnection, 'authenticate')
    async def test_ldap_login_unauthenticated(self, mock_authenticate, mock_authorize):
        mock_authenticate.return_value = (False, "", dict())
        mock_authorize.return_value = False

        username = "licht"
        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(
                session=dict(
                    email=username,
                    password="Golden Dawn",
                )
            ),
            resource='sessions',
            user=None,
        )
        response = await operation.execute()

        mock_authenticate.assert_called_once_with("licht", "Golden Dawn")
        mock_authorize.assert_not_called()
        self.assertIsNone(User.query.filter(User.username == username).first())
        self.assertIsNotNone(response['error'])

    @patch('mage_ai.api.resources.SessionResource.AUTHENTICATION_MODE', 'ldap')
    @patch.object(LDAPConnection, 'authorize')
    @patch.object(LDAPConnection, 'authenticate')
    async def test_ldap_login_unauthorized(self, mock_authenticate, mock_authorize):
        mock_authenticate.return_value = (True, "Yami_Sukehiro", dict())
        mock_authorize.return_value = False

        username = "yami"
        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(
                session=dict(
                    email=username,
                    password="black bull",
                )
            ),
            resource='sessions',
            user=None,
        )
        response = await operation.execute()

        mock_authenticate.assert_called_once_with("yami", "black bull")
        mock_authorize.assert_called_once_with("Yami_Sukehiro")
        self.assertIsNone(User.query.filter(User.username == username).first())
        self.assertIsNotNone(response['error'])

    @patch('mage_ai.api.resources.SessionResource.AUTHENTICATION_MODE', 'ldap')
    @patch.object(LDAPConnection, 'authorize')
    @patch.object(LDAPConnection, 'authenticate')
    async def test_ldap_login_with_role_mapping(
        self, mock_authenticate, mock_authorize
    ):
        mock_authenticate.return_value = (
            True,
            "Yami_Sukehiro",
            dict(memberOf=['Admin']),
        )
        mock_authorize.return_value = True

        Role.create_default_roles()

        with patch.dict(
            os.environ, dict(LDAP_ROLES_MAPPING=json.dumps(dict(Admin=['Admin'])))
        ):
            username = self.faker.email()
            operation = self.build_operation(
                action=constants.CREATE,
                payload=dict(
                    session=dict(
                        email=username,
                        password="black bull",
                    )
                ),
                resource='sessions',
                user=None,
            )
            await operation.execute()

            mock_authenticate.assert_called_once_with(username, "black bull")
            mock_authorize.assert_called_once_with("Yami_Sukehiro")
            user = User.query.filter(User.username == username).first()
            self.assertIsNotNone(user)
            self.assertEqual(user.roles_new[0].name, 'Admin')

    @patch('mage_ai.api.resources.SessionResource.AUTHENTICATION_MODE', 'ldap')
    @patch.object(LDAPConnection, 'authorize')
    @patch.object(LDAPConnection, 'authenticate')
    async def test_ldap_update_roles_on_login(self, mock_authenticate, mock_authorize):
        mock_authenticate.return_value = (
            True,
            "Yami_Sukehiro",
            dict(memberOf=['Admin']),
        )
        mock_authorize.return_value = True

        Role.create_default_roles()

        username = self.faker.email()

        User.create(
            username=username,
            email=username,
            roles_new=[Role.query.filter(Role.name == 'Admin').first()],
        )

        with patch.dict(
            os.environ,
            dict(
                LDAP_ROLES_MAPPING=json.dumps(dict(Admin=['Editor'])),
                UPDATE_ROLES_ON_LOGIN='1',
            ),
        ):
            operation = self.build_operation(
                action=constants.CREATE,
                payload=dict(
                    session=dict(
                        email=username,
                        password="black bull",
                    )
                ),
                resource='sessions',
                user=None,
            )
            await operation.execute()

            mock_authenticate.assert_called_once_with(username, "black bull")
            mock_authorize.assert_called_once_with("Yami_Sukehiro")
            user = User.query.filter(User.username == username).first()
            self.assertIsNotNone(user)
            self.assertEqual(user.roles_new[0].name, 'Editor')
